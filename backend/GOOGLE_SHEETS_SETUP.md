# Google Sheets API Setup Guide

This guide will help you set up Google Sheets API integration for the student payment management system.

## Prerequisites

1. A Google account
2. A Google Sheets document with student payment data
3. Access to Google Cloud Console

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note down your project ID

## Step 2: Enable Google Sheets API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google Sheets API"
3. Click on it and enable the API

## Step 3: Create OAuth2 Credentials

1.  Go to "APIs & Services" > "Credentials".
2.  Click "Create Credentials" > "OAuth client ID".
3.  For **Application type**, choose **"Web application"**.
4.  Give it a name (e.g., "Student Payment System - Web").

### Step 4: Configure Redirect URIs

1.  Under **"Authorized redirect URIs"**, click **"ADD URI"**.
2.  Enter the callback URL for your backend server. By default, this is:

    ```
    http://localhost:5000/api/google-auth/callback
    ```

    > **Important**: The port number (`5000` in the example) **must** match the port your backend Express server is running on. If your server runs on a different port, update it here accordingly.

3.  Click **"Create"**.

### Step 5: Download Credentials

1.  After creating the OAuth client, a dialog will show your Client ID and Client Secret. Click **"DOWNLOAD JSON"**.
2.  Rename this file to `credentials.json`.
3.  Place it in the `backend` directory of your project. This file contains your `redirect_uris`, so it's critical that you download it _after_ setting the correct URI.

## Step 6: Set Up Your Spreadsheet

Your Google Sheets should have the following columns in the first row:

- Column A: Student Name
- Column B: Parent Phone
- Column C: Payment Status (e.g., "PAID", "NOT PAID")
- Column D: Last Reminder Sent Date

## Step 7: Configure Environment Variables

1. Copy your Google Sheets URL
2. Extract the spreadsheet ID from the URL (the long string between `/d/` and `/edit`)
3. Add it to your `.env` file:

```
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here
```

## Step 8: Test the Connection

1. Start your backend server
2. The first time you access the Google Sheets endpoints, you'll be prompted to authorize the application
3. Follow the OAuth flow in your browser
4. Once authorized, a `token.json` file will be created to store your refresh token

## File Structure

Your backend directory should look like this:

```
backend/
├── credentials.json (Your OAuth2 credentials - DO NOT COMMIT TO GIT)
├── token.json (Auto-generated after first authorization - DO NOT COMMIT TO GIT)
├── .env (Contains your spreadsheet ID)
└── ... other files
```

## Security Notes

- **NEVER** commit `credentials.json` or `token.json` to version control
- These files are already included in `.gitignore`
- Keep your credentials secure and don't share them

## Troubleshooting

### Error: "credentials.json not found"

- Make sure you've downloaded and placed the credentials file in the correct location
- Verify the file is named exactly `credentials.json`

### Error: "Access blocked: redirect_uri_mismatch"

- This is the most common error. It means the `redirect_uri` in your `credentials.json` does not match what is configured in the Google Cloud Console.
- Go back to your OAuth client in Google Cloud Console.
- Ensure the **Authorized redirect URI** is set _exactly_ to `http://YOUR_HOST:PORT/api/google-auth/callback`.
- For local development, this will be something like `http://localhost:5000/api/google-auth/callback`.
- **After correcting the URI, you must re-download the `credentials.json` file** and replace the old one in your project.
- Wait a few minutes for changes to take effect.

### Error: "Insufficient permissions"

- Make sure you've enabled the Google Sheets API
- Verify your OAuth consent screen is properly configured
- Check that your Google account has access to the spreadsheet

### Error: "Spreadsheet not found"

- Verify the spreadsheet ID in your environment variables
- Make sure the spreadsheet is accessible by your Google account
- Check that the spreadsheet isn't private or restricted

## Sample credentials.json structure

```json
{
  "installed": {
    "client_id": "your-client-id.apps.googleusercontent.com",
    "project_id": "your-project-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "your-client-secret",
    "redirect_uris": ["http://localhost"]
  }
}
```

Replace the placeholder values with your actual credentials from Google Cloud Console.
