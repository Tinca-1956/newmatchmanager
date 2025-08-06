/**
 * @fileoverview This file exports the Cloud Functions for the application.
 *
 * This file is the entry point for Firebase Functions and is responsible for
 * exporting all the Cloud Functions that will be deployed.
 *
 * We are using a 2nd generation function for `setUserRole` because it provides
 * more reliable event delivery and better performance characteristics. This function
 * is critical for our security model as it sets custom authentication claims
 * based on a user's role in the Firestore database.
 *
 * The `image-proxy` function is also exported to handle fetching club logos
 * securely and bypassing CORS issues on the client-side.
 */
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import * as logger from "firebase-functions/logger";

// Initialize the Admin SDK if it hasn't been already.
// This is safe to run everywhere, as it checks for existing apps.
if (getApps().length === 0) {
  initializeApp();
}

/**
 * A 2nd Generation Cloud Function that triggers whenever a document in the 'users'
 * collection is written to (created or updated). It sets a custom claim 'role'
 * on the user's authentication token, which is essential for Firestore security rules.
 */
export const setUserRole = onDocumentWritten('users/{userId}', async (event) => {
    const userId = event.params.userId;

    // For document deletion, there's no 'after' data. We just log it and exit.
    if (!event.data?.after.exists) {
        logger.log(`User document for ${userId} deleted. No custom claim action taken.`);
        return null;
    }

    // Get the new data from the document.
    const userDocument = event.data.after.data();
    
    // **FIX**: Ensure userDocument is not undefined before accessing its properties.
    if (!userDocument) {
        logger.log(`User document data for ${userId} is undefined. No action taken.`);
        return null;
    }

    const newRole = userDocument.role;

    // If the role is missing or invalid, we can't set a claim.
    if (typeof newRole !== 'string' || !newRole) {
        logger.log(`No valid 'role' found for user ${userId}. Claim not set.`);
        return null;
    }

    // Get the user's current custom claims to see if an update is needed.
    const auth = getAuth();
    try {
        const userRecord = await auth.getUser(userId);
        const currentRole = userRecord.customClaims?.['role'];

        // Only set the claim if it's different from the current one.
        // This prevents unnecessary updates and function invocations.
        if (newRole === currentRole) {
            logger.log(`Role for user ${userId} is already '${newRole}'. No update needed.`);
            return null;
        }

        // Set the new custom claim.
        await auth.setCustomUserClaims(userId, { role: newRole });
        logger.log(`Successfully set custom claim 'role: ${newRole}' for user ${userId}.`);

    } catch (error) {
        logger.error(`Error setting custom claim for user ${userId}:`, error);
    }
    
    return null;
});

// Export the image proxy function as well
export { getClubLogo } from './image-proxy';
