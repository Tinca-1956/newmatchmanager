
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, type Auth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, type Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, type FirebaseStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, type Functions, connectFunctionsEmulator } from 'firebase/functions';

let app;
let auth: Auth | null = null;
let firestore: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let functions: Functions | null = null;

// A flag to ensure emulator connection only happens once.
let emulatorsConnected = false;

const firebaseConfig: FirebaseOptions = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// This check ensures this code only runs in the browser.
if (typeof window !== 'undefined') {
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY") {
        console.error("Firebase configuration is missing or incomplete. Please check your .env.local file.");
    } else {
        if (getApps().length === 0) {
            app = initializeApp(firebaseConfig);
        } else {
            app = getApp();
        }
        
        auth = getAuth(app);
        firestore = getFirestore(app);
        storage = getStorage(app, firebaseConfig.storageBucket);
        functions = getFunctions(app);
        
        // This is the correct way to conditionally connect to emulators.
        // It depends on an environment variable and ensures it only runs once.
        if (process.env.NEXT_PUBLIC_USE_EMULATORS === 'true' && !emulatorsConnected) {
            console.log("Connecting to Firebase emulators...");
            try {
                connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
                connectFirestoreEmulator(firestore, 'localhost', 8080);
                connectStorageEmulator(storage, 'localhost', 9199);
                if (functions) {
                    connectFunctionsEmulator(functions, 'localhost', 5001);
                }
                emulatorsConnected = true; // Set the flag to prevent reconnecting
            } catch(e) {
                console.error("Error connecting to emulators. This can happen on hot reloads. It's often safe to ignore.", e);
            }
        }
    }
}

export { app, auth, firestore, storage };
