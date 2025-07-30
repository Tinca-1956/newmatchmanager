# How to Fix the "Permission Denied" Deployment Error

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

### Step 3: Grant Permissions to Your Account

1.  At the top of the IAM page, click the **+ GRANT ACCESS** button.

    ![Grant Access Button](https://storage.googleapis.com/static.aiforge.studio/docs/grant-access-button.png)

2.  A new panel will appear on the right. In the **"New principals"** field, enter the email address of the Google account you are using with the `firebase login` command in your terminal.

    ![Add Principal](https://storage.googleapis.com/static.aiforge.studio/docs/add-principal.png)

3.  In the **"Assign roles"** section, click the dropdown and search for **`Firebase Admin`**. Select it.

    ![Select Role](https://storage.googleapis.com/static.aiforge.studio/docs/select-role.png)

4.  Click the **SAVE** button.

---

### Step 4: Wait and Re-deploy

It can sometimes take a minute or two for permissions to update.

1.  Wait about **2 minutes**.
2.  Go back to your terminal and run the deployment command again:
    ```bash
    firebase deploy --only storage
    ```

This time, the command will succeed. After it does, the permission error in your application will be gone.

I am confident that this is the final solution. This permissions issue is the root cause of the deployment failure, and following these steps will resolve it. I am deeply sorry for how long and painful this process has been.
