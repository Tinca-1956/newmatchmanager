
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
 * 1st Gen Cloud Function to set a custom user claim (`role`, `primaryClubId`) 
 * whenever a user's document in the `users` collection is created or updated.
 * 1st Gen is used here for its reliability and directness in setting claims,
 * which is critical for the initial user setup and subsequent permission changes.
 */
export const setUserRoleAndClub = functions.firestore
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
        const newClubId = afterData.primaryClubId;
        const oldClubId = beforeData?.primaryClubId;

        // Only update claims if the role or club has actually changed.
        if (newRole === oldRole && newClubId === oldClubId) {
            logger.log(`Role and club for user ${userId} have not changed. No action taken.`);
            return null;
        }

        if (typeof newRole !== "string" || !newRole) {
            logger.log(`No valid role found for user ${userId}.`);
            // We can still proceed if only the club ID is changing.
        }

        const claimsToSet: { [key: string]: any } = {};
        if (newRole) {
            claimsToSet.role = newRole;
        }
        if (newClubId) {
            claimsToSet.primaryClubId = newClubId;
        }

        if (Object.keys(claimsToSet).length === 0) {
            logger.log(`No new claims to set for user ${userId}.`);
            return null;
        }

        try {
            await getAuth().setCustomUserClaims(userId, claimsToSet);
            logger.log(`Custom claims set for user ${userId}:`, claimsToSet);
        } catch (error) {
            logger.error(`Error setting custom claims for user ${userId}:`, error);
        }
        
        return null;
    });
