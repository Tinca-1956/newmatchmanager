
import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccount: admin.ServiceAccount = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  };

  if (
    !serviceAccount.projectId ||
    !serviceAccount.clientEmail ||
    !serviceAccount.privateKey
  ) {
    console.error('Firebase Admin SDK environment variables are not set.');
    return null;
  }

  try {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
    // Don't throw, just return null. The getFirestoreAdmin function will handle it.
    return null;
  }
};

const getFirestoreAdmin = (): admin.firestore.Firestore => {
  const app = initializeFirebaseAdmin();
  if (!app) {
    throw new Error(
      'Firebase Admin SDK could not be initialized. Check server logs for configuration errors.'
    );
  }
  return admin.firestore();
};

export { getFirestoreAdmin };
