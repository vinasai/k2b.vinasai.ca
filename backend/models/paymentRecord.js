const mongoose = require("mongoose");

const PaymentRecordSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  month: {
    type: String,
    enum: [
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
    ],
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["not-paid", "paid"],
    default: "not-paid",
  },
  paidAt: {
    type: Date,
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  amount: {
    type: Number,
  },
  lastReminderAt: {
    type: Date,
  },
});

// ensure one record per student/month/year
PaymentRecordSchema.index({ student: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model("PaymentRecord", PaymentRecordSchema);
