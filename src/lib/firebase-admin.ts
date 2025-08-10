
'use server';

import * as admin from 'firebase-admin';

// This function ensures that Firebase Admin is initialized only once.
const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // Ensure environment variables are present before attempting to initialize.
  if (
    !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !process.env.FIREBASE_PRIVATE_KEY
  ) {
    console.error(
      'Firebase Admin SDK environment variables are not set. Skipping initialization.'
    );
    // Return null or throw an error to indicate failure
    return null;
  }

  try {
    const serviceAccount: admin.ServiceAccount = {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Replace \\n with \n to ensure the private key is parsed correctly
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    };

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    // Prevent crashing if an error occurs during initialization
    console.error('Firebase admin initialization error:', error);
    return null;
  }
};

const getFirestoreAdmin = () => {
    const app = initializeFirebaseAdmin();
    if (!app) {
        // This is a safeguard. If initialization fails, any attempt to use firestore will throw this error.
        throw new Error('Firebase Admin SDK could not be initialized. Check server logs for configuration errors.');
    }
    return admin.firestore();
}


export { getFirestoreAdmin };
