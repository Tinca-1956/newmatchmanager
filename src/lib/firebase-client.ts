
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, type Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, type FirebaseStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function isConfigComplete(config: FirebaseOptions): boolean {
  return !!config.apiKey && !!config.authDomain && !!config.projectId;
}

let app;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (typeof window !== 'undefined') {
  const completeConfig = isConfigComplete(firebaseConfig);

  if (process.env.NODE_ENV === 'development' || !completeConfig) {
    // We are in a dev environment OR the production config is missing.
    // We will try to connect to the emulators.
    try {
      console.log("Attempting to connect to Firebase services...");
      
      // Initialize with a minimal config for emulators to work.
      // The projectId is necessary for Firestore rules testing.
      const emulatorConfig = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'newmatchmanager-backend'
      };
      
      app = !getApps().length ? initializeApp(emulatorConfig) : getApp();
      auth = getAuth(app);
      firestore = getFirestore(app);
      storage = getStorage(app);
      
      console.log("Connecting to Firebase Emulators");
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      connectFirestoreEmulator(firestore, 'localhost', 8080);
      connectStorageEmulator(storage, 'localhost', 9199);

    } catch (e) {
      console.error("Failed to initialize Firebase with emulators", e);
    }
  } else {
    // We are in production and have a complete config.
    try {
      app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      auth = getAuth(app);
      firestore = getFirestore(app);
      storage = getStorage(app);
    } catch(e) {
      console.error("Failed to initialize Firebase in production", e);
    }
  }

  if (!app) {
    console.error("Firebase app initialization failed. Check your configuration and emulator status.");
  }
}

export { app, auth, firestore, storage };
