const mongoose = require("mongoose");

const ClassSchema = new mongoose.Schema({
  className: {
    type: String,
    required: [true, "Please provide a class name"],
    trim: true,
    maxlength: [20, "Class name cannot exceed 20 characters"],
  },
  sheetId: {
    type: String,
    required: [true, "Please provide the Google Sheet ID for this class"],
    trim: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Class", ClassSchema);
