const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Listing = require('../models/Listing');
const User = require('../models/User');

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
    images: ['https://images.unsplash.com/photo-1596178065887-1198b6148b2b?auto=format&fit=crop&w=1000&q=80'],
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
    images: ['https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80'],
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
    images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80'],
    description: 'Step into royal Rajasthan history with majestic marble hallways, lakeside dining, and peacocks roaming landscaped courtyards.',
    amenities: ['Royal Suite', 'Lake View', 'Butler Service', 'Pool']
  },
  {
    title: "The Fisherman's Wharf Bistro",
    type: 'restaurant',
    category: 'Seafood',
    location: 'Panaji, Goa, India',
    price: 1800,
    rating: 4.79,
    reviewsCount: 110,
    ratingsTotal: 526.9,
    images: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80'],
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
    images: ['https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1000&q=80'],
    description: 'High-rise glasshouse rooftop offering modern progressive fusion paired with an extensive international wine collection.',
    amenities: ['Rooftop View', 'Sommelier', 'Valet Parking', 'Chef Tasting Menu']
  },
  {
    title: 'The Grand Heritage Palace',
    type: 'hotel',
    category: 'Heritage Luxury',
    location: 'Udaipur, India',
    price: 28500,
    rating: 4.95,
    reviewsCount: 142,
    ratingsTotal: 702.9,
    images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1000&q=80'],
    description: '18th-century royal palace on lake waters featuring gilded arched suites, peacock courtyards, and marble spa retreats.',
    amenities: ['Private Boat Arrival', 'Royal Butler', 'Infinity Pool', 'Ayurvedic Spa']
  },
  {
    title: 'Azure Cliffside Villa & Suites',
    type: 'hotel',
    category: 'Boutique Stay',
    location: 'Goa, India',
    price: 14500,
    rating: 4.88,
    reviewsCount: 89,
    ratingsTotal: 434.32,
    images: ['https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80'],
    description: 'Minimalist Mediterranean-inspired villas perched over Arabian Sea cliffs with private plunge pools and direct beach access.',
    amenities: ['Plunge Pool', 'Direct Beach Access', 'In-Villa Breakfast', 'Sunset Deck']
  },
  {
    title: 'Ochre & Smoke Charcoal Kitchen',
    type: 'restaurant',
    category: 'Modern Indian',
    location: 'New Delhi, India',
    price: 4200,
    rating: 4.91,
    reviewsCount: 210,
    ratingsTotal: 1031.1,
    images: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80'],
    description: 'Wood-fired live grill restaurant exploring ancient subcontinent spices using progressive French plating techniques.',
    amenities: ['Open Kitchen', 'Craft Cocktails', 'Valet Parking', 'Private Dining Room']
  },
  {
    title: 'Botanique Conservatory Bistro',
    type: 'restaurant',
    category: 'Casual European',
    location: 'Bengaluru, India',
    price: 2200,
    rating: 4.78,
    reviewsCount: 114,
    ratingsTotal: 544.92,
    images: ['https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1000&q=80'],
    description: 'Sunlit greenhouse café serving artisanal sourdough bakes, micro-lot pour-overs, and French bistro lunch staples.',
    amenities: ['Pet Friendly', 'Outdoor Garden', 'Specialty Coffee', 'Bakery Counter']
  },
  {
    title: 'Elysian High-Rise & Spa',
    type: 'hotel',
    category: 'Business Luxury',
    location: 'Mumbai, India',
    price: 18000,
    rating: 4.86,
    reviewsCount: 178,
    ratingsTotal: 865.08,
    images: ['https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1000&q=80'],
    description: 'Sleek metropolitan glass tower in the financial core offering smart executive rooms and sky-high wellness facilities.',
    amenities: ['Rooftop Helipad', 'Executive Lounge', 'Full-service Spa', '24/7 Gym']
  },
  {
    title: 'Pine & Mist Mountain Chalet',
    type: 'hotel',
    category: 'Nature Retreat',
    location: 'Manali, India',
    price: 9500,
    rating: 4.82,
    reviewsCount: 73,
    ratingsTotal: 351.86,
    images: ['https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1000&q=80'],
    description: 'Handcrafted cedar wood cabin surrounded by apple orchards, offering floor-to-ceiling Himalayan vistas and log fireplaces.',
    amenities: ['Fireplace', 'Heated Bedding', 'Stargazing Balcony', 'Hiking Trails']
  },
  {
    title: 'Umami & Oak Robata Bar',
    type: 'restaurant',
    category: 'Japanese Contemporary',
    location: 'Bengaluru, India',
    price: 4800,
    rating: 4.94,
    reviewsCount: 95,
    ratingsTotal: 469.3,
    images: ['https://images.unsplash.com/photo-1578474846511-04ba529f0b88?auto=format&fit=crop&w=1000&q=80'],
    description: 'Intimate counter dining with imported binchotan charcoal grilling, rare single-malt whiskeys, and seasonal sashimi omakase.',
    amenities: ['Omakase Counter', 'Japanese Whisky Bar', 'Valet Parking', 'Curated Sake Menu']
  },
  {
    title: 'Café de Montmartre',
    type: 'restaurant',
    category: 'French Bistro',
    location: 'Pondicherry, India',
    price: 1800,
    rating: 4.74,
    reviewsCount: 128,
    ratingsTotal: 606.72,
    images: ['https://images.unsplash.com/photo-1559925393-8be0ec4767c8?auto=format&fit=crop&w=1000&q=80'],
    description: 'Colonial yellow-walled courtyard bistro plating traditional ratatouille, duck confit, and house-made crêpes.',
    amenities: ['Courtyard Seating', 'Wine by Glass', 'Vegan Options', 'Live Jazz Evenings']
  },
  {
    title: 'The Plantation Bungalow',
    type: 'hotel',
    category: 'Estate Stay',
    location: 'Coorg, India',
    price: 11200,
    rating: 4.9,
    reviewsCount: 56,
    ratingsTotal: 274.4,
    images: ['https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1000&q=80'],
    description: 'Colonial-era coffee estate sanctuary with wrap-around verandahs, personalized nature walks, and authentic Kodava dining.',
    amenities: ['Coffee Plantation Tours', 'Campfire Area', 'Library', 'Home-cooked Meals']
  },
  {
    title: 'Saffron & Silk Royal Thali House',
    type: 'restaurant',
    category: 'Fine Dining',
    location: 'Jaipur, India',
    price: 3200,
    rating: 4.87,
    reviewsCount: 164,
    ratingsTotal: 798.68,
    images: ['https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80'],
    description: 'Regal dining hall presenting multi-course silver thali spreads influenced by Mewari and Marwari culinary secrets.',
    amenities: ['Traditional Live Sitar', 'Silverware Dining', 'Valet Parking', 'Family Salons']
  },
  {
    title: 'Verve Tapas & Natural Wine Bar',
    type: 'restaurant',
    category: 'Modern Bistro',
    location: 'Mumbai, India',
    price: 2600,
    rating: 4.81,
    reviewsCount: 92,
    ratingsTotal: 442.52,
    images: ['https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1000&q=80'],
    description: 'Cozy exposed-brick wine bar specializing in biodynamic wines, Spanish pintxos, and charcuterie boards.',
    amenities: ['Sommelier Service', 'Bar Counter Seating', 'Curated Cheese Cellar', 'Pet Friendly']
  },
  {
    title: 'Serena Palm Beach Resort',
    type: 'hotel',
    category: 'Coastal Resort',
    location: 'Kovalam, India',
    price: 21000,
    rating: 4.89,
    reviewsCount: 136,
    ratingsTotal: 665.04,
    images: ['https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1000&q=80'],
    description: 'Tropical clifftop sanctuary featuring tier-pool complexes, private cabanas, and panoramic Arabian Sea coastlines.',
    amenities: ['Private Beach Access', 'Ayurvedic Wellness Center', 'Multiple Pools', 'Water Sports Desk']
  },
  {
    title: 'The Tea Leaf Manor',
    type: 'hotel',
    category: 'Boutique Homestay',
    location: 'Munnar, India',
    price: 8800,
    rating: 4.85,
    reviewsCount: 68,
    ratingsTotal: 329.8,
    images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80'],
    description: 'British-era colonial manor house set amidst manicured rolling tea gardens with antique furnishings and morning mist trails.',
    amenities: ['Tea Tasting Sessions', 'Fireplace Lounge', 'Mountain Trails', 'Complimentary High Tea']
  },
  {
    title: 'Terraza Coastal Trattoria',
    type: 'restaurant',
    category: 'Italian Coastal',
    location: 'Goa, India',
    price: 3600,
    rating: 4.89,
    reviewsCount: 147,
    ratingsTotal: 718.83,
    images: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80'],
    description: 'Al fresco coastal terrace serving hand-rolled pastas, wood-fired seafood pizzas, and imported grappas beneath olive trees.',
    amenities: ['Sea View', 'Wood-Fired Pizza Oven', 'Outdoor Bar', 'Valet Parking']
  },
  {
    title: 'Black Walnut Artisanal Deli',
    type: 'restaurant',
    category: 'Deli & Bistro',
    location: 'New Delhi, India',
    price: 1900,
    rating: 4.79,
    reviewsCount: 88,
    ratingsTotal: 421.52,
    images: ['https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1000&q=80'],
    description: 'Industrial rustic deli plating gourmet pastrami sandwiches, cultured butter croissants, and cold-pressed elixirs.',
    amenities: ['Specialty Coffee', 'Outdoor Patio', 'Curated Pantry Shelf', 'Wi-Fi Workstations']
  },
  {
    title: 'The Oberon Wilderness Camp',
    type: 'hotel',
    category: 'Luxury Safari Lodging',
    location: 'Ranthambore, India',
    price: 38000,
    rating: 4.96,
    reviewsCount: 84,
    ratingsTotal: 416.64,
    images: ['https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1000&q=80'],
    description: 'Air-conditioned canvas suites with hand-knotted rugs, private plunge pools, and open-top customized tiger safari drives.',
    amenities: ['Jeep Safari Desk', 'Bush Dinners', 'Private Decks', 'Naturalist Guides']
  },
  {
    title: 'Ganga Kripa River House',
    type: 'hotel',
    category: 'Riverside Retreat',
    location: 'Rishikesh, India',
    price: 7200,
    rating: 4.83,
    reviewsCount: 97,
    ratingsTotal: 468.51,
    images: ['https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1000&q=80'],
    description: 'Serene riverside stone villa with direct private ghat access, daily yoga shala sessions, and pure sattvic culinary offerings.',
    amenities: ['Private River Ghat', 'Yoga Studio', 'Organic Meals', 'Meditation Lawn']
  },
  {
    title: 'Aura Modern Pan-Asian Izakaya',
    type: 'restaurant',
    category: 'Asian Gastronomy',
    location: 'Gurugram, India',
    price: 3900,
    rating: 4.88,
    reviewsCount: 182,
    ratingsTotal: 888.16,
    images: ['https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?auto=format&fit=crop&w=1000&q=80'],
    description: 'Neon-accented subterranean izakaya crafting handmade dim sums, Korean robata skewers, and craft cocktail mixology.',
    amenities: ['DJ Nights', 'Mixology Bar', 'Private Booths', 'Valet Parking']
  },
  {
    title: 'The Copper Kettle Corner',
    type: 'restaurant',
    category: 'Heritage Tea Bistro',
    location: 'Kolkata, India',
    price: 1400,
    rating: 4.76,
    reviewsCount: 145,
    ratingsTotal: 690.2,
    images: ['https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1000&q=80'],
    description: 'Nostalgic wooden bistro pouring first-flush Darjeeling harvests alongside smoked cheese toasts and Victorian tea cakes.',
    amenities: ['First-Flush Tea Bar', 'Book Library', 'Al Fresco Alley', 'Art Gallery Space']
  },
  {
    title: 'Kollam Backwater Serenity Resort',
    type: 'hotel',
    category: 'Eco Resort',
    location: 'Alleppey, India',
    price: 16500,
    rating: 4.91,
    reviewsCount: 119,
    ratingsTotal: 584.29,
    images: ['https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1000&q=80'],
    description: 'Thatched waterfront eco-cottages on tranquil backwater canals, complete with traditional solar houseboats.',
    amenities: ['Houseboat Cruises', 'Ayurveda Treatments', 'Kayaking', 'Waterfront Dining']
  },
  {
    title: 'Cliffhanger Cloud Cabin',
    type: 'hotel',
    category: 'Off-Grid Glamping',
    location: 'Wayanad, India',
    price: 6900,
    rating: 4.8,
    reviewsCount: 64,
    ratingsTotal: 307.2,
    images: ['https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1000&q=80'],
    description: 'Glass-front geodesic domes high in the Western Ghats canopy, offering cloud-inversion views and secluded fire pits.',
    amenities: ['Geodesic Dome', 'Telescope', 'Bonfire Setup', 'Plantation Treks']
  },
  {
    title: 'Le Jardin French Courtyard',
    type: 'restaurant',
    category: 'Fine Dining',
    location: 'Hyderabad, India',
    price: 4500,
    rating: 4.93,
    reviewsCount: 108,
    ratingsTotal: 532.44,
    images: ['https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1000&q=80'],
    description: 'Candle-lit courtyard dining delivering neoclassical French gastronomy, tableside flambé desserts, and vintage cellar wines.',
    amenities: ['Candlelight Courtyard', 'Sommelier', 'Wheelchair Accessible', 'Valet Parking']
  },
  {
    title: 'Millet & Fern Kitchen Bistro',
    type: 'restaurant',
    category: 'Farm-to-Table',
    location: 'Pune, India',
    price: 1750,
    rating: 4.82,
    reviewsCount: 76,
    ratingsTotal: 366.32,
    images: ['https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?auto=format&fit=crop&w=1000&q=80'],
    description: 'Rustic sustainable eatery showcasing hyper-local millets, organic cold-pressed dressings, and seasonal root vegetables.',
    amenities: ['Organic Produce Store', 'Zero Waste Kitchen', 'Pet Friendly', 'Open Garden Deck']
  },
  {
    title: 'The Marble Arch Haveli',
    type: 'hotel',
    category: 'Boutique Heritage',
    location: 'Jodhpur, India',
    price: 13500,
    rating: 4.87,
    reviewsCount: 125,
    ratingsTotal: 608.75,
    images: ['https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80'],
    description: 'Restored sandstone haveli under Mehrangarh Fort with carved jharokhas, brass lanterns, and a courtyard swimming pool.',
    amenities: ['Fort View Terrace', 'Rooftop Bar', 'Heritage Walks', 'Outdoor Pool']
  },
  {
    title: 'Solitude Bay Fishermans Cottage',
    type: 'hotel',
    category: 'Coastal Homestay',
    location: 'Gokarna, India',
    price: 5800,
    rating: 4.77,
    reviewsCount: 52,
    ratingsTotal: 248.04,
    images: ['https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1000&q=80'],
    description: 'Rustic red-tiled beach cottage steps from secluded sands, featuring open-air hammocks and fresh catch seafood dinners.',
    amenities: ['Direct Beachfront', 'Hammocks', 'Barbecue Pit', 'Surfboard Rentals']
  },
  {
    title: 'Zaffron & Smoke Awadhi Lounge',
    type: 'restaurant',
    category: 'North Indian Fine Dining',
    location: 'Lucknow, India',
    price: 2900,
    rating: 4.9,
    reviewsCount: 153,
    ratingsTotal: 749.7,
    images: ['https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80'],
    description: 'Opulent Nawabi dining room renowned for slow-dum biryanis, melt-in-the-mouth galouti kebabs, and live shehnai music.',
    amenities: ['Private Dining Dastarkhwan', 'Live Traditional Music', 'Valet Parking', 'Wheelchair Access']
  },
  {
    title: 'L’Artisan Roastery & Bakehouse',
    type: 'restaurant',
    category: 'Artisanal Bakery & Bistro',
    location: 'Chandigarh, India',
    price: 1600,
    rating: 4.75,
    reviewsCount: 99,
    ratingsTotal: 470.25,
    images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1000&q=80'],
    description: 'Minimalist Scandinavian bakery turning out hand-laminated pain au chocolat, tartines, and micro-roastery flat whites.',
    amenities: ['In-House Micro Roaster', 'Free High-Speed Wi-Fi', 'Outdoor Benches', 'Takeaway Kiosk']
  },
  {
    title: 'Himalayan Ridge Ski Lodge',
    type: 'hotel',
    category: 'Alpine Resort',
    location: 'Gulmarg, India',
    price: 24000,
    rating: 4.94,
    reviewsCount: 81,
    ratingsTotal: 400.14,
    images: ['https://images.unsplash.com/photo-1502784444187-359ac186c5bb?auto=format&fit=crop&w=1000&q=80'],
    description: 'Ski-in/ski-out timber chalet facing snowy Apharwat peaks, complete with heated outdoor hydrotherapy tubs and gear hire.',
    amenities: ['Ski-in/Ski-out Access', 'Heated Outdoor Tub', 'Ski Equipment Rental', 'Fireside Bar']
  },
  {
    title: 'The Orchard Farmhouse',
    type: 'hotel',
    category: 'Farmstay',
    location: 'Alibaug, India',
    price: 12000,
    rating: 4.84,
    reviewsCount: 61,
    ratingsTotal: 295.24,
    images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80'],
    description: 'Modern rustic 4-bedroom villa set in mango groves with private lawns, open-concept kitchens, and a sunken pool deck.',
    amenities: ['Private Swimming Pool', 'BBQ Grill', 'Caretaker On-Site', 'Pet Friendly']
  },
  {
    title: 'Coastline Oyster & Cocktail Bar',
    type: 'restaurant',
    category: 'Seafood & Raw Bar',
    location: 'Chennai, India',
    price: 3400,
    rating: 4.86,
    reviewsCount: 112,
    ratingsTotal: 544.32,
    images: ['https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=1000&q=80'],
    description: 'Breezy nautical-chic establishment highlighting daily fresh catches, chilled oyster platters, and sea-salt botanical cocktails.',
    amenities: ['Raw Bar', 'Ocean Breeze Deck', 'Craft Gin Menu', 'Valet Parking']
  }
];

async function seedDB() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/airbnb_clone';
    await mongoose.connect(mongoUri);
    console.log('Connected to DB for seeding...');

    // 1. Create or get default demo host user
    let hostUser = await User.findOne({ email: 'host@airbnb.com' });
    if (!hostUser) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      hostUser = await User.create({
        name: 'Demo Host',
        email: 'host@airbnb.com',
        password: hashedPassword
      });
      console.log('Created default host account (host@airbnb.com / password123)');
    }

    // 2. Clear previous listings
    await Listing.deleteMany({});

    // 3. Attach owner ID to each listing
    const formattedData = sampleData.map((item) => ({
      ...item,
      owner: hostUser._id
    }));

    // 4. Save listings into database
    await Listing.insertMany(formattedData);
    console.log(`Successfully populated ${formattedData.length} listings into MongoDB!`);
    process.exit(0);
  } catch (err) {
    console.error('Seed Error:', err);
    process.exit(1);
  }
}

seedDB();