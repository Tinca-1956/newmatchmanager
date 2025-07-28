
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import {initializeApp, getApps} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";

// Initialize the Admin SDK only if it hasn't been already
if (getApps().length === 0) {
  initializeApp();
}

/**
 * Cloud Function to set a custom user claim (`role`) whenever a user's
 * document in the `users` collection is created or updated.
 * This is a 1st generation function to avoid potential Eventarc permission delays.
 */
export const setUserRole = functions.firestore
  .document("users/{userId}")
  .onWrite((change, context) => {
    const userId = context.params.userId;
    const afterData = change.after.data();

    // If there's no data after the event (e.g., document deletion), do nothing.
    if (!afterData) {
      logger.log(`User document for ${userId} deleted. No action taken.`);
      return null;
    }

    const role = afterData.role;

    // If the role is missing or not a string, do nothing.
    if (typeof role !== "string" || !role) {
      logger.log(`No valid role found for user ${userId}.`);
      return null;
    }

    // Set the custom claim on the user's authentication token.
    return getAuth()
      .setCustomUserClaims(userId, {role: role})
      .then(() => {
        logger.log(`Custom claim 'role: ${role}' set for user ${userId}.`);
        return null;
      })
      .catch((error) => {
        logger.error(`Error setting custom claim for user ${userId}:`, error);
        return null;
      });
  });
