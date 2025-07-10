const {
  getStudentData,
  getSpreadsheetInfo,
  updateStudentPaymentStatus,
} = require("../services/handleGoogleSheet");
const { generateAuthUrl, authorize } = require("../utils/googleOAuthEngine");

// @desc    Get all students from Google Sheets
// @route   GET /api/students
// @access  Private
exports.getStudents = async (req, res) => {
  try {
    const { month: monthQuery, sheetId, page, search } = req.query;

    if (!sheetId) {
      return res
        .status(400)
        .json({ success: false, message: "sheetId is required" });
    }

    const month =
      monthQuery?.toUpperCase() ||
      new Date().toLocaleString("default", { month: "short" }).toUpperCase();

    const { students, hasNextPage } = await getStudentData(
      sheetId,
      month,
      parseInt(page) || 1,
      15,
      "all",
      search
    );

    // Transform data to match frontend expectations
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const transformedStudents = students.map((student) => {
      const isPaid = !(
        student.paymentStatus &&
        student.paymentStatus.toLowerCase().includes("not")
      );

      const studentData = {
        id: student.id,
        name: student.name,
        dob: student.dob,
        paymentDate: student.paymentDate,
        lastReminderDate: student.lastReminderDate,
        status: isPaid ? "paid" : "not-paid",
        parentPhone: student.parentPhone,
        paymentStatus: student.paymentStatus,
        paymentMarkedBy: student.paymentMarkedBy,
      };

      if (!isPaid) {
        // Calculate days from the first of the month
        const diffTime = today.getTime() - firstDayOfMonth.getTime();
        // Add 1 to count the first day. e.g., on the 1st, it's 1 day due.
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        studentData.paymentDue = diffDays;
      }

      return studentData;
    });

    res.status(200).json({
      success: true,
      count: transformedStudents.length,
      data: transformedStudents,
      hasNextPage,
    });
  } catch (error) {
    if (error.code === "GOOGLE_AUTH_REQUIRED") {
      const authUrl = await generateAuthUrl();
      return res.status(401).json({
        success: false,
        message: "Google Authentication is required.",
        googleAuth: true,
        authUrl,
      });
    }
    console.error("Error fetching students:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching student data from Google Sheets",
      error: error.message,
    });
  }
};

// @desc    Get all paid students from Google Sheets
// @route   GET /api/students/paid
// @access  Private
exports.getPaidStudents = async (req, res) => {
  try {
    const { month: monthQuery, sheetId, page, search } = req.query;

    if (!sheetId) {
      return res
        .status(400)
        .json({ success: false, message: "sheetId is required" });
    }

    const month =
      monthQuery?.toUpperCase() ||
      new Date().toLocaleString("default", { month: "short" }).toUpperCase();

    const { students, hasNextPage } = await getStudentData(
      sheetId,
      month,
      parseInt(page) || 1,
      15, // limit
      "paid",
      search
    );

    // Transform data to match frontend expectations
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const transformedStudents = students.map((student) => {
      const isPaid = !(
        student.paymentStatus &&
        student.paymentStatus.toLowerCase().includes("not")
      );

      const studentData = {
        id: student.id,
        name: student.name,
        dob: student.dob,
        paymentDate: student.paymentDate,
        lastReminderDate: student.lastReminderDate,
        status: isPaid ? "paid" : "not-paid",
        parentPhone: student.parentPhone,
        paymentStatus: student.paymentStatus,
        paymentMarkedBy: student.paymentMarkedBy,
      };

      if (!isPaid) {
        // Calculate days from the first of the month
        const diffTime = today.getTime() - firstDayOfMonth.getTime();
        // Add 1 to count the first day. e.g., on the 1st, it's 1 day due.
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        studentData.paymentDue = diffDays;
      }

      return studentData;
    });

    res.status(200).json({
      success: true,
      count: transformedStudents.length,
      data: transformedStudents,
      hasNextPage,
    });
  } catch (error) {
    if (error.code === "GOOGLE_AUTH_REQUIRED") {
      const authUrl = await generateAuthUrl();
      return res.status(401).json({
        success: false,
        message: "Google Authentication is required.",
        googleAuth: true,
        authUrl,
      });
    }
    console.error("Error fetching students:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching student data from Google Sheets",
      error: error.message,
    });
  }
};

