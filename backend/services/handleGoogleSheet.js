const { google } = require("googleapis");
const { authorize } = require("../utils/googleOAuthEngine");

/**
 * Main function to get student data. If not authorized, it throws an error.
 * @param {string} spreadsheetId Your Google Sheets ID
 * @param {string} sheetName Name of the sheet (optional, defaults to first sheet)
 */
async function getStudentData(spreadsheetId, month, page = 1, limit = 15) {
  const auth = await authorize();
  if (!auth) {
    const error = new Error("Google Authorization is required.");
    error.code = "GOOGLE_AUTH_REQUIRED";
    throw error;
  }

  const spreadsheetInfo = await getSpreadsheetInfo(auth, spreadsheetId);
  const targetSheetName = month || spreadsheetInfo.sheets[0].title;

  // page = 0 means get all students (for stats)
  if (page === 0) {
    const allStudents = await getStudentPaymentData(
      auth,
      spreadsheetId,
      targetSheetName,
      0
    );
    console.log(`Found ${allStudents.length} total students for stats`);
    return { students: allStudents, hasNextPage: false };
  }

  console.log(`Reading from sheet: ${targetSheetName} for page: ${page}`);

  // Fetch limit + 1 rows to check if there's a next page
  const studentsWithExtra = await getStudentPaymentData(
    auth,
    spreadsheetId,
    targetSheetName,
    page,
    limit
  );

  const hasNextPage = studentsWithExtra.length > limit;
  const students = studentsWithExtra.slice(0, limit);

  console.log(`Found ${students.length} students for page ${page}`);
  return { students, hasNextPage };
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
  sheetName,
  page = 1,
  limit = 15
) {
  try {
    const sheets = google.sheets({ version: "v4", auth });
    let range;

    if (page > 0) {
      // Calculate the range for the current page.
      // Fetch one extra row to determine if there's a next page.
      const startRow = (page - 1) * limit + 2;
      const endRow = startRow + limit;
      range = `${sheetName}!A${startRow}:H${endRow}`;
    } else {
      // Fetch all rows for stats
      range = `${sheetName}!A2:H`;
    }

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = res.data.values;
    if (!rows) {
      console.log("No student data found.");
      return [];
    }

    return rows
      .map((row) => {
        // Basic validation: ensure the row has a name and dob.
        if (!row[0] || !row[1]) {
          return null;
        }
        const name = row[0]?.trim() || "";
        const dob = row[1] || "";

        return {
          id: `${name}-${dob}`, // Create a composite key
          name,
          dob,
          parentPhone: row[2] || "",
          whatsappPhone: row[3] || "",
          paymentStatus: row[4] || "NOT PAID / PENDING",
          paymentDate: row[5] || "",
          lastReminderDate: row[6] || "",
          paymentMarkedBy: row[7] || "",
        };
      })
      .filter(Boolean); // Filter out any null entries
  } catch (error) {
    if (error.code === 400) {
      console.warn(`Sheet "${sheetName}" not found. Returning empty array.`);
      return [];
    }
    console.error("Error fetching student payment data:", error);
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
  dob,
  newStatus,
  month
) {
  const auth = await authorize();
  const sheets = google.sheets({ version: "v4", auth });

  try {
    // First, find the student's row
    const range = `${month}!A2:H`;
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
      (row) =>
        row[0] &&
        row[0].trim() === studentName.trim() &&
        row[1]?.trim() === dob.trim()
    );

    if (studentRowIndex === -1) {
      console.log(`Student "${studentName}" with DOB "${dob}" not found.`);
      return false;
    }

    // Row numbers are 1-based, and we started from A2, so add 2
    const targetRow = studentRowIndex + 2;

    const newPaymentStatus = newStatus === "paid" ? "PAID" : "NOT PAID";
    const newPaymentDate =
      newStatus === "paid" ? new Date().toLocaleDateString() : "";
    const markedBy = newStatus === "paid" ? "System" : "";

    // Prepare data for multiple cell updates
    const updateData = [
      {
        range: `${month}!E${targetRow}`, // Column E for paymentStatus
        values: [[newPaymentStatus]],
      },
      {
        range: `${month}!F${targetRow}`, // Column F for paymentDate
        values: [[newPaymentDate]],
      },
      {
        range: `${month}!H${targetRow}`, // Column H for paymentMarkedBy
        values: [[markedBy]],
      },
    ];

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        valueInputOption: "USER_ENTERED",
        data: updateData,
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
