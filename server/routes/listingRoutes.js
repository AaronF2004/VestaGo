const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const Listing = require('../models/Listing');
const auth = require('../middleware/auth');

// Multer Storage Configuration for Image Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// GET /api/listings - Get all listings with filters, search, and sorting
router.get('/', async (req, res) => {
  try {
    const { type, search, sort, minPrice, maxPrice, minRating } = req.query;
    let query = {};

    if (type && type !== 'all') {
      query.type = type;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search,$options: 'i' } },
        { location: { $regex: search,$options: 'i' } },
        { description: { $regex: search,$options: 'i' } }
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

// GET /api/listings/:id - Get single listing details
router.get('/:id', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate('owner', 'name email');
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    res.json(listing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/listings - Create a new listing (Protected)
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

// PUT /api/listings/:id - Update an existing listing (Protected)
router.put('/:id', auth, upload.array('photos', 5), async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    if (listing.owner.toString() !== req.user.id) {
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

// DELETE /api/listings/:id - Delete a listing (Protected)
router.delete('/:id', auth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    if (listing.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to delete this listing' });
    }

    await Listing.findByIdAndDelete(req.params.id);
    res.json({ message: 'Listing deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/listings/:id/rate - Add a review
router.post('/:id/rate', async (req, res) => {
  try {
    const { score, comment, userName } = req.body;
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    const newReview = {
      _id: new mongoose.Types.ObjectId(),
      userName: userName || 'Guest Traveler',
      rating: Number(score) || 5,
      comment: comment || '',
      createdAt: new Date()
    };

    listing.reviews.unshift(newReview);
    listing.reviewsCount = listing.reviews.length;
    
    const sumRatings = listing.reviews.reduce((acc, curr) => acc + (Number(curr.rating) || 5), 0);
    listing.ratingsTotal = sumRatings;
    listing.rating = Number((sumRatings / listing.reviewsCount).toFixed(2));

    listing.markModified('reviews');
    await listing.save();
    res.json(listing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/listings/:id/reviews/:reviewIdentifier - Robust Delete Route
router.delete('/:id/reviews/:reviewIdentifier', async (req, res) => {
  try {
    const { id, reviewIdentifier } = req.params;
    const { comment, userName } = req.body || {};

    const listing = await Listing.findById(id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    let matchIndex = -1;

    // 1. Try matching by subdocument _id
    if (mongoose.Types.ObjectId.isValid(reviewIdentifier)) {
      matchIndex = listing.reviews.findIndex(r => r._id && r._id.toString() === reviewIdentifier);
    }

    // 2. Try matching by array index
    if (matchIndex === -1 && !isNaN(reviewIdentifier)) {
      const idx = parseInt(reviewIdentifier, 10);
      if (idx >= 0 && idx < listing.reviews.length) {
        matchIndex = idx;
      }
    }

    // 3. Try matching by content (comment and/or author)
    if (matchIndex === -1 && (comment || userName)) {
      matchIndex = listing.reviews.findIndex(r => {
        const commentMatch = comment ? r.comment === comment : true;
        const nameMatch = userName ? r.userName === userName : true;
        return commentMatch && nameMatch;
      });
    }

    // 4. Fallback: match by userName only
    if (matchIndex === -1) {
      matchIndex = listing.reviews.findIndex(r => r.userName === decodeURIComponent(reviewIdentifier));
    }

    if (matchIndex === -1) {
      return res.status(404).json({ message: 'Review not found in listing' });
    }

    // Remove the target review from the array
    listing.reviews.splice(matchIndex, 1);
    listing.reviewsCount = listing.reviews.length;

    if (listing.reviewsCount > 0) {
      const sumRatings = listing.reviews.reduce((acc, curr) => acc + (Number(curr.rating) || 5), 0);
      listing.ratingsTotal = sumRatings;
      listing.rating = Number((sumRatings / listing.reviewsCount).toFixed(2));
    } else {
      listing.ratingsTotal = 0;
      listing.rating = 5.0;
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