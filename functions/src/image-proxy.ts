
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import axios from "axios";
import * as cors from "cors";

const corsHandler = cors({ origin: true });

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
export const getClubLogo = functions.https.onRequest(async (request, response) => {
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
            const imageResponse = await axios.get(imageUrl, {
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

        } catch (error) {
            logger.error(`Error fetching logo for club ${clubId}:`, error);
            if (axios.isAxiosError(error) && error.response?.status === 403) {
                 response.status(404).send("Image not found or access denied in Storage.");
            } else {
                 response.status(500).send("Internal Server Error.");
            }
        }
    });
});
