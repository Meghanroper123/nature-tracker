const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Get token from header or cookie
    let token = null;
    
    // Check Authorization header (Bearer token)
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace('Bearer ', '');
      console.log('Token found in Authorization header, length:', token.length);
    } 
    // Check cookie
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('Token found in cookie, length:', token.length);
    }
    
    if (!token) {
      console.log('No authentication token found');
      return res.status(401).json({ message: 'No authentication token, access denied' });
    }

    // Check if token is a valid format before trying to verify
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      console.error('Invalid token format:', token.substring(0, 10) + '...');
      return res.status(401).json({ message: 'Invalid token format' });
    }

    // Verify token
    try {
      console.log('Using JWT_SECRET:', process.env.JWT_SECRET ? 'defined' : 'undefined');
      
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || 'fallback_secret_key_for_development',
        { algorithms: ['HS256'] }
      );
      
      console.log(`Token verified for user ID: ${decoded.id}`);
      
      // Find user by id
      const user = await User.findById(decoded.id);
      
      if (!user) {
        console.log(`User not found for ID: ${decoded.id}`);
        return res.status(401).json({ message: 'User not found, please login again' });
      }
      
      // Add user to request object
      req.user = user;
      req.token = token;
      
      next();
    } catch (tokenError) {
      console.error('Token verification error:', tokenError.message);
      if (tokenError.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token expired, please login again' });
      } else if (tokenError.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Invalid token, please login again' });
      } else {
        return res.status(401).json({ message: 'Token validation error, please login again' });
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Server error during authentication' });
  }
};

module.exports = auth; 