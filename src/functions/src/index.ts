
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import {initializeApp, getApps} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import type { User } from "./types";

// Initialize the Admin SDK only if it hasn't been already
if (getApps().length === 0) {
  initializeApp();
}

/**
 * A 2nd Generation Cloud Function to set a custom user claim (`role`) 
 * whenever a user's document in the `users` collection is created or updated.
 */
export const setUserRole = onDocumentWritten("users/{userId}", async (event) => {
    const userId = event.params.userId;
    
    // If the document is deleted, do nothing.
    if (!event.data?.after.exists) {
        logger.log(`User document for ${userId} deleted. No action taken.`);
        return;
    }

    const afterData = event.data.after.data() as User;
    const beforeData = event.data.before.exists ? event.data.before.data() as User : undefined;
    
    const newRole = afterData.role;
    const oldRole = beforeData?.role;

    // Only update claims if the role has actually changed OR if this is a new document.
    if (newRole === oldRole && event.data.before.exists) {
        logger.log(`Role for user ${userId} has not changed. No action taken.`);
        return;
    }

    if (typeof newRole !== "string" || !newRole) {
        logger.log(`No valid role found for user ${userId}. Setting no custom claims.`);
        // Ensure no claims are set if the role is invalid
        await getAuth().setCustomUserClaims(userId, { role: null });
        return;
    }

    try {
        logger.log(`Attempting to set role claim for ${userId} to '${newRole}'`);
        await getAuth().setCustomUserClaims(userId, { role: newRole });
        logger.log(`Successfully set custom claim 'role: ${newRole}' for user ${userId}.`);
    } catch (error) {
        logger.error(`Error setting custom claim for user ${userId}:`, error);
    }
});

// Export the image proxy function as well
export { getClubLogo } from './image-proxy';
