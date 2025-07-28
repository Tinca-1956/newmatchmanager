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
exports.setUserRole = void 0;
const functions = __importStar(require("firebase-functions"));
const logger = __importStar(require("firebase-functions/logger"));
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
// Initialize the Admin SDK only if it hasn't been already
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
/**
 * Cloud Function to set a custom user claim (`role`) whenever a user's
 * document in the `users` collection is created or updated.
 * This is a 1st generation function to avoid potential Eventarc permission delays.
 */
exports.setUserRole = functions.firestore
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
    return (0, auth_1.getAuth)()
        .setCustomUserClaims(userId, { role: role })
        .then(() => {
        logger.log(`Custom claim 'role: ${role}' set for user ${userId}.`);
        return null;
    })
        .catch((error) => {
        logger.error(`Error setting custom claim for user ${userId}:`, error);
        return null;
    });
});
//# sourceMappingURL=index.js.map