const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendWelcomeEmail } = require('../utils/emailService');

// SIGNUP
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email: trimmedEmail });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({ 
      name: trimmedName, 
      email: trimmedEmail, 
      password: hashedPassword,
      isAdmin: false
    });
    await user.save();

    sendWelcomeEmail(user.email, user.name).catch((err) => {
      console.error('Failed to send welcome email:', err.message);
    });

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.status(201).json({ 
      token, 
      user: { 
        id: user._id, 
        _id: user._id, 
        name: user.name, 
        email: user.email,
        isAdmin: user.isAdmin 
      } 
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error during signup', error: err.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: trimmedEmail });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, isAdmin: Boolean(user.isAdmin) }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({ 
      token, 
      user: { 
        id: user._id, 
        _id: user._id, 
        name: user.name, 
        email: user.email,
        isAdmin: Boolean(user.isAdmin)
      } 
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error during login', error: err.message });
  }
});

module.exports = router;