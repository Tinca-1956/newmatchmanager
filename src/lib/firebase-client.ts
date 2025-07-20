import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// This function checks if all required config values are present.
// It's important to ensure we don't try to initialize Firebase without a full config.
function isConfigComplete(config: FirebaseOptions): boolean {
  return !!config.apiKey && !!config.authDomain && !!config.projectId;
}


let app;
let auth: Auth | null = null;

// We only want to run this initialization logic in the browser.
if (typeof window !== 'undefined' && isConfigComplete(firebaseConfig)) {
  try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
  } catch (e) {
    console.error("Failed to initialize Firebase", e);
  }
}

if (typeof window !== 'undefined' && !isConfigComplete(firebaseConfig)) {
    console.warn("Firebase config is missing or incomplete. Authentication will not work.");
}


export { app, auth };
