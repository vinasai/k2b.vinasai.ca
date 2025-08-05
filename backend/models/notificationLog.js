const mongoose = require("mongoose");

const NotificationLogSchema = new mongoose.Schema({
  paymentRecord: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "PaymentRecord",
    required: true,
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
  type: {
    type: String,
    enum: ["Scheduled", "Escalation", "MonthFallback"],
    required: true,
  },
  success: {
    type: Boolean,
    default: true,
  },
  errorMessage: {
    type: String,
  },
});

module.exports = mongoose.model("NotificationLog", NotificationLogSchema);
