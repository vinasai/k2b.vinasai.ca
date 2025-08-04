const express = require("express");
const {
  login,
  getMe,
  refresh,
  logout,
} = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Login route
router.post("/login", login);

// Refresh token route
router.post("/refresh", refresh);

// Get current user
router.get("/me", protect, getMe);

// logut
router.post("/logout", protect, logout);

module.exports = router;
