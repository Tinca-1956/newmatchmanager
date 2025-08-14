
'use client';

import { getFunctions, httpsCallable, type Functions } from 'firebase/functions';
import { app } from './firebase-client';

const functions = getFunctions(app, 'us-central1');

const helloWorld = httpsCallable<{ name: string }, { message: string }>(functions, 'helloWorld');

export const callHelloWorld = async (name: string) => {
    try {
        const result = await helloWorld({ name });
        return result.data;
    } catch (error) {
        console.error("Error calling helloWorld function:", error);
        throw error;
    }
};
