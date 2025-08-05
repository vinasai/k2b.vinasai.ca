const { generateAuthUrl, saveToken } = require("../utils/googleOAuthEngine");

// @desc    Get Google Authentication URL
// @route   GET /api/google-auth/url
// @access  Public
exports.getGoogleAuthUrl = async (req, res) => {
  try {
    const url = await generateAuthUrl();
    res.status(200).json({ success: true, url });
  } catch (error) {
    console.error("Error generating Google auth URL:", error);
    res.status(500).json({
      success: false,
      message: "Error generating Google authentication URL.",
      error: error.message,
    });
  }
};

// @desc    Handle Google Authentication callback
// @route   GET /api/google-auth/callback
// @access  Public
exports.googleAuthCallback = async (req, res) => {
  const { code } = req.query;

  try {
    if (!code) {
      return res
        .status(400)
        .json({ success: false, message: "Authorization code is missing." });
    }

    await saveToken(code);

    // Redirect user to the frontend dashboard after successful authentication
    const frontendUrl = process.env.FRONTEND_URL;
    res.redirect(`${frontendUrl}?google_auth=success`);
  } catch (error) {
    console.error("Error during Google Auth callback:", error);
    // Redirect to frontend with an error message
    const frontendUrl = process.env.FRONTEND_URL;
    res.redirect(
      `${frontendUrl}/login?google_auth_error=${encodeURIComponent(
        error.message
      )}`
    );
  }
};