// @desc    Get all unpaid students from Google Sheets
// @route   GET /api/students/unpaid
// @access  Private
exports.getUnpaidStudents = async (req, res) => {
  try {
    const { month: monthQuery, sheetId, page, search } = req.query;

    if (!sheetId) {
      return res
        .status(400)
        .json({ success: false, message: "sheetId is required" });
    }

    const month =
      monthQuery?.toUpperCase() ||
      new Date().toLocaleString("default", { month: "short" }).toUpperCase();

    const { students, hasNextPage } = await getStudentData(
      sheetId,
      month,
      parseInt(page) || 1,
      15, // limit
      "not-paid",
      search
    );

    // Transform data to match frontend expectations
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const transformedStudents = students.map((student) => {
      const isPaid = !(
        student.paymentStatus &&
        student.paymentStatus.toLowerCase().includes("not")
      );

      const studentData = {
        id: student.id,
        name: student.name,
        dob: student.dob,
        paymentDate: student.paymentDate,
        lastReminderDate: student.lastReminderDate,
        status: isPaid ? "paid" : "not-paid",
        parentPhone: student.parentPhone,
        paymentStatus: student.paymentStatus,
        paymentMarkedBy: student.paymentMarkedBy,
      };

      if (!isPaid) {
        // Calculate days from the first of the month
        const diffTime = today.getTime() - firstDayOfMonth.getTime();
        // Add 1 to count the first day. e.g., on the 1st, it's 1 day due.
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        studentData.paymentDue = diffDays;
      }

      return studentData;
    });

    res.status(200).json({
      success: true,
      count: transformedStudents.length,
      data: transformedStudents,
      hasNextPage,
    });
  } catch (error) {
    if (error.code === "GOOGLE_AUTH_REQUIRED") {
      const authUrl = await generateAuthUrl();
      return res.status(401).json({
        success: false,
        message: "Google Authentication is required.",
        googleAuth: true,
        authUrl,
      });
    }
    console.error("Error fetching students:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching student data from Google Sheets",
      error: error.message,
    });
  }
};

// @desc    Get spreadsheet information
// @route   GET /api/students/spreadsheet-info
// @access  Private
exports.getSpreadsheetInfo = async (req, res) => {
  const { sheetId } = req.query;

  if (!sheetId) {
    return res
      .status(400)
      .json({ success: false, message: "sheetId is required" });
  }

  try {
    const auth = await authorize();
    if (!auth) {
      const authUrl = await generateAuthUrl();
      return res.status(401).json({
        success: false,
        message: "Google Authentication is required.",
        googleAuth: true,
        authUrl,
      });
    }
    const info = await getSpreadsheetInfo(auth, sheetId);

    res.status(200).json({
      success: true,
      data: info,
    });
  } catch (error) {
    console.error("Error fetching spreadsheet info:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching spreadsheet information",
      error: error.message,
    });
  }
};

// @desc    Get student statistics
// @route   GET /api/students/stats
// @access  Private
exports.getStudentStats = async (req, res) => {
  try {
    const { month: monthQuery, sheetId } = req.query;

    if (!sheetId) {
      return res
        .status(400)
        .json({ success: false, message: "sheetId is required" });
    }

    const month =
      monthQuery?.toUpperCase() ||
      new Date().toLocaleString("default", { month: "short" }).toUpperCase();

    // Fetch all students for stats calculation by passing page 0
    const { students } = await getStudentData(sheetId, month, 0);

    console.log(students);

    const stats = {
      total: students.length,
      paid: students.filter(
        (s) => s.paymentStatus && !s.paymentStatus.toLowerCase().includes("not")
      ).length,
      unpaid: students.filter(
        (s) => !s.paymentStatus || s.paymentStatus.toLowerCase().includes("not")
      ).length,
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    if (error.code === "GOOGLE_AUTH_REQUIRED") {
      const authUrl = await generateAuthUrl();
      return res.status(401).json({
        success: false,
        message: "Google Authentication is required.",
        googleAuth: true,
        authUrl,
      });
    }
    console.error("Error calculating stats:", error);
    res.status(500).json({
      success: false,
      message: "Error calculating student statistics",
      error: error.message,
    });
  }
};

// @desc    Update student payment status
// @route   POST /api/students/update-status
// @access  Private
exports.updateStudentStatus = async (req, res) => {
  const { studentName, dob, newStatus, month, sheetId } = req.body;

  if (!studentName || !dob || !newStatus || !month || !sheetId) {
    return res.status(400).json({
      success: false,
      message:
        "Missing required fields: studentName, dob, newStatus, month, sheetId",
    });
  }

  try {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const success = await updateStudentPaymentStatus(
      sheetId,
      studentName,
      dob,
      newStatus,
      month.toUpperCase()
    );

    if (success) {
      res.status(200).json({
        success: true,
        message: "Student payment status updated successfully",
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Student not found or update failed",
      });
    }
  } catch (error) {
    console.error("Error updating student status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating student payment status",
      error: error.message,
    });
  }
};
