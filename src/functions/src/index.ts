
import * as logger from "firebase-functions/logger";
import {initializeApp, getApps} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {onDocumentWritten} from "firebase-functions/v2/firestore";

// Initialize the Admin SDK only if it hasn't been already
if (getApps().length === 0) {
  initializeApp();
}

/**
 * 2nd Gen Cloud Function to set a custom user claim (`role`) whenever a user's
 * document in the `users` collection is created or updated.
 */
export const setUserRole = onDocumentWritten("users/{userId}", async (event) => {
  const userId = event.params.userId;
  
  const afterData = event.data?.after.data();
  const beforeData = event.data?.before.data();

  // If the document is deleted, do nothing.
  if (!afterData) {
    logger.log(`User document for ${userId} deleted. No action taken.`);
    return;
  }

  const role = afterData.role;
  const oldRole = beforeData?.role;

  // Only update claims if the role has actually changed or is being set for the first time.
  if (role === oldRole) {
      logger.log(`Role for user ${userId} has not changed. No action taken.`);
      return;
  }

  // If the role is missing or not a string, do nothing.
  if (typeof role !== "string" || !role) {
    logger.log(`No valid role found for user ${userId}.`);
    return;
  }

  try {
    // Set the custom claim on the user's authentication token.
    await getAuth().setCustomUserClaims(userId, {role: role});
    logger.log(`Custom claim 'role: ${role}' set for user ${userId}.`);
  } catch (error) {
    logger.error(`Error setting custom claim for user ${userId}:`, error);
  }
});
