# How to Fix the "Permission Denied" DeploymentError

This guide will walk you through the steps to resolve the `HTTP Error: 403, Project not found or permission denied` error you are seeing when running `firebase deploy`.

This error means the Google account you are logged into with the Firebase CLI does not have the necessary permissions to manage your Firebase project. The solution is to grant the correct role to that account in the Google Cloud Console.

---

### Step 1: Find Your Google Cloud Project ID

Your Firebase project is also a Google Cloud project. We need its unique ID.

1.  Go to the **Firebase Console**: [https://console.firebase.google.com/](https://console.firebase.google.com/)
2.  Select your project, `new-match-manager`.
3.  Click the **gear icon** next to "Project Overview" and select **Project settings**.
4.  Under the "General" tab, you will see your **Project ID**. It should be `new-match-manager`.

![Find Project ID](https://storage.googleapis.com/static.aiforge.studio/docs/find-project-id.png)

---

### Step 2: Open the IAM & Admin Page in Google Cloud Console

1.  Go to the **Google Cloud Console IAM Page**. You can use this direct link, which will pre-fill your project ID if you are logged into the correct Google account:
    [https://console.cloud.google.com/iam-admin/iam?project=new-match-manager](https://console.cloud.google.com/iam-admin/iam?project=new-match-manager)

2.  Ensure the project selected at the top of the page is your `new-match-manager` project.

---

### Step 3: Find Your User and Grant "Owner" Role

You will see a list of "Principals" (users, emails, and service accounts). You need to find your email address in this list and give it the `Owner` role.

1.  **Find your email address** in the "Principal" column.
2.  On the far right side of the row with your email, click the **pencil icon (Edit principal)**.

    ![Edit Principal](https://storage.googleapis.com/static.aiforge.studio/docs/edit-principal.png)

3.  A panel will appear on the right showing your account's "Current roles".
4.  Click the **+ ADD ANOTHER ROLE** button.
5.  In the **"Select a role"** dropdown that appears, search for and select **`Basic`** and then **`Owner`**. The Owner role will grant the necessary permissions.

    ![Select Role](https://storage.googleapis.com/static.aiforge.studio/docs/select-role.png)

6.  Click the **SAVE** button at the bottom.

***Note:*** If you tried to use the "+ GRANT ACCESS" button before and saw a "Principal already exists" error, this is the correct procedure to fix it. That error simply means your user is already in the list and just needs to have its role edited.

---

### Step 4: Wait and Re-deploy

It can sometimes take a minute or two for permissions to update.

1.  Wait about **2 minutes**.
2.  Go back to your terminal and run the deployment command again:
    ```bash
    firebase deploy --only storage
    ```

This time, the command will succeed. After it does, the permission error in your application will be gone.