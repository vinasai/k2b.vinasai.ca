const Student = require("../models/Student");
const Class = require("../models/Class");
const PaymentRecord = require("../models/paymentRecord");
const User = require("../models/User");
const NotificationLog = require("../models/notificationLog");
const formatPhoneNumber = require("../utils/formatPhone");

const monthMap = {
  JAN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AUG: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DEC: 11,
};

// Format date fields with time
const formatDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} - ${hours}:${minutes}:${seconds}`;
};

// Format date of birth as mm/dd/yyyy
const formatDateOfBirth = (date) => {
  if (!date) return null;
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const year = d.getFullYear();
  return `${month}/${day}/${year}`;
};

// @desc    Create a new student
// @route   POST /api/students/create
// @access  Private
exports.createStudent = async (req, res) => {
  const {
    studentName,
    dateOfBirth,
    parentContactNumber,
    parentWhatsAppNumber,
    parentEmail,
    class: classId,
  } = req.body;

  if (!studentName || !dateOfBirth || !parentContactNumber || !classId) {
    return res.status(400).json({
      success: false,
      message:
        "Missing required fields: studentName, dateOfBirth, parentContactNumber, class",
    });
  }

  try {
    // Verify that the class exists
    const aClass = await Class.findById(classId);
    if (!aClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found for the given classId",
      });
    }

    // Create the student
    const studentData = {
      studentName: studentName.trim(),
      dateOfBirth: new Date(dateOfBirth),
      parentContactNumber,
      class: classId,
    };

    // Add optional fields if provided
    if (parentWhatsAppNumber) {
      studentData.parentWhatsAppNumber = parentWhatsAppNumber;
    }
    if (parentEmail) {
      studentData.parentEmail = parentEmail;
    }

    const student = await Student.create(studentData);

    // Create payment records from current month to December of the current year
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-based (0 = January, 11 = December)
    const allMonths = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ];

    // Get months from current month to end of year
    const remainingMonths = allMonths.slice(currentMonth);

    const paymentRecords = remainingMonths.map((month) => ({
      student: student._id,
      month,
      year: currentYear,
      status: "not-paid",
      amount: null,
      paidAt: null,
      markedBy: null,
    }));

    await PaymentRecord.insertMany(paymentRecords);

    // Populate the student with class information for response
    const populatedStudent = await Student.findById(student._id).populate(
      "class"
    );

    res.status(201).json({
      success: true,
      message: "Student created successfully",
      data: {
        id: populatedStudent._id,
        name: populatedStudent.studentName,
        dob: formatDateOfBirth(populatedStudent.dateOfBirth),
        parentPhone: formatPhoneNumber(populatedStudent.parentContactNumber),
        parentWhatsApp: populatedStudent.parentWhatsAppNumber,
        parentEmail: populatedStudent.parentEmail,
        className: populatedStudent.class.className,
        status: populatedStudent.status,
        joinedAt: formatDate(populatedStudent.joinedAt),
      },
    });
  } catch (error) {
    console.error("Error creating student:", error);

    // Handle validation errors
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err) => err.message
      );
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: validationErrors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Error creating student",
      error: error.message,
    });
  }
};

const getStudentsByStatus = async (req, res, statusFilter) => {
  try {
    const { month: monthQuery, classId, page = 1, search } = req.query;

    const month =
      monthQuery?.toUpperCase() ||
      new Date().toLocaleString("default", { month: "short" }).toUpperCase();
    const year = new Date().getFullYear();
    const limit = 15;
    const skip = (parseInt(page) - 1) * limit;

    // Get all students (active and inactive) for the class
    let studentQuery = { class: classId };
    if (search) {
      studentQuery.studentName = { $regex: search, $options: "i" };
    }

    const allStudents = await Student.find(studentQuery);
    const activeStudentIds = allStudents
      .filter((s) => s.status === "active")
      .map((s) => s._id);
    const inactiveStudentIds = allStudents
      .filter((s) => s.status === "inactive")
      .map((s) => s._id);

    // For inactive students, only include those with paid records for the given month
    let inactiveStudentsWithPaidRecords = [];
    if (inactiveStudentIds.length > 0) {
      const paidRecordsForInactive = await PaymentRecord.find({
        student: { $in: inactiveStudentIds },
        month,
        year,
        status: "paid",
      }).populate("student");

      inactiveStudentsWithPaidRecords = paidRecordsForInactive.map(
        (pr) => pr.student._id
      );
    }

    // Combine active students and inactive students with paid records
    const eligibleStudentIds = [
      ...activeStudentIds,
      ...inactiveStudentsWithPaidRecords,
    ];

    let paymentQuery = {
      student: { $in: eligibleStudentIds },
      month,
      year,
    };

    if (statusFilter) {
      paymentQuery.status = statusFilter;
    }

    const totalRecords = await PaymentRecord.countDocuments(paymentQuery);
    const paymentRecords = await PaymentRecord.find(paymentQuery)
      .populate({
        path: "student",
        populate: {
          path: "class",
        },
      })
      .populate("markedBy", "name")
      .skip(skip)
      .limit(limit);

    const hasNextPage = skip + paymentRecords.length < totalRecords;

    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthIndex = today.getMonth();
    const selectedMonthIndex = monthMap[month];

    const transformedStudents = paymentRecords.map((pr) => {
      const student = pr.student;
      const isPaid = pr.status === "paid";
      const formattedPhone = formatPhoneNumber(student.parentContactNumber);

      const studentData = {
        id: student._id,
        name: student.studentName,
        dob: formatDateOfBirth(student.dateOfBirth),
        paymentDate: formatDate(pr.paidAt),
        lastReminderDate: formatDate(pr.lastReminderAt),
        status: isPaid ? "paid" : "not-paid",
        parentPhone: formattedPhone,
        paymentStatus: pr.status,
        paymentMarkedBy: pr.markedBy?.name,
        studentStatus: student.status,
        amount: pr.amount,
      };

      if (!isPaid) {
        let diffDays = 0;
        const firstOfSelectedMonth = new Date(
          currentYear,
          selectedMonthIndex,
          1
        );
        if (selectedMonthIndex < currentMonthIndex) {
          const msPerDay = 1000 * 60 * 60 * 24;
          diffDays = Math.floor((today - firstOfSelectedMonth) / msPerDay);
        } else if (selectedMonthIndex === currentMonthIndex) {
          diffDays = today.getDate();
        }
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
    console.error(`Error fetching students:`, error);
    res.status(500).json({
      success: false,
      message: `Error fetching student data`,
      error: error.message,
    });
  }
};

// @desc    Get all students from DB
// @route   GET /api/students
// @access  Private
exports.getStudents = async (req, res) => {
  await getStudentsByStatus(req, res, null);
};

// @desc    Get all paid students from DB
// @route   GET /api/students/paid
// @access  Private
exports.getPaidStudents = async (req, res) => {
  await getStudentsByStatus(req, res, "paid");
};

// @desc    Get all unpaid students from DB
// @route   GET /api/students/unpaid
// @access  Private
exports.getUnpaidStudents = async (req, res) => {
  await getStudentsByStatus(req, res, "not-paid");
};

// @desc    Get student statistics
// @route   GET /api/students/stats
// @access  Private
exports.getStudentStats = async (req, res) => {
  try {
    const { month: monthQuery, classId } = req.query;

    if (!classId) {
      return res
        .status(400)
        .json({ success: false, message: "classId is required" });
    }

    const aClass = await Class.findOne({ _id: classId });
    if (!aClass) {
      return res
        .status(404)
        .json({ success: false, message: "Class not found" });
    }

    const month =
      monthQuery?.toUpperCase() ||
      new Date().toLocaleString("default", { month: "short" }).toUpperCase();
    const year = new Date().getFullYear();

    // Get all students (active and inactive) for the class
    const allStudentsInClass = await Student.find({ class: aClass._id });
    const activeStudentIds = allStudentsInClass
      .filter((s) => s.status === "active")
      .map((s) => s._id);
    const inactiveStudentIds = allStudentsInClass
      .filter((s) => s.status === "inactive")
      .map((s) => s._id);

    // For inactive students, only include those with paid records for the given month
    let inactiveStudentsWithPaidRecords = [];
    if (inactiveStudentIds.length > 0) {
      const paidRecordsForInactive = await PaymentRecord.find({
        student: { $in: inactiveStudentIds },
        month,
        year,
        status: "paid",
      });

      inactiveStudentsWithPaidRecords = paidRecordsForInactive.map(
        (pr) => pr.student
      );
    }

    // Combine active students and inactive students with paid records
    const eligibleStudentIds = [
      ...activeStudentIds,
      ...inactiveStudentsWithPaidRecords,
    ];

    const paymentQuery = {
      student: { $in: eligibleStudentIds },
      month,
      year,
    };

    const paid = await PaymentRecord.countDocuments({
      ...paymentQuery,
      status: "paid",
    });
    const unpaid = await PaymentRecord.countDocuments({
      ...paymentQuery,
      status: "not-paid",
    });

    const stats = {
      total: paid + unpaid,
      paid,
      unpaid,
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error calculating stats:", error);
    res.status(500).json({
      success: false,
      message: "Error calculating student statistics",
      error: error.message,
    });
  }
};

// @desc    Update student payment amount
// @route   POST /api/students/update-amount
// @access  Private
exports.updateStudentAmount = async (req, res) => {
  const { studentId, amount, month, classId } = req.body;

  if (!studentId || amount === undefined || !month || !classId) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: studentId, amount, month, classId",
    });
  }

  try {
    const aClass = await Class.findOne({ _id: classId });
    if (!aClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found for the given classId",
      });
    }

    const student = await Student.findOne({
      _id: studentId,
    });
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const year = new Date().getFullYear();

    const updateData = {
      amount: parseFloat(amount),
    };

    const paymentRecord = await PaymentRecord.findOneAndUpdate(
      { student: student._id, month: month.toUpperCase(), year },
      updateData,
      { new: true, runValidators: true }
    );

    if (paymentRecord) {
      res.status(200).json({
        success: true,
        message: "Payment amount updated successfully",
        data: {
          amount: paymentRecord.amount,
        },
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Payment record not found or update failed",
      });
    }
  } catch (error) {
    console.error("Error updating payment amount:", error);
    res.status(500).json({
      success: false,
      message: "Error updating payment amount",
      error: error.message,
    });
  }
};

// @desc    Update student payment status
// @route   POST /api/students/update-status
// @access  Private
exports.updateStudentStatus = async (req, res) => {
  const { studentId, newStatus, month, classId, amount } = req.body;

  if (!studentId || !newStatus || !month || !classId) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields: studentId, newStatus, month, classId",
    });
  }

  try {
    const aClass = await Class.findOne({ _id: classId });
    if (!aClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found for the given classId",
      });
    }

    const student = await Student.findOne({
      _id: studentId,
    });
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const year = new Date().getFullYear();

    const updateData = {
      status: newStatus,
      paidAt: newStatus === "paid" ? new Date() : null,
      markedBy: req.user.id,
    };

    if (newStatus === "paid" && amount) {
      updateData.amount = amount;
    } else if (newStatus === "not-paid") {
      updateData.amount = null;
    }

    const paymentRecord = await PaymentRecord.findOneAndUpdate(
      { student: student._id, month: month.toUpperCase(), year },
      updateData,
      { new: true, runValidators: true }
    );

    if (paymentRecord) {
      res.status(200).json({
        success: true,
        message: "Student payment status updated successfully",
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Payment record not found or update failed",
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

// @desc    Update student details
// @route   PUT /api/students
// @access  Private
exports.updateStudent = async (req, res) => {
  const { id } = req.query;
  const updatedData = req.body;

  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "Student ID is required" });
  }

  try {
    //delete updatedData.classId;

    const student = await Student.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    if (student) {
      res.status(200).json({
        success: true,
        message: "Student details updated successfully",
        data: student,
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Student not found or update failed",
      });
    }
  } catch (error) {
    console.error("Error updating student details:", error);
    res.status(500).json({
      success: false,
      message: "Error updating student details",
      error: error.message,
    });
  }
};

// @desc    Delete a student
// @route   DELETE /api/students
// @access  Private
exports.deleteStudent = async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "Student ID is required" });
  }

  try {
    const student = await Student.findById(id);
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const paymentRecords = await PaymentRecord.find({
      student: id,
    });
    const paymentRecordIds = paymentRecords.map((pr) => pr._id);

    await NotificationLog.deleteMany({
      paymentRecord: { $in: paymentRecordIds },
    });

    await PaymentRecord.deleteMany({ student: id });

    await Student.findByIdAndDelete(id);

    res
      .status(200)
      .json({ success: true, message: "Student deleted successfully" });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting student",
      error: error.message,
    });
  }
};

// @desc    Remove student from class
// @route   POST /api/students/remove
// @access  Private
exports.removeFromClass = async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: "Student ID is required" });
  }

  try {
    const student = await Student.findById(id);
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    // Update student status to inactive and set inactiveFrom date
    await Student.findByIdAndUpdate(id, {
      status: "inactive",
      inactiveFrom: new Date(),
    });

    // Find all unpaid payment records for this student
    const unpaidPaymentRecords = await PaymentRecord.find({
      student: id,
      status: "not-paid",
    });

    // Delete notification logs for unpaid records
    if (unpaidPaymentRecords.length > 0) {
      const unpaidPaymentRecordIds = unpaidPaymentRecords.map((pr) => pr._id);
      await NotificationLog.deleteMany({
        paymentRecord: { $in: unpaidPaymentRecordIds },
      });
    }

    // Delete only unpaid payment records (keep paid ones)
    await PaymentRecord.deleteMany({
      student: id,
      status: "not-paid",
    });

    res.status(200).json({
      success: true,
      message: "Student removed from class successfully",
    });
  } catch (error) {
    console.error("Error removing student from class:", error);
    res.status(500).json({
      success: false,
      message: "Error removing student from class",
      error: error.message,
    });
  }
};
