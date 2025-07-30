
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

// This code runs in the browser.
if (typeof window !== 'undefined') {
  // If we are in development mode and running on localhost, connect to the emulators.
  // The NEXT_PUBLIC_USE_EMULATORS variable is set to "true" in the `dev` script in package.json
  const useEmulators =
    process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';

  if (useEmulators) {
    console.log('Connecting to Firebase Emulators');
    
    // Initialize with a minimal config for emulators to work.
    const emulatorConfig = {
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'newmatchmanager'
    };
    app = getApps().length === 0 ? initializeApp(emulatorConfig) : getApp();
    
    auth = getAuth(app);
    firestore = getFirestore(app);
    storage = getStorage(app);

    // Connect to the emulators
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(firestore, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);

  } else {
    // We are in a deployed environment (or local production build).
    // Use the full firebaseConfig with environment variables.
    if (isConfigComplete(firebaseConfig)) {
      try {
        app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
        auth = getAuth(app);
        firestore = getFirestore(app);
        storage = getStorage(app);
      } catch(e) {
        console.error("Failed to initialize Firebase in production", e);
      }
    } else {
      console.error("Production Firebase config is incomplete. Check your environment variables.");
    }
  }

  if (!app) {
    console.error("Firebase app initialization failed. Check your configuration and emulator status.");
  }
}

export { app, auth, firestore, storage };
