const express = require("express");
const router = express.Router();
const {
  getGoogleAuthUrl,
  googleAuthCallback,
} = require("../controllers/googleAuthController");

// Route to get the authentication URL
router.get("/url", getGoogleAuthUrl);

// Route to handle the OAuth2 callback
router.get("/callback", googleAuthCallback);

module.exports = router;
