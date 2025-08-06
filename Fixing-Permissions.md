# Fixing Firebase Deployment Permission Errors

You've encountered `403 Permission Denied` or `Failed Precondition` errors when trying to deploy. This guide provides the definitive steps to fix the underlying permission issues in your Google Cloud project.

---

### Step 1: Upgrade to the Blaze (Pay-as-you-go) Plan

Even if you plan to stay within the free tier, linking a billing account is required to enable all of Firebase's features.

1.  Go to the Firebase Console: [https://console.firebase.google.com/](https://console.firebase.google.com/)
2.  Select your project (`newmatchmanager`).
3.  In the bottom-left of the navigation menu, click the `Spark` plan indicator and click **"Upgrade"**.
4.  Follow the on-screen instructions to select or create a billing account. You will not be charged unless you exceed the free tier limits.

### Step 2: Manually Enable the Required APIs

Now that billing is enabled, activate the necessary APIs by clicking each link below and clicking the **"Enable"** button if it is not already active.

1.  **Cloud Functions API**: [https://console.cloud.google.com/apis/library/cloudfunctions.googleapis.com?project=newmatchmanager](https://console.cloud.google.com/apis/library/cloudfunctions.googleapis.com?project=newmatchmanager)
2.  **Cloud Build API**: [https://console.cloud.google.com/apis/library/cloudbuild.googleapis.com?project=newmatchmanager](https://console.cloud.google.com/apis/library/cloudbuild.googleapis.com?project=newmatchmanager)
3.  **Artifact Registry API**: [https://console.cloud.google.com/apis/library/artifactregistry.googleapis.com?project=newmatchmanager](https://console.cloud.google.com/apis/library/artifactregistry.googleapis.com?project=newmatchmanager)
4.  **Firebase Extensions API**: [https://console.cloud.google.com/apis/library/firebaseextensions.googleapis.com?project=newmatchmanager](https://console.cloud.google.com/apis/library/firebaseextensions.googleapis.com?project=newmatchmanager)

### Step 3: Grant Permissions to the Cloud Build Service Account

This is the most important step.

1.  **Go to the IAM Page:**
    *   Open the IAM & Admin page for your project: [https://console.cloud.google.com/iam-admin/iam?project=newmatchmanager](https://console.cloud.google.com/iam-admin/iam?project=newmatchmanager)

2.  **CRITICAL: Show All Service Accounts:**
    *   On the right side of the page, find the checkbox labeled **"Include Google-provided role grants"**.
    *   **CLICK THIS CHECKBOX TO CHECK IT.** This will make the hidden service accounts appear.

3.  **Grant Cloud Build Permissions:**
    *   After checking the box, look for the principal named **`Legacy Cloud Build Service Account`**. The email will look like `[PROJECT_NUMBER]@cloudbuild.gserviceaccount.com`.
    *   Click the **pencil icon** next to it to edit its roles.
    *   Click **"+ Add Another Role"**.
    *   Search for and add the **`Cloud Build Service Agent`** role.
    *   Click **"+ Add Another Role"** again.
    *   Search for and add the **`Firebase Extensions API Service Agent`** role. (This will be visible now that the API is enabled).
    *   Click **"Save"**.

### Step 4: Re-run the Deployment

Now that the permissions are correctly configured, return to your terminal and run the deployment command again.

```bash
firebase deploy --only functions
```

This should now succeed. I am deeply sorry for the frustration and the incorrect instructions that led to this point.
