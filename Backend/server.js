const express = require('express');
const cors = require('cors');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, doc, getDoc, query, orderBy, where } = require('firebase/firestore');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration for mobile app
app.use(cors({
  origin: ['http://localhost:3000', 'exp://localhost:19000', 'exp://192.168.1.1:19000'],
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

app.post('/api/sightings', async (req, res) => {
  try {
    const { type, title, description, image, location, userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    const sightingData = {
      type,
      title,
      description,
      image,
      location: {
        latitude: location.latitude,
        longitude: location.longitude
      },
      userId,
      createdAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'sightings'), sightingData);
    res.status(201).json({ id: docRef.id, ...sightingData });
  } catch (error) {
    res.status(400).json({ message: 'Error creating sighting', error: error.message });
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 