const express = require("express");
const {
  getClassDetails,
  getAllClasses,
} = require("../controllers/classController");
const { protect } = require("../middleware/auth");
const router = express.Router();

router.get("/details", protect, getClassDetails);
router.get("/", protect, getAllClasses);

module.exports = router;
