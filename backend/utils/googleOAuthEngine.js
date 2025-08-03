const fs = require("fs").promises;
const path = require("path");
const { google } = require("googleapis");

const CREDENTIALS_PATH = path.join(process.cwd(), "credentials.json");
const TOKEN_PATH = path.join(process.cwd(), "token.json");
const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

/**
 * Create a new OAuth2 client with the credentials saved in credentials.json.
 * @returns {Promise<import('google-auth-library').OAuth2Client>}
 */
async function getOAuth2Client() {
  try {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const credentials = JSON.parse(content);
    const { client_secret, client_id, redirect_uris } =
      credentials.web || credentials.installed;

    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    try {
      const token = await fs.readFile(TOKEN_PATH);
      oAuth2Client.setCredentials(JSON.parse(token));
    } catch (err) {
      // No token found. The client is not yet authorized.
    }
    return oAuth2Client;
  } catch (error) {
    console.error("Error loading client credentials:", error);
    throw new Error(
      `Google OAuth credentials file not found or invalid at ${CREDENTIALS_PATH}. ` +
        `Please follow the setup instructions in GOOGLE_SHEETS_SETUP.md.`
    );
  }
}

/**
 * Generate a URL that asks for permissions.
 * @returns {Promise<string>}
 */
async function generateAuthUrl() {
  const oAuth2Client = await getOAuth2Client();
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
  return authUrl;
}

/**
 * Get and store new authentication tokens.
 * @param {string} code The authorization code from the callback.
 * @returns {Promise<void>}
 */
async function saveToken(code) {
  const oAuth2Client = await getOAuth2Client();
  const { tokens } = await oAuth2Client.getToken(code);
  await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
}

/**
 * Returns an authorized OAuth2 client. If the client is not authorized,
 * it returns null, signaling that the authorization flow needs to be initiated.
 * @returns {Promise<import('google-auth-library').OAuth2Client | null>}
 */
async function authorize() {
  const client = await getOAuth2Client();

  // Check if we have credentials and if the access token is still valid
  if (client.credentials && client.credentials.access_token) {
    // Check if token is expired
    if (
      client.credentials.expiry_date &&
      client.credentials.expiry_date <= Date.now()
    ) {
      console.log("Google token expired, attempting refresh...");
      try {
        const { credentials } = await client.refreshAccessToken();
        client.setCredentials(credentials);

        // Save the refreshed token
        await fs.writeFile(TOKEN_PATH, JSON.stringify(credentials));
        console.log("Google token refreshed successfully");
        return client;
      } catch (err) {
        console.log("Failed to refresh Google token:", err.message);
        // Delete the invalid token file
        try {
          await fs.unlink(TOKEN_PATH);
        } catch (unlinkErr) {
          // File might not exist
        }
        return null;
      }
    }
    return client;
  }
  return null;
}

module.exports = {
  generateAuthUrl,
  saveToken,
  authorize,
};
