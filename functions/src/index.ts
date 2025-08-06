/**
 * @fileoverview This file exports the Cloud Functions for the application.
 *
 * This file is the entry point for Firebase Functions and is responsible for
 * exporting all the Cloud Functions that will be deployed.
 *
 * We are using a 1st generation function for `setUserRole` because it is has
 * simpler permission requirements for deployment, which will resolve the
 * `403` errors related to the Firebase Extensions API. This function is critical
 * for our security model as it sets custom authentication claims based on a
 * user's role in the Firestore database.
 *
 * The `image-proxy` function is also exported to handle fetching club logos
 * securely and bypassing CORS issues on the client-side.
 */
import * as functions from 'firebase-functions';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import * as logger from 'firebase-functions/logger';
import type { User } from './types';

// Initialize the Admin SDK if it hasn't been already.
if (getApps().length === 0) {
  initializeApp();
}

/**
 * A 1st Generation Cloud Function that triggers whenever a document in the 'users'
 * collection is written to. It sets a custom claim 'role' on the user's
 * authentication token, which is essential for Firestore security rules.
 */
export const setUserRole = functions.firestore
  .document('users/{userId}')
  .onWrite(async (change, context) => {
    const userId = context.params.userId;

    // For document deletion, there's no 'after' data. We just log it and exit.
    if (!change.after.exists) {
      logger.log(`User document for ${userId} deleted. No custom claim action taken.`);
      return null;
    }

    // Get the new data from the document.
    const userDocument = change.after.data() as User;
    const newRole = userDocument.role;

    // If the role is missing or invalid, we can't set a claim.
    if (typeof newRole !== 'string' || !newRole) {
      logger.log(`No valid 'role' found for user ${userId}. Claim not set.`);
      return null;
    }
    
    const beforeData = change.before.data() as User | undefined;
    const oldRole = beforeData?.role;
    
    // Only set the claim if it's different from the current one to prevent unnecessary updates.
    if (newRole === oldRole) {
        return null;
    }

    // Set the new custom claim.
    try {
        await getAuth().setCustomUserClaims(userId, { role: newRole });
        logger.log(`Successfully set custom claim 'role: ${newRole}' for user ${userId}.`);
    } catch (error) {
        logger.error(`Error setting custom claim for user ${userId}:`, error);
    }
    
    return null;
  });

// Export the image proxy function as well
export { getClubLogo } from './image-proxy';