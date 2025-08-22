
import * as admin from 'firebase-admin';

// This is the server-side Firebase configuration.
// It uses service account credentials to gain admin-level access.

// Note: In a real-world scenario, you would use environment variables
// to store your service account key, especially when deploying.
// For this example, we'll assume the service account key is available.

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : null;

if (!admin.apps.length) {
  if (serviceAccount) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        // Add your databaseURL if you're using Realtime Database
        // databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
      });
    } catch (error) {
      console.error('Firebase Admin Initialization Error', error);
    }
  } else {
    console.warn('Firebase Admin not initialized. FIREBASE_SERVICE_ACCOUNT_KEY env var is missing.');
  }
}

const firestore = admin.apps.length ? admin.firestore() : null;
const auth = admin.apps.length ? admin.auth() : null;
const storage = admin.apps.length ? admin.storage() : null;

export { firestore, auth, storage };
