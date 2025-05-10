const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const admin = require('firebase-admin');
require('dotenv').config();

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

// Firebase Admin initialization
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : null;
if (serviceAccount && serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}
if (!serviceAccount) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set or invalid.');
}
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'nature-tracker-e4957.firebasestorage.app',
});
const db = admin.firestore();
const bucket = admin.storage().bucket();

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// API Routes
app.get('/api/sightings', async (req, res) => {
  try {
    const { userId } = req.query;
    let sightingsRef = db.collection('sightings');
    let query = sightingsRef;
    if (userId) {
      query = query.where('userId', '==', userId);
    }
    query = query.orderBy('createdAt', 'desc');
    const snapshot = await query.get();
    const sightings = [];
    snapshot.forEach(doc => {
      sightings.push({ id: doc.id, ...doc.data() });
    });
    res.json(sightings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sightings', error: error.message });
  }
});

app.post('/api/incidents', upload.single('image'), async (req, res) => {
  console.log('Received POST /api/incidents');
  console.log('Body:', req.body);
  console.log('File:', req.file);
  try {
    const { type, title, description, lat, lng, userId } = req.body;
    let imageUrl = null;
    // Upload image to Firebase Storage if present
    if (req.file) {
      const blob = bucket.file(`incidents/${Date.now()}_${req.file.originalname}`);
      const blobStream = blob.createWriteStream({ resumable: false });
      blobStream.end(req.file.buffer);
      await new Promise((resolve, reject) => {
        blobStream.on('finish', resolve);
        blobStream.on('error', reject);
      });
      imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(blob.name)}?alt=media`;
    }
    const incidentData = {
      title,
      description: description || '',
      type,
      location: { lat: parseFloat(lat), lng: parseFloat(lng) },
      imageUrl,
      userId: userId || null,
      timestamp: new Date().toISOString(),
    };
    const docRef = await db.collection('incidents').add(incidentData);
    res.status(201).json({ id: docRef.id, ...incidentData });
  } catch (error) {
    console.error('Error creating incident:', error); // FULL error object
    res.status(400).json({ message: 'Error creating incident', error: error.message });
  }
});

app.get('/api/sightings/:id', async (req, res) => {
  try {
    const docRef = db.collection('sightings').doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ message: 'Sighting not found' });
    }
    res.json({ id: docSnap.id, ...docSnap.data() });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching sighting', error: error.message });
  }
});

// GET /api/incidents - return all incidents
app.get('/api/incidents', async (req, res) => {
  try {
    const incidentsRef = db.collection('incidents');
    const snapshot = await incidentsRef.orderBy('timestamp', 'desc').get();
    const incidents = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      incidents.push({
        id: doc.id,
        type: data.type,
        title: data.title,
        description: data.description,
        location: data.location,
        imageUrl: data.imageUrl,
        userId: data.userId,
        timestamp: data.timestamp,
      });
    });
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching incidents', error: error.message });
  }
});

// Get comments for an incident
app.get('/api/incidents/:id/comments', async (req, res) => {
  try {
    const commentsRef = db.collection('incidents').doc(req.params.id).collection('comments');
    const snapshot = await commentsRef.orderBy('timestamp', 'asc').get();
    const comments = [];
    snapshot.forEach(doc => comments.push({ id: doc.id, ...doc.data() }));
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comments', error: error.message });
  }
});

// Add a comment to an incident
app.post('/api/incidents/:id/comments', async (req, res) => {
  try {
    const { userId, username, text } = req.body;
    const comment = {
      userId,
      username,
      text,
      timestamp: new Date().toISOString(),
    };
    const commentsRef = db.collection('incidents').doc(req.params.id).collection('comments');
    const docRef = await commentsRef.add(comment);
    res.status(201).json({ id: docRef.id, ...comment });
  } catch (error) {
    res.status(400).json({ message: 'Error adding comment', error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 