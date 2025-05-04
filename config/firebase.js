import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Your Firebase configuration
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
const app = initializeApp(firebaseConfig);

// Initialize Firestore
const db = getFirestore(app);

export { db }; 