const admin = require('firebase-admin');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Test events data with Los Angeles area coordinates
const testEvents = [
  {
    type: 'WILDLIFE',
    title: 'Red-tailed Hawk at Griffith Park',
    description: 'Spotted a red-tailed hawk soaring near the Griffith Observatory trails.',
    location: { lat: 34.1184, lng: -118.3004 }, // Griffith Park
    eventDate: new Date().toISOString(), // Today's date
    userId: 'test-user-1',
    status: 'active',
    imageUrl: 'https://images.pexels.com/photos/943179/pexels-photo-943179.jpeg',
    timestamp: new Date().toISOString()
  },
  {
    type: 'BOTANICAL',
    title: 'Spring Bloom Tour',
    description: 'Guided tour of spring wildflowers',
    location: {
      type: 'Point',
      coordinates: [-122.4194, 37.7749]
    },
    eventDate: new Date('2024-04-01T09:00:00Z'),
    userId: 'test-user-2',
    status: 'active',
    imageUrl: 'https://example.com/flowers.jpg',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    type: 'OCEAN',
    title: 'Tide Pool Exploration',
    description: 'Explore local tide pools and marine life',
    location: {
      type: 'Point',
      coordinates: [-122.4194, 37.7749]
    },
    eventDate: new Date('2024-03-20T14:00:00Z'),
    userId: 'test-user-3',
    status: 'active',
    imageUrl: 'https://example.com/tidepool.jpg',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    type: 'WILDLIFE',
    title: 'Dolphin Pod Sighting',
    description: 'Pod of dolphins spotted from Point Dume State Beach.',
    location: { lat: 34.0259, lng: -118.7798 }, // Point Dume
    eventDate: new Date().toISOString(),
    userId: 'test-user-1',
    status: 'active',
    imageUrl: 'https://images.pexels.com/photos/225869/pexels-photo-225869.jpeg',
    timestamp: new Date().toISOString()
  },
  {
    type: 'plant',
    title: 'California Poppies at Kenneth Hahn',
    description: 'Large bloom of California poppies at Kenneth Hahn State Recreation Area.',
    location: { lat: 34.0082, lng: -118.3712 }, // Kenneth Hahn State Recreation Area
    eventDate: new Date().toISOString(),
    userId: 'test-user-2',
    status: 'active',
    imageUrl: 'https://images.pexels.com/photos/2382665/pexels-photo-2382665.jpeg',
    timestamp: new Date().toISOString()
  },
  {
    type: 'ASTRONOMY',
    title: 'Perseid Meteor Shower Viewing',
    description: 'Annual Perseid meteor shower peak viewing at Griffith Observatory. Perfect conditions expected!',
    location: { lat: 34.1184, lng: -118.3004 }, // Griffith Observatory
    eventDate: new Date('2024-08-12T20:00:00Z').toISOString(), // Future date
    userId: 'test-user-1',
    status: 'active',
    imageUrl: 'https://images.pexels.com/photos/1169754/pexels-photo-1169754.jpeg',
    timestamp: new Date().toISOString()
  }
];

async function populateTestData() {
  try {
    console.log('Starting to populate test data...');
    
    // First, clear existing data
    const snapshot = await db.collection('incidents').get();
    const deletePromises = [];
    snapshot.forEach(doc => {
      deletePromises.push(doc.ref.delete());
    });
    await Promise.all(deletePromises);
    console.log('Cleared existing incidents');

    // Add new events
    for (const event of testEvents) {
      const docRef = db.collection('incidents').doc();
      const eventData = {
        ...event,
        id: docRef.id,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      };
      await docRef.set(eventData);
      console.log(`Added event: ${event.title} with ID: ${docRef.id}`);
    }
    
    // Verify the data
    console.log('\nVerifying stored data:');
    const verifySnapshot = await db.collection('incidents').get();
    console.log(`Found ${verifySnapshot.size} documents in the collection`);
    verifySnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ${data.title} (${data.type}) - ID: ${doc.id}`);
    });

    console.log('\nTest data population completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error populating test data:', error);
    process.exit(1);
  }
}

populateTestData(); 