const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration for mobile app
app.use(cors({
  origin: '*',  // Allow all origins for development
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log('🔥 Development Server - Firebase disabled for quick start');
console.log('⚠️  Note: Database operations will not work without Firebase setup');

// Basic health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Nature Tracker Backend - Development Mode',
    status: 'running',
    firebase: 'disabled',
    timestamp: new Date().toISOString()
  });
});

// Mock endpoints for development
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: 'development' });
});

app.get('/api/incidents', (req, res) => {
  res.json({ 
    message: 'Firebase not configured - please set up Firebase service account',
    incidents: []
  });
});

app.post('/api/incidents', (req, res) => {
  res.json({ 
    message: 'Firebase not configured - incident not saved',
    data: req.body
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Development server running on http://localhost:${PORT}`);
  console.log(`📱 Backend API available for mobile app testing`);
  console.log(`\n🔧 To enable full functionality:`);
  console.log(`   1. Get Firebase service account key from Firebase Console`);
  console.log(`   2. Create .env file with FIREBASE_SERVICE_ACCOUNT`);
  console.log(`   3. Run: npm start (instead of this dev server)`);
  console.log(`\n📚 API Endpoints:`);
  console.log(`   GET  /              - Health check`);
  console.log(`   GET  /api/health    - API status`);
  console.log(`   GET  /api/incidents - List incidents (mock)`);
  console.log(`   POST /api/incidents - Create incident (mock)`);
}); 