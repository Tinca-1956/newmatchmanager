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
const functions = __importStar(require("firebase-functions"));
const logger = __importStar(require("firebase-functions/logger"));
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
// Initialize the Admin SDK only if it hasn't been already
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
/**
 * 1st Gen Cloud Function to set a custom user claim (`role`)
 * whenever a user's document in the `users` collection is created or updated.
 */
exports.setUserRole = functions.firestore
    .document("users/{userId}")
    .onWrite(async (change, context) => {
    const userId = context.params.userId;
    const afterData = change.after.data();
    const beforeData = change.before.data();
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
        await (0, auth_1.getAuth)().setCustomUserClaims(userId, { role: newRole });
        logger.log(`Custom claim 'role: ${newRole}' set for user ${userId}.`);
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