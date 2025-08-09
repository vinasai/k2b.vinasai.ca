const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(__dirname, "..", "logs");

function ensureLogDir() {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
  } catch (_) {
    // ignore
  }
}

function getLogFilePath() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return path.join(LOG_DIR, `notifications-${yyyy}-${mm}-${dd}.log`);
}

function write(level, message, meta) {
  ensureLogDir();
  const line = [
    `[${level}]`,
    new Date().toISOString(),
    message,
    meta ? JSON.stringify(meta) : "",
  ]
    .filter(Boolean)
    .join(" ");

  try {
    fs.appendFileSync(getLogFilePath(), line + "\n", { encoding: "utf8" });
  } catch (_) {
    // ignore
  }
}

function info(message, meta) {
  write("INFO", message, meta);
}

function error(message, meta) {
  write("ERROR", message, meta);
}

function event(message, meta) {
  write("EVENT", message, meta);
}

module.exports = { info, error, event };
