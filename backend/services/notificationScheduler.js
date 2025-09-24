const cron = require("node-cron");
const PaymentRecord = require("../models/paymentRecord");
const Student = require("../models/Student");
const NotificationLog = require("../models/notificationLog");
const { sendSms } = require("../utils/twilioClient");
const logger = require("../utils/logger");

// Helpers
const MONTH_LABELS = [
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

function getMonthYear(date) {
  const monthIndex = date.getMonth();
  const year = date.getFullYear();
  return { month: MONTH_LABELS[monthIndex], year };
}

function getPrevMonthYear(date) {
  const d = new Date(date);
  d.setMonth(d.getMonth() - 1);
  return getMonthYear(d);
}

function isCurrentMonthReminderDay(date) {
  const day = date.getDate();
  if (day === 5 || day === 10 || day === 20) return true;
  if (day > 20 && (day - 20) % 2 === 0) return true; // every 2 days after 20th
  return false;
}

function isPrevMonthReminderDay(date) {
  const day = date.getDate();
  return day === 1 || day === 2; // only 1st and 2nd for previous month's unpaid
}

function buildMessage({ studentName, amount, dueDateStr }) {
  return (
    `Dear Parent/Student,\n` +
    `Tuition fees for ${studentName} are due. Kindly settle the payment of ${amount} ` +
    `by ${dueDateStr}.\n` +
    `Thank you,\n` +
    `K2B Dancing Studio`
  );
}

// Ensure number is in E.164. Default to +1 if 10 digits without country code.
function toE164OrNull(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return "+" + digits;
  }
  if (digits.length === 10) {
    return "+1" + digits;
  }
  if (digits.startsWith("+") && digits.length >= 11) {
    return raw;
  }
  return null;
}

async function fetchUnpaidRecords({ month, year, eligibleStudentIds }) {
  const query = { month, year, status: "not-paid" };
  if (eligibleStudentIds?.length) query.student = { $in: eligibleStudentIds };
  return PaymentRecord.find(query).populate("student");
}

async function sendReminderForRecord(paymentRecord, type, now) {
  const student = paymentRecord.student;
  if (!student || student.status === "inactive") return; // skip inactive

  const to = student.parentContactNumber;
  const toE164 = toE164OrNull(to);
  if (!toE164) {
    logger.error("Invalid phone number for SMS", {
      studentId: student._id?.toString?.(),
      raw: to,
    });
    await NotificationLog.create({
      paymentRecord: paymentRecord._id,
      type,
      success: false,
      errorMessage: "Invalid phone number",
      sentAt: now,
    });
    return;
  }
  const amount = paymentRecord.amount
    ? `$${paymentRecord.amount.toFixed(2)}`
    : "the due amount";
  const dueDateStr = `${paymentRecord.month} ${paymentRecord.year}`;
  const body = buildMessage({
    studentName: student.studentName,
    amount,
    dueDateStr,
  });

  try {
    await sendSms({ to: toE164, body });
    await NotificationLog.create({
      paymentRecord: paymentRecord._id,
      type,
      success: true,
      sentAt: now,
    });
    logger.event("SMS_SENT", {
      studentId: student._id?.toString?.(),
      to: toE164,
      type,
      paymentRecordId: paymentRecord._id?.toString?.(),
    });
    await PaymentRecord.findByIdAndUpdate(paymentRecord._id, {
      $set: { lastReminderAt: now },
    });
  } catch (err) {
    await NotificationLog.create({
      paymentRecord: paymentRecord._id,
      type,
      success: false,
      errorMessage: err?.message || String(err),
      sentAt: now,
    });
    logger.error("SMS_FAILED", {
      studentId: student._id?.toString?.(),
      to: toE164,
      type,
      error: err?.message || String(err),
    });
  }
}

async function runCurrentMonthReminders(now = new Date()) {
  if (!isCurrentMonthReminderDay(now)) return;
  const { month, year } = getMonthYear(now);
  const unpaid = await fetchUnpaidRecords({ month, year });
  for (const pr of unpaid) {
    await sendReminderForRecord(pr, "Scheduled", now);
  }
}

async function runPrevMonthReminders(now = new Date()) {
  if (!isPrevMonthReminderDay(now)) return;
  const { month, year } = getPrevMonthYear(now);
  const unpaid = await fetchUnpaidRecords({ month, year });
  for (const pr of unpaid) {
    await sendReminderForRecord(pr, "MonthFallback", now);
  }
}

function startSchedulers() {
  // Run daily at 09:00 server time. Simple approach, minimal complexity.
  cron.schedule("0 9 * * *", async () => {
    const now = new Date();
    try {
      await runCurrentMonthReminders(now);
      await runPrevMonthReminders(now);
      logger.info("Notification scheduler ran successfully");
    } catch (e) {
      // eslint-disable-next-line no-console
      logger.error("Notification scheduler error", {
        error: e?.message || String(e),
      });
    }
  });
}

async function runAllRemindersNow() {
  const now = new Date();
  // Current month unpaid
  const { month, year } = getMonthYear(now);
  const unpaidCurrent = await fetchUnpaidRecords({ month, year });
  logger.info("Running immediate reminders for current month", {
    month,
    year,
    count: unpaidCurrent.length,
  });
  for (const pr of unpaidCurrent) {
    await sendReminderForRecord(pr, "Scheduled", now);
  }

  // Previous month unpaid
  const prev = getPrevMonthYear(now);
  const unpaidPrev = await fetchUnpaidRecords({
    month: prev.month,
    year: prev.year,
  });
  logger.info("Running immediate reminders for previous month", {
    month: prev.month,
    year: prev.year,
    count: unpaidPrev.length,
  });
  for (const pr of unpaidPrev) {
    await sendReminderForRecord(pr, "MonthFallback", now);
  }
  logger.info("Immediate reminders run completed");
}

module.exports = { startSchedulers, runAllRemindersNow };
