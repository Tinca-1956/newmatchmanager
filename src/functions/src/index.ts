
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import {initializeApp, getApps} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import type { User } from "./types";

// Initialize the Admin SDK only if it hasn't been already
if (getApps().length === 0) {
  initializeApp();
}

/**
 * 1st Gen Cloud Function to set a custom user claim (`role`) 
 * whenever a user's document in the `users` collection is created or updated.
 * 1st Gen is used here for its reliability and directness in setting claims,
 * which is critical for the initial user setup and subsequent permission changes.
 */
export const setUserRole = functions.firestore
    .document("users/{userId}")
    .onWrite(async (change, context) => {
        const userId = context.params.userId;
        const afterData = change.after.data() as User | undefined;
        const beforeData = change.before.data() as User | undefined;

        // If document is deleted, do nothing.
        if (!afterData) {
            logger.log(`User document for ${userId} deleted. No action taken.`);
            return null;
        }
        
        const newRole = afterData.role;
        const oldRole = beforeData?.role;

        // Only update claims if the role has actually changed or if it's a new document.
        if (newRole === oldRole) {
            logger.log(`Role for user ${userId} has not changed. No action taken.`);
            return null;
        }

        if (typeof newRole !== "string" || !newRole) {
            logger.log(`No valid role found for user ${userId}.`);
            return null;
        }

        try {
            await getAuth().setCustomUserClaims(userId, { role: newRole });
            logger.log(`Custom claim 'role: ${newRole}' set for user ${userId}.`);
        } catch (error) {
            logger.error(`Error setting custom claim for user ${userId}:`, error);
        }
        
        return null;
    });
