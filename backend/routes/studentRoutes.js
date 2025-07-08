const express = require("express");
const {
  getStudents,
  getSpreadsheetInfo,
  getStudentStats,
  updateStudentStatus,
} = require("../controllers/studentController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Get all students
router.get("/", getStudents);

// Get student statistics
router.get("/stats", getStudentStats);

// Get spreadsheet information
router.get("/spreadsheet-info", getSpreadsheetInfo);

// Update student status
router.post("/update-status", updateStudentStatus);

module.exports = router;
