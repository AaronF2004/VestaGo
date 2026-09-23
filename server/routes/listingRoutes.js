const express = require('express');
const router = express.Router();
const Listing = require('../models/Listing');

// 1. CREATE
router.post('/', async (req, res) => {
  try {
    const newListing = new Listing(req.body);
    const saved = await newListing.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2. READ ALL
router.get('/', async (req, res) => {
  try {
    const { type, search } = req.query;
    let filter = {};
    if (type && type !== 'all') filter.type = type;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }
    const listings = await Listing.find(filter).sort({ createdAt: -1 });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. READ ONE
router.get('/:id', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    res.json(listing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. RATE A LISTING (New Feature)
router.post('/:id/rate', async (req, res) => {
  try {
    const { score } = req.body;
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ message: 'Listing not found' });

    listing.reviewsCount += 1;
    listing.ratingsTotal += Number(score);
    listing.rating = Number((listing.ratingsTotal / listing.reviewsCount).toFixed(2));

    await listing.save();
    res.json(listing);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 5. UPDATE
router.put('/:id', async (req, res) => {
  try {
    const updated = await Listing.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!updated) return res.status(404).json({ message: 'Listing not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 6. DELETE
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Listing.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Listing not found' });
    res.json({ message: 'Listing removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;