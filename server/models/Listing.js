const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

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
    images: { type: [String], default: [] },
    description: { type: String, required: true },
    amenities: { type: [String], default: ['Wifi', 'Air Conditioning', 'Free Breakfast'] },
    reviews: [reviewSchema],
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Listing', listingSchema);