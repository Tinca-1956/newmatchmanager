# Fixing Firebase Deployment Permission Errors

You've encountered `403 Permission Denied` or `Failed Precondition` errors when trying to deploy, even though your user account has the "Owner" role. This is a common issue on new Firebase projects and is almost always caused by one of two things: the project's billing is not enabled, or the required APIs and service account permissions are not activated manually.

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

3.  **Artifact Registry API** (A dependency for Cloud Functions & App Hosting)
    *   **Link:** [https://console.cloud.google.com/apis/library/artifactregistry.googleapis.com?project=newmatchmanager](https://console.cloud.google.com/apis/library/artifactregistry.googleapis.com?project=newmatchmanager)
    *   **Purpose:** Stores the container images for your deployed services.

4.  **Cloud Build API** (A dependency for Cloud Functions & App Hosting)
    *   **Link:** [https://console.cloud.google.com/apis/library/cloudbuild.googleapis.com?project=newmatchmanager](https://console.cloud.google.com/apis/library/cloudbuild.googleapis.com?project=newmatchmanager)
    *   **Purpose:** Compiles and builds your code on the server.

### Step 3: Grant Permissions to the Cloud Build Service Account

This is the most common point of failure. The automated "robot" that builds your code (the Cloud Build service account) needs explicit permission to act on your behalf.

1.  **Find your Cloud Build Service Account:**
    *   Go to the IAM & Admin page: [https://console.cloud.google.com/iam-admin/iam?project=newmatchmanager](https://console.cloud.google.com/iam-admin/iam?project=newmatchmanager)
    *   Look for a principal (a user/account) that ends in `@cloudbuild.gserviceaccount.com`. It will look like `[PROJECT_NUMBER]@cloudbuild.gserviceaccount.com`.
    *   Copy this full email address.

2.  **Grant the "Cloud Build Service Agent" Role:**
    *   On that same IAM page, click the **"+ Grant Access"** button at the top.
    *   In the "New principals" field, paste the service account email you just copied.
    *   In the "Select a role" dropdown, search for and select **`Cloud Build Service Agent`**. This role contains all the necessary permissions for building and deploying.
    *   Click **"Save"**.

3.  **Grant App Hosting Permissions (if using App Hosting):**
    *   Look for a principal ending in `@gcp-sa-firebaseapphosting.iam.gserviceaccount.com`.
    *   Click the pencil icon to edit its roles.
    *   Click **"+ Add Another Role"**.
    *   Search for and add the **`Firebase App Hosting Admin`** role.
    *   Search for and add the **`Cloud Build Editor`** role.
    *   Click **"Save"**.

### Step 4: Re-run the Deployment

Now that the project is correctly configured, return to your terminal and run the deployment command again.

**For the function deployment:**
```bash
firebase deploy --only functions
```

**For the web app (App Hosting):**
```bash
firebase deploy
```

This time, the command should succeed without any permission errors.
