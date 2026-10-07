const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Listing = require('../models/Listing');
const User = require('../models/User');
const { verifyToken: auth, adminOnly } = require('../middleware/auth');
const { sendBookingConfirmation, sendBookingCancellation } = require('../utils/emailService');

// Upload directory setup
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// =============================================================
// ADMIN-ONLY MANAGEMENT ENDPOINTS
// =============================================================
router.get('/admin/metrics', auth, adminOnly, async (req, res) => {
  try {
    const [totalListings, totalUsers, staysCount, diningCount] = await Promise.all([
      Listing.countDocuments(),
      User.countDocuments(),
      Listing.countDocuments({ type: 'hotel' }),
      Listing.countDocuments({ type: 'restaurant' })
    ]);

    res.json({
      totalListings,
      totalUsers,
      staysCount,
      diningCount
    });
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving metrics', error: err.message });
  }
});

router.delete('/admin/force-delete/:id', auth, adminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid listing ID' });
    }
    const deleted = await Listing.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Listing not found' });
    res.json({ message: 'Listing deleted by Admin override' });
  } catch (err) {
    res.status(500).json({ message: 'Admin delete failed', error: err.message });
  }
});

// =============================================================
// BOOKING NOTIFICATION ROUTES
// =============================================================
router.post('/bookings/confirm-email', async (req, res) => {
  try {
    const booking = req.body;
    if (!booking || !booking.userEmail) {
      return res.status(400).json({ message: 'Booking data and user email are required' });
    }
    await sendBookingConfirmation(booking);
    res.json({ message: 'Confirmation voucher emailed successfully' });
  } catch (err) {
    console.error('Email confirmation error:', err);
    res.status(500).json({ message: 'Failed to send confirmation voucher' });
  }
});

router.post('/bookings/cancel-email', async (req, res) => {
  try {
    const booking = req.body;
    if (!booking || !booking.userEmail) {
      return res.status(400).json({ message: 'Booking data and user email are required' });
    }
    await sendBookingCancellation(booking);
    res.json({ message: 'Cancellation confirmation emailed successfully' });
  } catch (err) {
    console.error('Email cancellation error:', err);
    res.status(500).json({ message: 'Failed to send cancellation email' });
  }
});

// =============================================================
// LISTINGS CRUD & REVIEWS
// =============================================================
router.get('/', async (req, res) => {
  try {
    const { type, search, sort, minPrice, maxPrice, minRating } = req.query;
    let query = {};

    if (type && type !== 'all') {
      query.type = type;
    }

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { title: { $regex: term, $options: 'i' } },
        { location: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } }
      ];
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (minRating) {
      query.rating = { $gte: Number(minRating) };
    }

    let sortObj = { createdAt: -1 };
    if (sort === 'price_asc') sortObj = { price: 1 };
    if (sort === 'price_desc') sortObj = { price: -1 };
    if (sort === 'rating_desc') sortObj = { rating: -1 };

    const listings = await Listing.find(query).populate('owner', 'name email').sort(sortObj);
    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid listing ID format' });
    }

    const listing = await Listing.findById(req.params.id).populate('owner', 'name email');
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    res.json(listing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, upload.array('photos', 5), async (req, res) => {
  try {
    const { title, type, price, location, description, amenities } = req.body;

    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => `/uploads/${file.filename}`);
    } else {
      images = ['https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80'];
    }

    const amenitiesArray = amenities
      ? (typeof amenities === 'string' ? amenities.split(',').map((a) => a.trim()).filter(Boolean) : amenities)
      : ['Wifi', 'Air Conditioning', 'Free Parking'];

    const newListing = new Listing({
      title,
      type: type || 'hotel',
      price: Number(price),
      location,
      description,
      amenities: amenitiesArray,
      images,
      owner: req.user.id
    });

    const savedListing = await newListing.save();
    res.status(201).json(savedListing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, upload.array('photos', 5), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid listing ID' });
    }

    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    if (listing.owner.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized to edit this listing' });
    }

    const { title, type, price, location, description, amenities } = req.body;

    if (title) listing.title = title;
    if (type) listing.type = type;
    if (price) listing.price = Number(price);
    if (location) listing.location = location;
    if (description) listing.description = description;

    if (amenities) {
      listing.amenities = typeof amenities === 'string'
        ? amenities.split(',').map((a) => a.trim()).filter(Boolean)
        : amenities;
    }

    if (req.files && req.files.length > 0) {
      listing.images = req.files.map((file) => `/uploads/${file.filename}`);
    }

    const updatedListing = await listing.save();
    res.json(updatedListing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid listing ID' });
    }

    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    if (listing.owner.toString() !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Unauthorized to delete this listing' });
    }

    await Listing.findByIdAndDelete(req.params.id);
    res.json({ message: 'Listing deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/rate', async (req, res) => {
  try {
    const { score, comment, userName } = req.body;
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    const newReview = {
      _id: new mongoose.Types.ObjectId(),
      userName: userName || 'Guest Traveler',
      rating: Math.min(5, Math.max(1, Number(score) || 5)),
      comment: comment || '',
      createdAt: new Date()
    };

    listing.reviews.unshift(newReview);
    listing.reviewsCount = listing.reviews.length;

    const sumRatings = listing.reviews.reduce((acc, curr) => acc + (Number(curr.rating) || 5), 0);
    listing.ratingsTotal = sumRatings;
    listing.rating = Number((sumRatings / listing.reviewsCount).toFixed(1));

    listing.markModified('reviews');
    await listing.save();
    res.json(listing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id/reviews/:reviewIdentifier', async (req, res) => {
  try {
    const { id, reviewIdentifier } = req.params;
    const { comment, userName } = req.body || {};

    const listing = await Listing.findById(id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    let matchIndex = -1;

    if (mongoose.Types.ObjectId.isValid(reviewIdentifier)) {
      matchIndex = listing.reviews.findIndex((r) => r._id && r._id.toString() === reviewIdentifier);
    }

    if (matchIndex === -1 && !isNaN(reviewIdentifier)) {
      const idx = parseInt(reviewIdentifier, 10);
      if (idx >= 0 && idx < listing.reviews.length) {
        matchIndex = idx;
      }
    }

    if (matchIndex === -1 && (comment || userName)) {
      matchIndex = listing.reviews.findIndex((r) => {
        const commentMatch = comment ? r.comment === comment : true;
        const nameMatch = userName ? r.userName === userName : true;
        return commentMatch && nameMatch;
      });
    }

    if (matchIndex === -1) {
      matchIndex = listing.reviews.findIndex((r) => r.userName === decodeURIComponent(reviewIdentifier));
    }

    if (matchIndex === -1) {
      return res.status(404).json({ message: 'Review not found in listing' });
    }

    listing.reviews.splice(matchIndex, 1);
    listing.reviewsCount = listing.reviews.length;

    if (listing.reviewsCount > 0) {
      const sumRatings = listing.reviews.reduce((acc, curr) => acc + (Number(curr.rating) || 5), 0);
      listing.ratingsTotal = sumRatings;
      listing.rating = Number((sumRatings / listing.reviewsCount).toFixed(1));
    } else {
      listing.ratingsTotal = 0;
      listing.rating = 0;
    }

    listing.markModified('reviews');
    await listing.save();

    return res.status(200).json({ message: 'Review deleted successfully', listing });
  } catch (err) {
    console.error('Delete review error:', err);
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;