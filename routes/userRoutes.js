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
    
    // Set token in cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: process.env.NODE_ENV === 'production'
    });
    
    // Return user data without password
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      avatar: user.avatar,
      stats: user.stats
    };
    
    res.status(201).json({ user: userData, token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if email and password are provided
    if (!email || !password) {
      console.log('Login attempt with missing credentials');
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    console.log(`Login attempt for email: ${email}`);
    
    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`Login failed: User with email ${email} not found`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check if password is correct
    const isMatch = await user.comparePassword(password);
    console.log(`Password match result for ${email}: ${isMatch}`);
    
    if (!isMatch) {
      console.log(`Login failed: Incorrect password for ${email}`);
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Create JWT token with more secure options
    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET || 'fallback_secret_key_for_development',
      { 
        expiresIn: '30d',
        algorithm: 'HS256'
      }
    );
    
    console.log(`Generated token for ${email}, length: ${token.length}`);
    
    // Set token in cookie with improved options
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Added to prevent CSRF issues
      path: '/'  // Ensure cookie is available for all paths
    });
    
    console.log(`User ${email} logged in successfully, cookie set`);
    
    // Return user data without password
    const userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      avatar: user.avatar,
      stats: user.stats
    };
    
    res.json({ user: userData, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
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

// Get current user profile
router.get('/profile', auth, async (req, res) => {
  try {
    // Get user data without password
    const userData = {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      createdAt: req.user.createdAt,
      avatar: req.user.avatar,
      bio: req.user.bio,
      stats: req.user.stats
    };
    
    res.json(userData);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, bio } = req.body;
    
    // Update user fields
    if (name) req.user.name = name;
    if (bio) req.user.bio = bio;
    
    await req.user.save();
    
    // Return updated user data
    const userData = {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      createdAt: req.user.createdAt,
      avatar: req.user.avatar,
      bio: req.user.bio,
      stats: req.user.stats
    };
    
    res.json(userData);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload profile picture
router.post('/profile/picture', auth, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Update user's avatar with the path to the uploaded file
    const avatarPath = `/uploads/${req.file.filename}`;
    req.user.avatar = avatarPath;
    
    await req.user.save();
    
    // Return updated user data
    const userData = {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      createdAt: req.user.createdAt,
      avatar: req.user.avatar,
      bio: req.user.bio,
      stats: req.user.stats
    };
    
    res.json(userData);
  } catch (error) {
    console.error('Profile picture upload error:', error);
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