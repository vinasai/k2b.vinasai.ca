const express = require("express");
const router = express.Router();
const { generatePaymentReport } = require("../controllers/reportController");
const { protect } = require("../middleware/auth");

// Generate payment report for a specific class and month
router.post("/generate", protect, generatePaymentReport);

module.exports = router;
