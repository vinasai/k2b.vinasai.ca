const { google } = require("googleapis");
const { authorize } = require("../utils/googleOAuthEngine");

/**
 * Main function to get student data. If not authorized, it throws an error.
 * @param {string} spreadsheetId Your Google Sheets ID
 * @param {string} sheetName Name of the sheet (optional, defaults to first sheet)
 */
async function getStudentData(spreadsheetId, month) {
  const auth = await authorize();
  if (!auth) {
    const error = new Error("Google Authorization is required.");
    error.code = "GOOGLE_AUTH_REQUIRED";
    throw error;
  }

  // Get spreadsheet info to determine the correct sheet name
  const spreadsheetInfo = await getSpreadsheetInfo(auth, spreadsheetId);
  console.log(`Connected to spreadsheet: ${spreadsheetInfo.title}`);

  // Use provided sheet name or default to first sheet
  const targetSheetName = month || spreadsheetInfo.sheets[0].title;
  console.log(`Reading from sheet: ${targetSheetName}`);

  // Read the data (assuming headers are in row 1, data starts from row 2)
  const range = `${targetSheetName}!A2:E`;
  const students = await getStudentPaymentData(auth, spreadsheetId, range);

  console.log(`Found ${students.length} students`);
  return students;
}

/**
 * Reads student payment data from the spreadsheet
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 * @param {string} spreadsheetId Your Google Sheets ID
 * @param {string} range The range to read (e.g., 'Sheet1!A2:D')
 */
async function getStudentPaymentData(
  auth,
  spreadsheetId,
  range = "Sheet1!A2:D"
) {
  try {
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: range,
    });

    const rows = res.data.values;
    if (!rows || rows.length === 0) {
      console.log("No data found.");
      return [];
    }

    // Transform the data into a more usable format
    return rows
      .map((row, index) => ({
        id: index + 1,
        name: row[0] || "",
        parentPhone: row[1] || "",
        paymentStatus: row[2] || "NOT PAID",
        paymentDate: row[3] || "",
        lastReminderDate: row[4] || "",
        status:
          row[2] && row[2].toLowerCase().includes("paid") ? "paid" : "not-paid",
      }))
      .filter((student) => student.name.trim() !== ""); // Filter out empty rows
  } catch (error) {
    console.error("Error reading spreadsheet:", error);
    throw error;
  }
}

/**
 * Get spreadsheet metadata (to verify connection and get sheet names)
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 * @param {string} spreadsheetId Your Google Sheets ID
 */
async function getSpreadsheetInfo(auth, spreadsheetId) {
  if (!auth) {
    const error = new Error("Google Authorization is required.");
    error.code = "GOOGLE_AUTH_REQUIRED";
    throw error;
  }
  try {
    const sheets = google.sheets({ version: "v4", auth });
    const res = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId,
    });

    const spreadsheet = res.data;
    return {
      title: spreadsheet.properties.title,
      sheets: spreadsheet.sheets.map((sheet) => ({
        title: sheet.properties.title,
        sheetId: sheet.properties.sheetId,
      })),
    };
  } catch (error) {
    console.error("Error getting spreadsheet info:", error);
    throw error;
  }
}

async function updateStudentPaymentStatus(
  spreadsheetId,
  studentName,
  newStatus,
  month
) {
  const auth = await authorize();
  const sheets = google.sheets({ version: "v4", auth });

  try {
    // First, find the student's row
    const range = `${month}!A2:E`;
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = res.data.values;
    if (!rows || rows.length === 0) {
      console.log("No data found.");
      return false;
    }

    const studentRowIndex = rows.findIndex(
      (row) => row[0] && row[0].trim() === studentName.trim()
    );

    if (studentRowIndex === -1) {
      console.log(`Student "${studentName}" not found.`);
      return false;
    }

    // Row numbers are 1-based, and we started from A2, so add 2
    const targetRow = studentRowIndex + 2;
    const targetCell = `${month}!C${targetRow}`; // Column C for paymentStatus
    const targetDateCell = `${month}!D${targetRow}`; // Column D for paymentDate

    const newPaymentStatus =
      newStatus === "paid" ? "Paid" : "NOT PAID / PENDING";
    const newPaymentDate =
      newStatus === "paid" ? new Date().toLocaleDateString() : "";

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: targetCell,
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [[newPaymentStatus]],
      },
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: targetDateCell,
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [[newPaymentDate]],
      },
    });

    return true;
  } catch (error) {
    console.error("Error updating student status:", error);
    return false;
  }
}

module.exports = {
  getStudentData,
  getSpreadsheetInfo,
  updateStudentPaymentStatus,
};
