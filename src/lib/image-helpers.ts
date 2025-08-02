
/**
 * Fetches an image from a URL and converts it to a Base64 data URI.
 * This is necessary to bypass CORS issues when embedding images from
 * Firebase Storage into a client-side generated PDF.
 * @param imageUrl The URL of the image to fetch.
 * @returns A promise that resolves to the Base64 data URI of the image.
 */
export const getBase64ImageFromUrl = async (imageUrl: string): Promise<string> => {
  try {
    // Using a CORS proxy for development or if direct fetch is blocked.
    // In a production environment, you should configure CORS on your Firebase Storage bucket.
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to read image as Base64.'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting image to Base64:", error);
    // Return a transparent pixel as a fallback to prevent PDF generation from failing
    return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  }
};
