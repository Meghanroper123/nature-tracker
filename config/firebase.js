const admin = require('firebase-admin');
const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');

// Initialize Firebase Admin SDK (for server-side operations)
let adminDb;
try {
  // Check if Firebase Admin credentials are set
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    // Parse the JSON service account key
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    adminDb = admin.firestore();
    console.log('Firebase Admin SDK initialized successfully');
  } else {
    console.log('Firebase service account not found. Some server-side functions will be limited.');
  }
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
}

// Initialize Firebase SDK (for client-side operations)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Analytics is only available in browser environments
// We'll initialize it in the client-side code only

module.exports = {
  admin,
  adminDb,
  app,
  db,
  firebaseConfig
}; 