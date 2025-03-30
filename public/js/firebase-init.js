// Firebase client-side initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAyhAOng--I11BkYTlkh20CcPy-a7lz2YE",
  authDomain: "nature-tracker-e4957.firebaseapp.com",
  projectId: "nature-tracker-e4957",
  storageBucket: "nature-tracker-e4957.firebasestorage.app",
  messagingSenderId: "1078091725984",
  appId: "1:1078091725984:web:4d69d2ca2571104f181dc5",
  measurementId: "G-09RQ03B2L2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, analytics, db, auth }; 