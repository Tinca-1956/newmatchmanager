# Fixing Firebase Deployment Permission Errors

You've encountered `403 Permission Denied` or `Failed to list functions` errors when trying to deploy. This guide provides the definitive steps to fix the underlying permission issues in your Google Cloud project.

---

### Step 1: Go to the IAM Page

*   Open the IAM & Admin page for your project: [https://console.cloud.google.com/iam-admin/iam?project=newmatchmanager](https://console.cloud.google.com/iam-admin/iam?project=newmatchmanager)

### Step 2: CRITICAL - Show All Service Accounts

*   On the right side of the page, find the checkbox labeled **"Include Google-provided role grants"**.
*   **CLICK THIS CHECKBOX TO CHECK IT.** This is the most important step and will make the hidden service accounts appear.

### Step 3: Grant Permissions to the Cloud Build Service Account

*   After checking the box, look for the principal named **`Legacy Cloud Build Service Account`**. The email will look like `[PROJECT_NUMBER]@cloudbuild.gserviceaccount.com`.
*   Click the **pencil icon** next to it to edit its roles.
*   Click **"+ Add Another Role"**.
*   Search for and add the **`Cloud Build Service Agent`** role.
*   Click **"+ Add Another Role"** again.
*   Search for and add the **`Firebase Admin`** role. This is a broad role that includes all necessary permissions to manage Firebase resources, which will resolve the function listing and deployment errors.
*   Click **"Save"**.

### Step 4: Re-run the Deployment

Now that the permissions are correctly configured, return to your terminal and run the deployment command again.

```bash
firebase deploy --only functions
```

This should now succeed. I am deeply sorry for the frustration and the incorrect instructions that led to this point.
