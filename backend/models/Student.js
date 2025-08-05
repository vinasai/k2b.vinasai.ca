const mongoose = require("mongoose");

const StudentSchema = new mongoose.Schema({
  studentName: {
    type: String,
    required: [true, "Please provide the student’s full name"],
    trim: true,
  },
  dateOfBirth: {
    type: Date,
    required: [true, "Please provide date of birth"],
  },
  parentContactNumber: {
    type: String,
    required: [true, "Please provide parent contact number"],
  },
  parentWhatsAppNumber: {
    type: String,
  },
  parentEmail: {
    type: String,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      "Please provide a valid parent email",
    ],
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },
  inactiveFrom: {
    type: Date,
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Class",
    required: [true, "Please associate a class"],
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Student", StudentSchema);
