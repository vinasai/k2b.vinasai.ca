const express = require("express");
const {
  getClassDetails,
  getAllClasses,
} = require("../controllers/classController");
const { protect, authorize } = require("../middleware/auth");
const router = express.Router();

router.get("/details", protect, getClassDetails);
router.get("/", protect, authorize("admin"), getAllClasses);

module.exports = router;
