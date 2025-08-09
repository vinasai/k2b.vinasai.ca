require("dotenv").config();
const mongoose = require("mongoose");
const { runAllRemindersNow } = require("./services/notificationScheduler");

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("Missing MONGODB_URI in environment.");
    process.exit(1);
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB. Running reminders now...");
    await runAllRemindersNow();
    console.log("Reminders run complete.");
  } catch (err) {
    console.error("Error running reminders:", err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
