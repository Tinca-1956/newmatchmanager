
'use client';

import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase-client';

// Ensure functions is not null before using it.
const helloWorld = functions ? httpsCallable<{ name: string }, { message: string }>(functions, 'helloWorld') : null;

export const callHelloWorld = async (name: string) => {
    if (!helloWorld) {
        throw new Error("Firebase Functions are not initialized.");
    }
    try {
        const result = await helloWorld({ name });
        return result.data;
    } catch (error) {
        console.error("Error calling helloWorld function:", error);
        throw error;
    }
};
