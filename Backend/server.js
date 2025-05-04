const express = require('express');
const cors = require('cors');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, doc, getDoc, query, orderBy } = require('firebase/firestore');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
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

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAyhAOng--I11BkYTlkh20CcPy-a71z2YE",
  authDomain: "nature-tracker-e4957.firebaseapp.com",
  projectId: "nature-tracker-e4957",
  storageBucket: "nature-tracker-e4957.firebasestorage.app",
  messagingSenderId: "107809172984",
  appId: "1:107809172984:web:4d69d2ca2571104f181dc5",
  measurementId: "G-09RQ03B2L2"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Multer setup for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Google Cloud Storage setup
const storage = new Storage({
  projectId: process.env.GCLOUD_PROJECT_ID,
  keyFilename: process.env.GCLOUD_KEY_FILE // Path to your service account key
});
const bucket = storage.bucket('nature-tracker-e4957.firebasestorage.app');

// API Routes
app.get('/api/sightings', async (req, res) => {
  try {
    const { userId } = req.query;
    const sightingsRef = collection(db, 'sightings');
    
    let q;
    if (userId) {
      // Query for specific user's sightings
      q = query(sightingsRef, 
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
    } else {
      // Query for all sightings
      q = query(sightingsRef, orderBy('createdAt', 'desc'));
    }
    
    const querySnapshot = await getDocs(q);
    const sightings = [];
    querySnapshot.forEach((doc) => {
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
      imageUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
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

    const docRef = await addDoc(collection(db, 'incidents'), incidentData);
    res.status(201).json({ id: docRef.id, ...incidentData });
  } catch (error) {
    console.error('Error creating incident:', error); // FULL error object
    res.status(400).json({ message: 'Error creating incident', error: error.message });
  }
});

app.get('/api/sightings/:id', async (req, res) => {
  try {
    const docRef = doc(db, 'sightings', req.params.id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
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
    const incidentsRef = collection(db, 'incidents');
    const q = query(incidentsRef, orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    const incidents = [];
    querySnapshot.forEach((doc) => {
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 