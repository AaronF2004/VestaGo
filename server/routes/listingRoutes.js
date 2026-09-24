const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Listing = require('../models/Listing');
const auth = require('../middleware/auth');

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// 1. CREATE LISTING (Protected)
router.post('/', auth, upload.array('photos', 6), async (req, res) => {
  try {
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => `/uploads/${file.filename}`);
    } else if (req.body.imageUrl) {
      images = [req.body.imageUrl];
    } else {
      images = ['https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80'];
    }

    const amenities = req.body.amenities 
      ? (Array.isArray(req.body.amenities) ? req.body.amenities : req.body.amenities.split(',').map(a => a.trim()))
      : ['Wifi', 'Air Conditioning'];

    const newListing = new Listing({
      title: req.body.title,
      type: req.body.type,
      category: req.body.category || 'Iconic',
      location: req.body.location,
      price: Number(req.body.price),
      description: req.body.description,
      amenities,
      images,
      owner: req.user.id
    });

    const saved = await newListing.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2. READ ALL (With filtering, sorting, price range, and search)
router.get('/', async (req, res) => {
  try {
    const { type, search, minPrice, maxPrice, minRating, sort } = req.query;
    let filter = {};

    if (type && type !== 'all') filter.type = type;
    if (search) {
      filter.$or = [
        { title: { $regex: search,$options: 'i' } },
        { location: { $regex: search,$options: 'i' } }
      ];
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (minRating) {
      filter.rating = { $gte: Number(minRating) };
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'price_asc') sortOption = { price: 1 };
    if (sort === 'price_desc') sortOption = { price: -1 };
    if (sort === 'rating_desc') sortOption = { rating: -1 };

    const listings = await Listing.find(filter).populate('owner', 'name email').sort(sortOption);
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. READ ONE
router.get('/:id', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).populate('owner', 'name email');
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    res.json(listing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. RATE & REVIEW A LISTING
router.post('/:id/rate', async (req, res) => {
  try {
    const { score, comment, userName } = req.body;
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    const numScore = Number(score) || 5;

    listing.reviewsCount += 1;
    listing.ratingsTotal += numScore;
    listing.rating = Number((listing.ratingsTotal / listing.reviewsCount).toFixed(2));

    if (comment && comment.trim()) {
      listing.reviews.unshift({
        userName: userName || 'Guest Traveler',
        rating: numScore,
        comment: comment.trim()
      });
    }

    await listing.save();
    res.json(listing);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 5. UPDATE (Owner only)
router.put('/:id', auth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    if (listing.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: You do not own this listing' });
    }

    const updated = await Listing.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 6. DELETE (Owner only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    if (listing.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden: You do not own this listing' });
    }

    await Listing.findByIdAndDelete(req.params.id);
    res.json({ message: 'Listing removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;