const Class = require("../models/Class");
const User = require("../models/User");

// @desc    Get full class details by classId
// @route   POST /api/class/details
// @access  Private
exports.getClassDetails = async (req, res) => {
  const { classId } = req.query;

  if (!classId) {
    return res.status(400).json({
      success: false,
      message: "classId is required as a query parameter",
    });
  }

  try {
    const classData = await Class.findById(classId).populate(
      "user",
      "name email role"
    );

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: classData._id,
        className: classData.className,
        sheetId: classData.sheetId,
        user: {
          id: classData.user._id,
          name: classData.user.name,
          email: classData.user.email,
          role: classData.user.role,
        },
        createdAt: classData.createdAt,
      },
    });
  } catch (err) {
    console.error("Error fetching class details:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get all classes
// @route   GET /api/class
// @access  Private (admin)
exports.getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find().populate("user", "name");
    res.status(200).json({ success: true, data: classes });
  } catch (err) {
    console.error("Error fetching all classes:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
