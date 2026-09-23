const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const listingRoutes = require('./routes/listingRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/listings', listingRoutes);

// Health check route
app.get('/', (req, res) => {
  res.send('Airbnb Clone API is live!');
});

// Database connection & Server boot
mongoose
  .connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/airbnb_clone')
  .then(() => {
    console.log('MongoDB connected successfully');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('Database connection failed:', err));