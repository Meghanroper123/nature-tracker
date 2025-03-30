const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const jwt = require('jsonwebtoken');

// Load environment variables
dotenv.config();

// Import Firestore models
const Incident = require('./models/Incident');

const app = express();
const PORT = parseInt(process.env.PORT || '3000');

// Configure multer for handling file uploads
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
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        // Accept images only - case insensitive check
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Only image files (JPEG, PNG, GIF) are allowed!'), false);
        }
        cb(null, true);
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Load Passport config
require('./config/passport');

// Error handling middleware for multer
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // A Multer error occurred when uploading
        return res.status(400).json({ message: err.message });
    } else if (err) {
        // An unknown error occurred when uploading
        return res.status(400).json({ message: err.message });
    }
    next();
});

// Global error handler for authentication errors
app.use((err, req, res, next) => {
    // Check if this is an authentication error
    if (err && err.name === 'UnauthorizedError' || 
        (err.status === 401 || err.statusCode === 401)) {
        
        console.log('Authentication error caught by global handler:', err.message);
        
        // Check if this is an API request (expecting JSON)
        const isApiRequest = req.path.startsWith('/api/') || 
                            req.headers.accept === 'application/json';
        
        if (isApiRequest) {
            // Return JSON error for API requests
            return res.status(401).json({ 
                message: 'Authentication failed, please login again',
                code: 'invalid_credentials'
            });
        } else {
            // Redirect to profile page with error parameter for HTML requests
            return res.redirect('/profile.html?error=invalid_credentials');
        }
    }
    
    // Pass other errors to the next middleware
    next(err);
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'public', 'uploads'))) {
    fs.mkdirSync(path.join(__dirname, 'public', 'uploads'), { recursive: true });
}

// Routes
// User routes
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

// Google OAuth routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/profile.html?error=google_auth_failed' }),
  (req, res) => {
    // Create JWT token
    const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    
    // Set token in cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    // Redirect to profile page
    res.redirect('/profile.html?success=google_auth_success');
  }
);

// Get all incidents
app.get('/api/incidents', async (req, res) => {
    try {
        const { type, eventType, timeFilter } = req.query;
        console.log('\n--- API Request ---');
        console.log('Query params:', { type, eventType, timeFilter });
        
        const filters = {
            type,
            eventType,
            timeFilter
        };
        
        // Explicitly handle validation errors
        if (eventType && !['upcoming', 'current', 'all'].includes(eventType)) {
            return res.status(400).json({ 
                message: 'Invalid eventType parameter. Must be one of: upcoming, current, all',
                error: 'VALIDATION_ERROR' 
            });
        }
        
        if (timeFilter && !['1day', '1week', '1month', 'all'].includes(timeFilter)) {
            return res.status(400).json({ 
                message: 'Invalid timeFilter parameter. Must be one of: 1day, 1week, 1month, all',
                error: 'VALIDATION_ERROR' 
            });
        }
        
        const incidents = await Incident.getAll(filters);
        
        // Ensure incidents is always an array
        const incidentsArray = Array.isArray(incidents) ? incidents : [];
        
        console.log('Final filtered incidents:', incidentsArray.map(e => ({
            id: e.id,
            title: e.title,
            eventDate: e.eventDate
        })));
        
        res.json(incidentsArray);
    } catch (error) {
        console.error('Error fetching incidents:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get incident by ID
app.get('/api/incidents/:id', async (req, res) => {
    try {
        const incident = await Incident.findById(req.params.id);
        
        if (!incident) {
            return res.status(404).json({ message: 'Incident not found' });
        }
        
        res.json(incident);
    } catch (error) {
        console.error('Error fetching incident:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add new incident with image upload
app.post('/api/incidents', upload.single('image'), async (req, res) => {
    try {
        console.log('Received form data:', req.body);
        console.log('Received file:', req.file);
        
        const { type, title, description, lat, lng } = req.body;
        
        // Validate required fields
        if (!type || !title || !description || !lat || !lng) {
            console.log('Missing required fields:', { type, title, description, lat, lng });
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Get current system time
        const currentTime = new Date().toISOString();

        // Create new incident
        const newIncident = new Incident({
            type,
            title,
            description,
            location: {
                lat: parseFloat(lat),
                lng: parseFloat(lng)
            },
            imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
            eventDate: currentTime,
            timestamp: currentTime,
            userId: req.user ? req.user._id : null
        });

        await newIncident.save();
        
        console.log('Created new incident:', newIncident);
        res.status(201).json(newIncident);
    } catch (error) {
        console.error('Error creating incident:', error);
        res.status(500).json({ message: 'Error creating incident' });
    }
});

// Delete incident
app.delete('/api/incidents/:id', async (req, res) => {
    try {
        const incidentId = req.params.id;
        const incident = await Incident.findById(incidentId);
        
        if (!incident) {
            return res.status(404).json({ message: 'Incident not found' });
        }

        // Delete associated image if it exists
        if (incident.imageUrl) {
            const imagePath = path.join(__dirname, 'public', incident.imageUrl);
            try {
                fs.unlinkSync(imagePath);
            } catch (error) {
                console.error('Error deleting image:', error);
            }
        }

        // Remove the incident
        await Incident.deleteById(incidentId);

        res.json({ message: 'Incident deleted successfully' });
    } catch (error) {
        console.error('Error deleting incident:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Serve the main HTML file for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Error: Port ${PORT} is already in use. Please close the other application using this port or specify a different port.`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

// Clean shutdown handlers
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}); 