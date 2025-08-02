# Fixing Firebase Deployment Permission Errors

You've encountered a `403 Permission Denied` error when trying to deploy, even though your user account has the "Owner" role. This is a common issue on new Firebase projects and is almost always caused by one of two things: the project's billing is not enabled, or the required APIs are not activated manually.

The Firebase Command Line Interface (CLI) tries to do this for you, but it can fail if a billing account isn't linked or if there are other permission nuances. Here is the definitive guide to fix this by setting it up manually in the web console.

---

### Step 1: Upgrade to the Blaze (Pay-as-you-go) Plan

Even if you plan to stay within the free tier, linking a billing account is required to enable all of Firebase's features. The "Blaze" plan is pay-as-you-go, and you will not be charged unless you exceed the generous free limits.

1.  Go to the Firebase Console: [https://console.firebase.google.com/](https://console.firebase.google.com/)
2.  Select your project (`newmatchmanager`).
3.  In the bottom-left of the navigation menu, you will see a `Spark` plan indicator. Click on it, then click **"Upgrade"**.
4.  Follow the on-screen instructions to select or create a billing account. This usually involves providing a credit card, but again, you won't be charged unless you go beyond the free tier.

Once complete, the bottom-left corner will now show the `Blaze` plan.

### Step 2: Manually Enable the Required APIs

Now that billing is enabled, we can activate the necessary APIs. The deployment is failing because specific services are not enabled. Click each link below for your project and click the **"Enable"** button if it is not already active.

1.  **Cloud Storage API** (For `firebase deploy --only storage`)
    *   **Link:** [https://console.cloud.google.com/apis/library/firebasestorage.googleapis.com?project=newmatchmanager](https://console.cloud.google.com/apis/library/firebasestorage.googleapis.com?project=newmatchmanager)
    *   **Purpose:** Allows managing Firebase Storage rules.

2.  **Cloud Functions API** (For `firebase deploy --only functions`)
    *   **Link:** [https://console.cloud.google.com/apis/library/cloudfunctions.googleapis.com?project=newmatchmanager](https://console.cloud.google.com/apis/library/cloudfunctions.googleapis.com?project=newmatchmanager)
    *   **Purpose:** Allows deploying and managing Cloud Functions.

3.  **Artifact Registry API** (A dependency for Cloud Functions)
    *   **Link:** [https://console.cloud.google.com/apis/library/artifactregistry.googleapis.com?project=newmatchmanager](https://console.cloud.google.com/apis/library/artifactregistry.googleapis.com?project=newmatchmanager)
    *   **Purpose:** Stores the container images for your deployed functions.

4.  **Cloud Build API** (A dependency for Cloud Functions)
    *   **Link:** [https://console.cloud.google.com/apis/library/cloudbuild.googleapis.com?project=newmatchmanager](https://console.cloud.google.com/apis/library/cloudbuild.googleapis.com?project=newmatchmanager)
    *   **Purpose:** Compiles and builds your function code on the server.

### Step 3: Re-run the Deployment

Now that the project is correctly configured, return to your terminal and run the deployment command again.

**For the function deployment:**
```bash
firebase deploy --only functions
```

This time, the command should succeed without any permission errors. Once it completes, the app will be able to fetch the logo image correctly.