
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, type Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, type FirebaseStorage, connectStorageEmulator } from 'firebase/storage';

// --- Common Setup ---
let app;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let storage: FirebaseStorage | null = null;

// This check ensures this code only runs in the browser.
if (typeof window !== 'undefined') {
  const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';

  // --- Emulator Setup ---
  if (useEmulators) {
    console.log('Connecting to Firebase Emulators');
    
    // Initialize with a minimal, but valid, config for emulators.
    // The key and project ID are placeholders required by the SDK.
    const emulatorConfig = {
      apiKey: 'emulator-api-key',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'newmatchmanager',
    };

    app = getApps().length === 0 ? initializeApp(emulatorConfig) : getApp();
    
    auth = getAuth(app);
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });

    firestore = getFirestore(app);
    connectFirestoreEmulator(firestore, 'localhost', 8080);
    
    storage = getStorage(app);
    connectStorageEmulator(storage, 'localhost', 9199);

  // --- Production Setup ---
  } else {
    const firebaseConfig: FirebaseOptions = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };
    
    // Only initialize if the config is complete.
    if (firebaseConfig.apiKey && firebaseConfig.projectId) {
      app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      auth = getAuth(app);
      firestore = getFirestore(app);
      storage = getStorage(app);
    } else {
      console.error("Production Firebase config is incomplete. Check your environment variables.");
    }
  }

  if (!app) {
    console.error("Firebase app initialization failed. Check your configuration and emulator status.");
  }
}

export { app, auth, firestore, storage };
