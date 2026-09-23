const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Listing = require('../models/Listing');

const sampleData = [
  {
    title: 'Kerala Paradise Backwater Villa',
    type: 'hotel',
    category: 'Villas',
    location: 'Kerala, India',
    price: 3000,
    rating: 4.88,
    reviewsCount: 34,
    ratingsTotal: 165.92,
    image: 'https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=1000&q=80',
    description: 'Private heritage wooden villa built over tranquil backwaters. Includes personal boat tours, organic Kerala sadhya meals, and private sundeck.',
    amenities: ['Wifi', 'Waterfront', 'Free Breakfast', 'Air Conditioning']
  },
  {
    title: 'Bogmallo Oceanfront Luxury Resort',
    type: 'hotel',
    category: 'Beachfront',
    location: 'Goa, India',
    price: 4500,
    rating: 4.82,
    reviewsCount: 48,
    ratingsTotal: 231.36,
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80',
    description: 'Direct beach access overlooking the Arabian Sea. Features infinity pools, sunset decks, private balconies, and watersport access.',
    amenities: ['Infinity Pool', 'Beach Access', 'Bar', 'Spa & Wellness']
  },
  {
    title: 'Heritage Lake Palace',
    type: 'hotel',
    category: 'Palaces',
    location: 'Udaipur, India',
    price: 12000,
    rating: 4.95,
    reviewsCount: 82,
    ratingsTotal: 405.9,
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80',
    description: 'Step into royal Rajasthan history with majestic marble hallways, lakeside dining, and peacocks roaming landscaped courtyards.',
    amenities: ['Royal Suite', 'Lake View', 'Butler Service', 'Pool']
  },
  {
    title: 'The Fisherman\'s Wharf Bistro',
    type: 'restaurant',
    category: 'Seafood',
    location: 'Panaji, Goa, India',
    price: 1800,
    rating: 4.79,
    reviewsCount: 110,
    ratingsTotal: 526.9,
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80',
    description: 'Authentic Goan seafood delicacies and live riverfront music under palm trees. Celebrated for butter garlic crab and local curries.',
    amenities: ['Outdoor Seating', 'Live Music', 'Full Bar', 'River View']
  },
  {
    title: 'Skyline Michelin Bistro & Wine Cellar',
    type: 'restaurant',
    category: 'Fine Dining',
    location: 'Mumbai, India',
    price: 3500,
    rating: 4.92,
    reviewsCount: 65,
    ratingsTotal: 319.8,
    image: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1000&q=80',
    description: 'High-rise glasshouse rooftop offering modern progressive fusion paired with an extensive international wine collection.',
    amenities: ['Rooftop View', 'Sommelier', 'Valet Parking', 'Chef Tasting Menu']
  }
];

mongoose
  .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/airbnb_clone')
  .then(async () => {
    await Listing.deleteMany({});
    await Listing.insertMany(sampleData);
    console.log('Sample data populated successfully with working images!');
    process.exit();
  })
  .catch((err) => {
    console.error('Seed Error:', err);
    process.exit(1);
  });