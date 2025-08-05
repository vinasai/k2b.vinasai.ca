const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");

const User = require("./models/User");
// Import routes
const authRoutes = require("./routes/authRoutes");
const studentRoutes = require("./routes/studentRoutes");
const googleAuthRoutes = require("./routes/googleAuthRoutes");
const classRoutes = require("./routes/classRoutes");

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Middleware
app.use(
  cors({
    origin: ["https://k2b.vinasai.ca", "http://localhost:5175"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("MongoDB connected successfully");
  })

  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/google-auth", googleAuthRoutes);
app.use("/api/class", classRoutes);

// Basic route for testing
app.get("/api/health", (req, res) => {
  res.status(200).json({ message: "Server is running v2.1" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ message: "Something went wrong!", error: err.message });
});

// Start server
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
