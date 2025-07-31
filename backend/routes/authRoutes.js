const express = require("express");
const { login, getMe, refresh } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Login route
router.post("/login", login);

// Refresh token route
router.post("/refresh", refresh);

// Get current user
router.get("/me", protect, getMe);

module.exports = router;
