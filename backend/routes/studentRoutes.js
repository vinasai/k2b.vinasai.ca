const express = require("express");
const {
  getStudents,
  getStudentStats,
  updateStudentStatus,
  getPaidStudents,
  getUnpaidStudents,
  updateStudent,
  deleteStudent,
  removeFromClass,
} = require("../controllers/studentController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Get all students
router.get("/", protect, getStudents);

// Get all paid students
router.get("/paid", protect, getPaidStudents);

// Get all unpaid students
router.get("/unpaid", protect, getUnpaidStudents);

// Get student statistics
router.get("/stats", protect, getStudentStats);

// Update student status
router.post("/update-status", protect, updateStudentStatus);

// Update student details
router.put("/", protect, updateStudent);

// Delete a student
router.delete("/", protect, deleteStudent);

// Remove student from class
router.post("/remove", protect, removeFromClass);

module.exports = router;
