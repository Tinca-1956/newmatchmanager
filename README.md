# newmatchmanager

Last attempt at a match management app

## Development

To run the application locally with Firebase services, you'll need to use the Firebase Emulator Suite.

1.  **Start the emulators:**
    ```bash
    firebase emulators:start
    ```

2.  **Start the Next.js development server:**
    ```bash
    npm run dev
    ```

The application will be available at `http://localhost:3000`.

## Deployment

This application is configured for deployment to **Firebase App Hosting**.

### Production Deployment

To deploy the application to your live Firebase project, run the following command:

```bash
firebase deploy --only hosting
```

### Custom Domains

When connecting a custom domain to your Firebase App Hosting backend, please be aware of the following:

1.  **Verification:** You will first be asked to add a `TXT` record to your DNS configuration to verify that you own the domain.
2.  **'A' Records:** After verification is complete, Firebase will provide you with **two (2) separate IP addresses**. You must add both of these as 'A' records in your domain registrar's DNS settings for your site to become fully active and available globally. It is crucial that both records are present.

DNS changes can take anywhere from a few minutes to 48 hours to propagate across the internet.