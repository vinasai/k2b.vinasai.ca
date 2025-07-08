const express = require("express");
const { login, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Login route
router.post("/login", login);

// Get current user
router.get("/me", protect, getMe);

module.exports = router;
