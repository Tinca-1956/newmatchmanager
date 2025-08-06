"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClubLogo = exports.setUserRole = void 0;
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
const firestore_1 = require("firebase-functions/v2/firestore");
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const logger = __importStar(require("firebase-functions/logger"));
// Initialize the Admin SDK if it hasn't been already.
// This is safe to run everywhere, as it checks for existing apps.
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
/**
 * A 2nd Generation Cloud Function that triggers whenever a document in the 'users'
 * collection is written to (created or updated). It sets a custom claim 'role'
 * on the user's authentication token, which is essential for Firestore security rules.
 */
exports.setUserRole = (0, firestore_1.onDocumentWritten)('users/{userId}', async (event) => {
    const userId = event.params.userId;
    // For document deletion, there's no 'after' data. We just log it and exit.
    if (!event.data?.after.exists) {
        logger.log(`User document for ${userId} deleted. No custom claim action taken.`);
        return null;
    }
    // Get the new data from the document.
    const userDocument = event.data.after.data();
    const newRole = userDocument.role;
    // If the role is missing or invalid, we can't set a claim.
    if (typeof newRole !== 'string' || !newRole) {
        logger.log(`No valid 'role' found for user ${userId}. Claim not set.`);
        return null;
    }
    // Get the user's current custom claims to see if an update is needed.
    const auth = (0, auth_1.getAuth)();
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
    }
    catch (error) {
        logger.error(`Error setting custom claim for user ${userId}:`, error);
    }
    return null;
});
// Export the image proxy function as well
var image_proxy_1 = require("./image-proxy");
Object.defineProperty(exports, "getClubLogo", { enumerable: true, get: function () { return image_proxy_1.getClubLogo; } });
//# sourceMappingURL=index.js.map