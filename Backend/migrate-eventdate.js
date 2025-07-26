const admin = require('firebase-admin');
require('dotenv').config();

// Firebase Admin initialization (same as server.js)
let serviceAccount;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (serviceAccount && serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
  } else {
    serviceAccount = require('./nature-tracker-e4957-firebase-adminsdk-fbsvc-7f336d7d8c.json');
    console.log('✅ Using local Firebase service account file for development');
  }
} catch (error) {
  console.error('❌ Error loading Firebase service account:', error.message);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'nature-tracker-e4957.firebasestorage.app',
});

const db = admin.firestore();

async function migrateEventDates() {
  console.log('🚀 Starting eventDate migration...');
  
  try {
    // Get all incidents
    const snapshot = await db.collection('incidents').get();
    let updateCount = 0;
    let totalCount = snapshot.size;
    
    console.log(`📊 Found ${totalCount} incidents to check`);
    
    const batch = db.batch();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      
      // If incident doesn't have eventDate but has timestamp, copy timestamp to eventDate
      if (!data.eventDate && data.timestamp) {
        console.log(`🔄 Updating incident ${doc.id}: setting eventDate = timestamp`);
        batch.update(doc.ref, { eventDate: data.timestamp });
        updateCount++;
      } else if (data.eventDate) {
        console.log(`✅ Incident ${doc.id}: already has eventDate`);
      } else {
        console.log(`⚠️  Incident ${doc.id}: has neither eventDate nor timestamp`);
      }
    });
    
    if (updateCount > 0) {
      await batch.commit();
      console.log(`✅ Successfully updated ${updateCount} incidents`);
    } else {
      console.log('✅ No incidents needed updating');
    }
    
    console.log('🎉 Migration completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateEventDates(); 