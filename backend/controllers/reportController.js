const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const path = require("path");
const fs = require("fs");
const Class = require("../models/Class");
const Student = require("../models/Student");
const PaymentRecord = require("../models/paymentRecord");
const NotificationLog = require("../models/notificationLog");

const generatePaymentReport = async (req, res) => {
  try {
    const { classId, month, year } = req.body;

    // Validate inputs
    if (!classId || !month || !year) {
      return res.status(400).json({
        message: "Please provide classId, month, and year",
      });
    }

    // Validate month
    const validMonths = [
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
    if (!validMonths.includes(month.toUpperCase())) {
      return res.status(400).json({
        message: "Invalid month code. Use JAN, FEB, MAR, etc.",
      });
    }

    // Validate year
    const currentYear = new Date().getFullYear();
    if (year < 2020 || year > currentYear + 1) {
      return res.status(400).json({
        message: "Invalid year",
      });
    }

    // Fetch class details
    const classDetails = await Class.findById(classId);
    if (!classDetails) {
      return res.status(404).json({
        message: "Class not found",
      });
    }

    // Fetch all students in the class
    const students = await Student.find({ class: classId }).sort({
      studentName: 1,
    });
    if (!students || students.length === 0) {
      return res.status(404).json({
        message: "No students found in this class",
      });
    }

    // Prepare data for CSV
    const csvData = [];
    let totalStudents = students.length;
    let paidStudents = 0;
    let totalFeesCollected = 0;

    for (const student of students) {
      // Fetch payment record for this student for the specified month/year
      const paymentRecord = await PaymentRecord.findOne({
        student: student._id,
        month: month.toUpperCase(),
        year: year,
      }).populate("markedBy", "name");

      // Determine student status
      let statusText = "In class";
      if (student.status === "inactive") {
        statusText = "Inactive - Not in class";
      }

      // Format joined date
      const joinedDate = student.joinedAt
        ? `${student.joinedAt.getFullYear()}-${
            validMonths[student.joinedAt.getMonth()]
          }`
        : "-";

      // Get last notification for unpaid students
      let lastNotificationSent = "-";
      let amount = "-";
      let paymentMarkedBy = "-";
      let paymentStatus = "not-paid";

      if (paymentRecord) {
        paymentStatus = paymentRecord.status;
        amount = paymentRecord.amount || "-";

        if (paymentRecord.markedBy) {
          paymentMarkedBy = paymentRecord.markedBy.name;
        }

        if (paymentStatus === "paid") {
          paidStudents++;
          if (paymentRecord.amount) {
            totalFeesCollected += paymentRecord.amount;
          }
          lastNotificationSent = "-";
        } else {
          // Get last notification for unpaid students
          const lastNotification = await NotificationLog.findOne({
            paymentRecord: paymentRecord._id,
          }).sort({ sentAt: -1 });

          if (lastNotification) {
            lastNotificationSent = lastNotification.sentAt.toLocaleDateString();
          }
        }
      }

      csvData.push({
        studentName: student.studentName,
        parentContactNumber: student.parentContactNumber,
        status: statusText,
        className: classDetails.className,
        paymentStatus: paymentStatus === "paid" ? "✅ Paid" : "❌ Not Paid",
        joinedDate: joinedDate,
        lastNotificationSent: lastNotificationSent,
        amount: amount,
        paymentMarkedBy: paymentMarkedBy,
      });
    }

    // Add summary rows
    const notPaidStudents = totalStudents - paidStudents;

    // Add empty row and summary
    csvData.push({
      studentName: "",
      parentContactNumber: "",
      status: "",
      className: "",
      paymentStatus: "",
      joinedDate: "",
      lastNotificationSent: "",
      amount: "",
      paymentMarkedBy: "",
    });

    csvData.push({
      studentName: "SUMMARY",
      parentContactNumber: "",
      status: "",
      className: "",
      paymentStatus: "",
      joinedDate: "",
      lastNotificationSent: "",
      amount: "",
      paymentMarkedBy: "",
    });

    csvData.push({
      studentName: "Total Students in Class",
      parentContactNumber: totalStudents,
      status: "",
      className: "",
      paymentStatus: "",
      joinedDate: "",
      lastNotificationSent: "",
      amount: "",
      paymentMarkedBy: "",
    });

    csvData.push({
      studentName: "Total Students Paid",
      parentContactNumber: paidStudents,
      status: "",
      className: "",
      paymentStatus: "",
      joinedDate: "",
      lastNotificationSent: "",
      amount: "",
      paymentMarkedBy: "",
    });

    csvData.push({
      studentName: "Total Students Not Paid",
      parentContactNumber: notPaidStudents,
      status: "",
      className: "",
      paymentStatus: "",
      joinedDate: "",
      lastNotificationSent: "",
      amount: "",
      paymentMarkedBy: "",
    });

    csvData.push({
      studentName: "Total Fees Collected",
      parentContactNumber: `CAD ${totalFeesCollected}`,
      status: "",
      className: "",
      paymentStatus: "",
      joinedDate: "",
      lastNotificationSent: "",
      amount: "",
      paymentMarkedBy: "",
    });

    // Generate filename
    const filename = `${classDetails.className.replace(
      /[^a-zA-Z0-9]/g,
      "_"
    )}-${month}-${year}.csv`;
    const filepath = path.join(__dirname, "../temp", filename);

    // Ensure temp directory exists
    const tempDir = path.join(__dirname, "../temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create CSV writer
    const csvWriter = createCsvWriter({
      path: filepath,
      header: [
        { id: "studentName", title: "Student Name" },
        { id: "parentContactNumber", title: "Parent Contact Number" },
        { id: "status", title: "Status" },
        { id: "className", title: "Class" },
        { id: "paymentStatus", title: "Payment Status" },
        { id: "joinedDate", title: "Joined Date" },
        { id: "lastNotificationSent", title: "Last Notification Sent" },
        { id: "amount", title: "Amount" },
        { id: "paymentMarkedBy", title: "Payment Marked By" },
      ],
    });

    // Write CSV file
    await csvWriter.writeRecords(csvData);

    // Send file as download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(filepath);
    fileStream.pipe(res);

    // Clean up temp file after sending
    fileStream.on("end", () => {
      fs.unlink(filepath, (err) => {
        if (err) {
          console.error("Error deleting temp file:", err);
        }
      });
    });
  } catch (error) {
    console.error("Error generating payment report:", error);
    res.status(500).json({
      message: "Internal server error while generating report",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = {
  generatePaymentReport,
};
