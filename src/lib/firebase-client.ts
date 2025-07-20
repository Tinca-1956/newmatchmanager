import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

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

if (typeof window !== 'undefined' && isConfigComplete(firebaseConfig)) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    firestore = getFirestore(app);
  } catch (e) {
    console.error("Failed to initialize Firebase", e);
  }
}

if (typeof window !== 'undefined' && !isConfigComplete(firebaseConfig)) {
    console.warn("Firebase config is missing or incomplete. Some features will not work.");
}

export { app, auth, firestore };
