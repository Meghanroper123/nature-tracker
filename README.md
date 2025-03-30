# Nature Tracker

A nature incident tracking application built with Node.js, Express, and Firebase Firestore.

## Prerequisites

- Node.js (Download and install from [nodejs.org](https://nodejs.org/))
- Firebase account and project (Create one at [firebase.google.com](https://firebase.google.com/))

## Firebase Setup

1. The app is already configured with your Firebase project:
   - Project ID: `nature-tracker-e4957`
   - Service is ready to use

2. To enable server-side operations (required for full functionality):
   - Go to the [Firebase Console](https://console.firebase.google.com/)
   - Select your project `nature-tracker-e4957`
   - Go to Project settings > Service accounts
   - Click "Generate new private key"
   - Save the JSON file securely
   - Open your `.env` file and uncomment the `FIREBASE_SERVICE_ACCOUNT` line
   - Replace the placeholder with the entire JSON content from your service account key file

3. Security Rules Setup:
   - In the Firebase console, go to Firestore Database
   - Click the "Rules" tab
   - Set up basic rules like:
     ```
     rules_version = '2';
     service cloud.firestore {
       match /databases/{database}/documents {
         match /users/{userId} {
           allow read: if request.auth != null;
           allow write: if request.auth != null && request.auth.uid == userId;
         }
         match /incidents/{incidentId} {
           allow read: if true;
           allow write: if request.auth != null;
           allow delete: if request.auth != null && 
             (resource.data.userId == request.auth.uid || request.auth.token.admin == true);
         }
       }
     }
     ```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Update the `.env` file with your service account details as described above
   - Set other environment variables as needed

## Deploying to Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy the app:
```bash
vercel
```

4. Add environment variables in Vercel:
   - Go to your project settings on the Vercel dashboard
   - Navigate to the "Environment Variables" section
   - Add all the variables from your `.env` file
   - For the service account, add it as a single-line JSON string with proper escaping

## Running Locally

1. Start the development server:
```bash
npm run dev
```

2. Open your browser and navigate to [http://localhost:3005](http://localhost:3005)

## Features

- Express server with static file serving
- Firebase Firestore database for storing users and incidents
- Image uploads and storage
- Authentication with JWT
- Google OAuth integration (optional)
- Interactive frontend with fetch API
- Auto-reload during development (using nodemon) 