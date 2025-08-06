md
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

1.  **Cloud Functions API** (A dependency for `setUserRole` function)
    *   **Link:** [https://console.cloud.google.com/apis/library/cloudfunctions.googleapis.com?project=newmatchmanager](https://console.cloud.google.com/apis/library/cloudfunctions.googleapis.com?project=newmatchmanager)
    *   **Purpose:** Allows deploying and managing Cloud Functions.

2.  **Cloud Build API** (A dependency for Cloud Functions & App Hosting)
    *   **Link:** [https://console.cloud.google.com/apis/library/cloudbuild.googleapis.com?project=newmatchmanager](https://console.cloud.google.com/apis/library/cloudbuild.googleapis.com?project=newmatchmanager)
    *   **Purpose:** Compiles and builds your code on the server. **Enabling this API will create the `...@cloudbuild.gserviceaccount.com` service account we will need in the next step.**

3.  **Artifact Registry API** (A dependency for Cloud Functions & App Hosting)
    *   **Link:** [https://console.cloud.google.com/apis/library/artifactregistry.googleapis.com?project=newmatchmanager](https://console.cloud.google.com/apis/library/artifactregistry.googleapis.com?project=newmatchmanager)
    *   **Purpose:** Stores the container images for your deployed services.

4.  **Cloud Storage API** (For `firebase deploy --only storage` and image uploads)
    *   **Link:** [https://console.cloud.google.com/apis/library/firebasestorage.googleapis.com?project=newmatchmanager](https://console.cloud.google.com/apis/library/firebasestorage.googleapis.com?project=newmatchmanager)
    *   **Purpose:** Allows managing Firebase Storage rules and files.
    
5.  **Firebase Extensions API** (Required for the latest function deployments)
    *   **Link:** [https://console.cloud.google.com/apis/library/firebaseextensions.googleapis.com?project=newmatchmanager](https://console.cloud.google.com/apis/library/firebaseextensions.googleapis.com?project=newmatchmanager)
    *   **Purpose:** Allows functions to interact with other Firebase services. **This is the step that makes the `Firebase Extensions API Service Agent` role appear.**

### Step 3: Grant Permissions to the Service Accounts

This is the most common point of failure. The automated "robots" that build and deploy your code need explicit permission to act on your behalf.

1.  **Go to the IAM Page:**
    *   Open the IAM & Admin page for your project: [https://console.cloud.google.com/iam-admin/iam?project=newmatchmanager](https://console.cloud.google.com/iam-admin/iam?project=newmatchmanager)
    *   On this page, click the checkbox for **"Include Google-provided role grants"** on the right side. This will ensure you see all service accounts.

2.  **Grant Cloud Build Permissions:**
    *   Look for the principal named **`Legacy Cloud Build Service Account`**. The email will look like `[PROJECT_NUMBER]@cloudbuild.gserviceaccount.com`.
    *   **If you do not see this principal**, it's because the Cloud Build API was just enabled. Please try to run the function deployment command from your terminal first (`firebase deploy --only functions`). The command will likely fail, but this action will force Google Cloud to create the service account. Then, refresh the IAM page.
    *   Once you see it, click the pencil icon next to it to edit its roles.
    *   Click **"+ Add Another Role"**.
    *   Search for and add the **`Cloud Build Service Agent`** role. This contains all the necessary permissions for building.
    *   Click **"+ Add Another Role"** again.
    *   Search for and add the **`Firebase Extensions API Service Agent`** role. This is required for deployment and should now be visible.
    *   Click **"Save"**.

3.  **Grant App Hosting Permissions:**
    *   Look for the principal named **`App Hosting Service Account`** that ends in `@gcp-sa-firebaseapphosting.iam.gserviceaccount.com`.
    *   Click the pencil icon to edit its roles.
    *   Click **"+ Add Another Role"**.
    *   Search for and add the **`Firebase App Hosting Admin`** role.
    *   Click **"+ Add Another Role"** again.
    *   Search for and add the **`Cloud Build Editor`** role.
    *   Click **"Save"**.

### Step 4: Re-run the Deployment

Now that the project is correctly configured, return to your terminal and run the deployment command again. This time, it should succeed.

```bash
firebase deploy --only functions
```

Once this command completes successfully, your `setUserRole` function will be active and working, which is the foundation for fixing all other permission issues in the app itself.
