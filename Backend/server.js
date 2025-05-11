const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const admin = require('firebase-admin');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
require('dotenv').config();

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

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
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for videos
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed'));
    }
  }
});

// API Routes
app.get('/api/incidents', async (req, res) => {
  try {
    const { userId } = req.query;
    let incidentsRef = db.collection('incidents');
    let query = incidentsRef;
    if (userId) {
      query = query.where('userId', '==', userId);
    } else {
      // For development, if no userId is provided, show dev-user-123's incidents
      query = query.where('userId', '==', 'dev-user-123');
    }
    query = query.orderBy('timestamp', 'desc');
    const snapshot = await query.get();
    const incidents = [];
    snapshot.forEach(doc => {
      incidents.push({ id: doc.id, ...doc.data() });
    });
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching incidents', error: error.message });
  }
});

app.post('/api/incidents', upload.array('mediaFiles', 5), async (req, res) => {
  console.log('Received POST /api/incidents');
  console.log('Body:', req.body);
  console.log('Files:', req.files);
  try {
    const { type, title, description, lat, lng, userId, eventDate } = req.body;
    const mediaFiles = [];

    // Upload media files to Firebase Storage if present
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const isVideo = file.mimetype.startsWith('video/');
        const extension = file.originalname.split('.').pop();
        const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
        const blob = bucket.file(`incidents/${filename}`);
        const blobStream = blob.createWriteStream({ resumable: false });
        
        blobStream.end(file.buffer);
        await new Promise((resolve, reject) => {
          blobStream.on('finish', resolve);
          blobStream.on('error', reject);
        });

        const mediaUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(blob.name)}?alt=media`;
        
        const mediaFile = {
          url: mediaUrl,
          type: isVideo ? 'video' : 'image'
        };

        // If it's a video, generate a thumbnail
        if (isVideo) {
          try {
            // Create a temporary file for the video
            const tempVideoPath = path.join(__dirname, 'temp', filename);
            const tempThumbPath = path.join(__dirname, 'temp', `${filename}_thumb.jpg`);
            
            // Ensure temp directory exists
            const fs = require('fs');
            if (!fs.existsSync(path.join(__dirname, 'temp'))) {
              fs.mkdirSync(path.join(__dirname, 'temp'));
            }

            // Write the video buffer to a temporary file
            fs.writeFileSync(tempVideoPath, file.buffer);

            // Generate thumbnail using ffmpeg
            await new Promise((resolve, reject) => {
              ffmpeg(tempVideoPath)
                .screenshots({
                  timestamps: ['00:00:01'], // Take screenshot at 1 second
                  filename: `${filename}_thumb.jpg`,
                  folder: path.join(__dirname, 'temp'),
                  size: '320x240'
                })
                .on('end', resolve)
                .on('error', reject);
            });

            // Upload thumbnail to Firebase Storage
            const thumbnailBlob = bucket.file(`incidents/${filename}_thumb.jpg`);
            const thumbnailStream = thumbnailBlob.createWriteStream({ resumable: false });
            
            fs.createReadStream(tempThumbPath).pipe(thumbnailStream);
            
            await new Promise((resolve, reject) => {
              thumbnailStream.on('finish', resolve);
              thumbnailStream.on('error', reject);
            });

            // Get the thumbnail URL
            const thumbnailUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(thumbnailBlob.name)}?alt=media`;
            mediaFile.thumbnailUrl = thumbnailUrl;

            // Clean up temporary files
            fs.unlinkSync(tempVideoPath);
            fs.unlinkSync(tempThumbPath);
          } catch (error) {
            console.error('Error generating thumbnail:', error);
            // Fallback to placeholder if thumbnail generation fails
            mediaFile.thumbnailUrl = 'https://via.placeholder.com/320x240?text=Video';
          }
        }

        mediaFiles.push(mediaFile);
      }
    }

    const incidentData = {
      title,
      description: description || '',
      type,
      location: { lat: parseFloat(lat), lng: parseFloat(lng) },
      mediaFiles,
      userId: userId || 'dev-user-123', // Use dev-user-123 as default for development
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      eventDate: eventDate ? admin.firestore.Timestamp.fromDate(new Date(eventDate)) : admin.firestore.FieldValue.serverTimestamp(),
    };
    
    // Save to incidents collection
    const docRef = await db.collection('incidents').add(incidentData);
    res.json({ id: docRef.id, ...incidentData });
  } catch (error) {
    res.status(500).json({ message: 'Error creating incident', error: error.message });
  }
});

// Get a single incident
app.get('/api/incidents/:id', async (req, res) => {
  try {
    const docRef = db.collection('incidents').doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ message: 'Incident not found' });
    }
    res.json({ id: docSnap.id, ...docSnap.data() });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching incident', error: error.message });
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