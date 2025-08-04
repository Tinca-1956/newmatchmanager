
import * as functions from "firebase-functions";
import * as logger from "firebase-functions/logger";
import {initializeApp, getApps} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import type { User } from "./types";
import * as cors from "cors";

const corsHandler = cors({origin: true});


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

        // Only update claims if the role has actually changed OR if this is a new document.
        if (newRole === oldRole && change.before.exists) {
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


/**
 * A callable Cloud Function to check the email verification status of a user.
 * This is required because client-side code cannot access this property for other users.
 * The function is protected by checking if the caller is an authenticated admin.
 */
export const checkEmailVerification = functions.https.onCall(async (data, context) => {
    // Ensure the user calling the function is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    // Ensure the authenticated user has an Admin role in their custom claims.
    const callerClaims = context.auth.token;
    const callerRole = callerClaims.role;
    if (callerRole !== 'Site Admin' && callerRole !== 'Club Admin') {
        throw new functions.https.HttpsError('permission-denied', 'You must be an admin to perform this action.');
    }

    const uids: string[] = data.uids;
    if (!Array.isArray(uids) || uids.length === 0 || uids.length > 100) {
        throw new functions.https.HttpsError('invalid-argument', 'Please provide an array of UIDs (up to 100).');
    }

    try {
        const userRecords = await getAuth().getUsers(uids.map(uid => ({ uid })));
        
        const verificationStatus: { [uid: string]: boolean } = {};
        userRecords.users.forEach(user => {
            verificationStatus[user.uid] = user.emailVerified;
        });

        return verificationStatus;

    } catch (error) {
        logger.error("Error fetching user verification status:", error);
        throw new functions.https.HttpsError('internal', 'Unable to retrieve user verification status.');
    }
});
