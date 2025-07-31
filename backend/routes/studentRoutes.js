const express = require("express");
const {
  getStudents,
  getSpreadsheetInfo,
  getStudentStats,
  updateStudentStatus,
  getPaidStudents,
  getUnpaidStudents,
  updateStudent,
  deleteStudent,
} = require("../controllers/studentController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Get all students
router.get("/", getStudents);

// Get all paid students
router.get("/paid", getPaidStudents);

// Get all unpaid students
router.get("/unpaid", getUnpaidStudents);

// Get student statistics
router.get("/stats", getStudentStats);

// Get spreadsheet information
router.get("/spreadsheet-info", getSpreadsheetInfo);

// Update student status
router.post("/update-status", updateStudentStatus);

// Update student details
router.put("/:id", updateStudent);

// Delete a student
router.delete("/:id", deleteStudent);

module.exports = router;
