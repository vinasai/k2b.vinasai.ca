const User = require("../models/User");
const Class = require("../models/Class");
const { generateToken } = require("../middleware/auth");
const jwt = require("jsonwebtoken");

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

    const { accessToken, refreshToken } = generateToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 90 * 24 * 60 * 60 * 1000,
    });

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
      token: accessToken,
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

// backend/controllers/authController.js

exports.logout = (req, res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // or "strict" depending on your setup
    path: "/", // must match the path used when setting the cookie
  });
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
exports.refresh = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({
      success: false,
      message: "Refresh token not found",
    });
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET ||
        "z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4j3i2h1g0f9e8d7c6b5a4"
    );

    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid refresh token" });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateToken(user);

    // Update the refresh token in the database
    user.refreshToken = newRefreshToken;
    await user.save();

    // Set the new refresh token in the cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 90 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ success: true, token: accessToken });
  } catch (err) {
    res.status(401).json({
      success: false,
      message: "Invalid refresh token",
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
