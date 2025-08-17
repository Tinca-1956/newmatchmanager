
'use server';

import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// IMPORTANT: You will need to provide your service account credentials.
// Go to your Firebase Project settings > Service accounts and generate a new private key.
// Store the downloaded JSON file securely and provide its content.
// For App Hosting, the recommended way is to use secrets.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : undefined;

const apps = getApps();
const adminApp =
  !apps.length && serviceAccount
    ? initializeApp({
        credential: cert(serviceAccount),
      })
    : getApp();

const firestoreAdmin = getFirestore(adminApp);

export { adminApp, firestoreAdmin };
