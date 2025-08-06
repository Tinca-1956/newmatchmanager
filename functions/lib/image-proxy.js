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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClubLogo = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const axios_1 = __importDefault(require("axios"));
const cors_1 = __importDefault(require("cors"));
const corsHandler = (0, cors_1.default)({ origin: true });
// Ensure app is initialized
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const db = admin.firestore();
/**
 * An HTTP-triggered function that fetches a club's logo URL from Firestore,
 * downloads the image, and returns it as a Base64 data URI.
 * This acts as a secure proxy to bypass browser CORS restrictions.
 */
exports.getClubLogo = functions.https.onRequest(async (request, response) => {
    corsHandler(request, response, async () => {
        const { clubId } = request.query;
        if (typeof clubId !== 'string' || !clubId) {
            response.status(400).send("Missing or invalid 'clubId' query parameter.");
            return;
        }
        try {
            // 1. Get the club document from Firestore
            const clubDocRef = db.collection('clubs').doc(clubId);
            const clubDoc = await clubDocRef.get();
            if (!clubDoc.exists) {
                response.status(404).send("Club not found.");
                return;
            }
            const clubData = clubDoc.data();
            const imageUrl = clubData?.imageUrl;
            if (!imageUrl) {
                response.status(404).send("Club does not have a logo URL.");
                return;
            }
            // 2. Fetch the image from the URL
            const imageResponse = await axios_1.default.get(imageUrl, {
                responseType: 'arraybuffer',
            });
            // 3. Convert to Base64 and create a data URI
            const imageBuffer = Buffer.from(imageResponse.data, 'binary');
            const base64Image = imageBuffer.toString('base64');
            const contentType = imageResponse.headers['content-type'] || 'image/png';
            const dataUri = `data:${contentType};base64,${base64Image}`;
            // 4. Send the data URI in the response
            response.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
            response.status(200).json({ dataUri });
        }
        catch (error) {
            logger.error(`Error fetching logo for club ${clubId}:`, error);
            if (axios_1.default.isAxiosError(error) && error.response?.status === 403) {
                response.status(404).send("Image not found or access denied in Storage.");
            }
            else {
                response.status(500).send("Internal Server Error.");
            }
        }
    });
});
//# sourceMappingURL=image-proxy.js.map