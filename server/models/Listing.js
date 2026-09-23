const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['hotel', 'restaurant'], 
      required: true 
    },
    category: { type: String, default: 'Iconic' },
    location: { type: String, required: true },
    price: { type: Number, required: true },
    rating: { type: Number, default: 4.8 },
    reviewsCount: { type: Number, default: 1 },
    ratingsTotal: { type: Number, default: 4.8 },
    image: { type: String, required: true },
    description: { type: String, required: true },
    amenities: { type: [String], default: ['Wifi', 'Air Conditioning', 'Free Breakfast'] }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Listing', listingSchema);