import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const auth = getAuth(app); // Disabled for Expo Go compatibility
const db = getFirestore(app);

// export { auth, db };
export { app, db, getAuth, GoogleAuthProvider };

/**
 * Converts a Firebase Storage gs:// or https://storage.googleapis.com/ URL to a public download URL.
 * Accepts either a storage path (incidents/filename.jpg) or a full URL.
 */
export function getFirebasePublicUrl(imageUrl?: string | null): string | undefined {
  if (!imageUrl) return undefined;
  // If already a public URL, return as is
  if (imageUrl.startsWith('https://firebasestorage.googleapis.com')) return imageUrl;

  // Extract the storage path from gs:// or storage.googleapis.com URLs
  let storagePath = imageUrl;
  if (imageUrl.startsWith('gs://')) {
    const parts = imageUrl.split('/o/');
    storagePath = parts[1] || '';
  } else if (imageUrl.startsWith('https://storage.googleapis.com/')) {
    // Remove domain and bucket
    const match = imageUrl.match(/https:\/\/storage\.googleapis\.com\/[\w\-\.]+\/(.+)/);
    if (match && match[1]) storagePath = match[1];
  }
  // Remove leading slashes
  storagePath = storagePath.replace(/^\//, '');
  // Encode slashes for URL
  const encodedPath = encodeURIComponent(storagePath);
  return `https://firebasestorage.googleapis.com/v0/b/nature-tracker-e4957.appspot.com/o/${encodedPath}?alt=media`;
} 