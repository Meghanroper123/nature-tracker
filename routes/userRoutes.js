const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const passport = require('passport');
const multer = require('multer');
const path = require('path');

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB limit
    },
    fileFilter: function (req, file, cb) {
        // Accept images only
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Only image files (JPEG, PNG, GIF) are allowed!'), false);
        }
        cb(null, true);
    }
});

// Register a new user
router.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        
        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        // Create new user
        user = new User({
            email,
            password,
            name
        });
        
        await user.save();
        
        // Create JWT token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        
        res.status(201).json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        
        // Create JWT token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
        
        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                name: user.name
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Google OAuth login route - only active if credentials are configured
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    // Redirect to profile page with error parameter
    return res.redirect('/profile.html?error=google_auth_not_configured');
  }
  
  // Otherwise, proceed with the Google authentication
  passport.authenticate('google', { 
    scope: ['profile', 'email']
  })(req, res, next);
});

// Google OAuth callback route
router.get(
  '/google/callback',
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.redirect('/profile.html');
    }
    passport.authenticate('google', { session: false, failureRedirect: '/profile.html' })(req, res, next);
  },
  async (req, res) => {
    try {
      // Create JWT token
      const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
      
      // Set token in cookie
      res.cookie('token', token, {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: process.env.NODE_ENV === 'production'
      });
      
      // Redirect to profile page
      res.redirect('/profile.html?success=google_auth_success');
    } catch (error) {
      console.error('Google auth error:', error);
      res.redirect('/profile.html?error=google_auth_failed');
    }
  }
);

// Google auth status check - used by frontend to check if auth was successful
router.get('/google/status', auth, (req, res) => {
  const userData = {
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    createdAt: req.user.createdAt,
    avatar: req.user.avatar,
    stats: req.user.stats
  };
  
  // Create new JWT token to send to client
  const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
  
  res.json({ success: true, user: userData, token });
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user profile
router.put('/profile', auth, upload.single('profilePicture'), async (req, res) => {
    try {
        const { name, email } = req.body;
        const user = await User.findById(req.user.id);
        
        if (name) user.name = name;
        if (email) user.email = email;
        if (req.file) user.profilePicture = `/uploads/${req.file.filename}`;
        
        await user.save();
        
        res.json({
            id: user._id,
            email: user.email,
            name: user.name,
            profilePicture: user.profilePicture
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Logout user
router.post('/logout', (req, res) => {
  try {
    console.log('Logout request received');
    // Clear the token cookie regardless of authentication
    res.clearCookie('token', {
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    console.log('Token cookie cleared');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Simple ping endpoint for diagnostics
router.get('/ping', (req, res) => {
  console.log('Ping endpoint called');
  res.json({ 
    status: 'ok', 
    message: 'API is working', 
    env: {
      nodeEnv: process.env.NODE_ENV || 'not set',
      hasJwtSecret: !!process.env.JWT_SECRET,
      port: process.env.PORT || 'default'
    }
  });
});

module.exports = router; 