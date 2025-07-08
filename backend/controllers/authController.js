const User = require("../models/User");
const Class = require("../models/Class");
const { generateToken } = require("../middleware/auth");

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide an email and password",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = generateToken(user);

    let classInfo = null;
    if (user.role === "teacher") {
      const userClass = await Class.findOne({ user: user._id });
      if (userClass) {
        classInfo = {
          id: userClass._id,
          name: userClass.className,
          sheetId: userClass.sheetId,
        };
      }
    }

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        classId: classInfo?.id || null,
        className: classInfo?.name || null,
        sheetId: classInfo?.sheetId || null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    let classInfo = null;
    if (user.role === "teacher") {
      const userClass = await Class.findOne({ user: user._id });
      if (userClass) {
        classInfo = {
          id: userClass._id,
          name: userClass.className,
          sheetId: userClass.sheetId,
        };
      }
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        classId: classInfo?.id || null,
        className: classInfo?.name || null,
        sheetId: classInfo?.sheetId || null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
