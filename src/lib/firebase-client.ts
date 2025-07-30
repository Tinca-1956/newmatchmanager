
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, type Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, type FirebaseStorage, connectStorageEmulator } from 'firebase/storage';

// --- Common Setup ---
let app;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let initializationError: string | null = null;

// This check ensures this code only runs in the browser.
if (typeof window !== 'undefined') {
  try {
    const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';

    // --- Emulator Setup ---
    if (useEmulators) {
      console.log('%cConnecting to Firebase Emulators', 'color: orange; font-weight: bold;');
      
      const emulatorConfig = {
        apiKey: 'emulator-api-key',
        authDomain: 'localhost',
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'newmatchmanager',
        storageBucket: 'default-bucket',
      };

      app = getApps().length === 0 ? initializeApp(emulatorConfig) : getApp();
      
      auth = getAuth(app);
      try {
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      } catch (e) {
        // This can happen on hot reloads, it's safe to ignore.
      }


      firestore = getFirestore(app);
      try {
        connectFirestoreEmulator(firestore, 'localhost', 8080);
      } catch (e) {
        // This can happen on hot reloads, it's safe to ignore.
      }
      
      storage = getStorage(app);
       try {
        connectStorageEmulator(storage, 'localhost', 9199);
      } catch (e) {
        // This can happen on hot reloads, it's safe to ignore.
      }


    // --- Production Setup ---
    } else {
      console.log('%cConnecting to Production Firebase', 'color: green; font-weight: bold;');
      const firebaseConfig: FirebaseOptions = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };
      
      if (firebaseConfig.apiKey && firebaseConfig.projectId) {
        app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
        auth = getAuth(app);
        firestore = getFirestore(app);
        storage = getStorage(app);
      } else {
        initializationError = "Production Firebase config is incomplete. Check your environment variables.";
        console.error(initializationError);
      }
    }
  } catch (e) {
      initializationError = e instanceof Error ? e.message : String(e);
      console.error("Firebase initialization failed:", initializationError);
  }
}

export { app, auth, firestore, storage, initializationError };
