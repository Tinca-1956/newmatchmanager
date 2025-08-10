
'use server';

import * as admin from 'firebase-admin';

let firestoreAdmin: admin.firestore.Firestore;

const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // Ensure environment variables are present before attempting to initialize.
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      console.error("Firebase Admin SDK environment variables are not set. Skipping initialization.");
      // In a real production scenario, you might want to throw an error here
      // if the admin SDK is critical for the application's function.
      return null;
  }

  try {
    const serviceAccount: admin.ServiceAccount = {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    };
    
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    console.error('Firebase admin initialization error:', error);
    // Don't rethrow, to prevent crashing server components that import this.
    // The calling function will need to handle the uninitialized state.
    return null;
  }
};

const app = initializeFirebaseAdmin();

if (app) {
    firestoreAdmin = admin.firestore();
} else {
    // If initialization fails, we create a mock/dummy object that will cause
    // any subsequent database calls to fail gracefully without crashing the app.
    // This makes it clear that the issue is with the connection/setup.
    firestoreAdmin = new Proxy({} as admin.firestore.Firestore, {
        get(target, prop) {
            if (prop === 'then') return undefined; // Prevent it from being treated as a Promise
            throw new Error('Firebase Admin SDK is not initialized. Check server logs for configuration errors.');
        }
    });
}

export { firestoreAdmin };
