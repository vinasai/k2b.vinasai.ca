const { google } = require("googleapis");
const { authorize } = require("../utils/googleOAuthEngine");

/**
 * Main function to get student data. If not authorized, it throws an error.
 * @param {string} spreadsheetId Your Google Sheets ID
 * @param {string} sheetName Name of the sheet (optional, defaults to first sheet)
 */
async function getStudentData(
  spreadsheetId,
  month,
  page = 1,
  limit = 15,
  status = "all",
  search = ""
) {
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

    return { students: allStudents, hasNextPage: false };
  }

  // If filtering by status or searching, we must fetch all data and paginate manually.
  if (status !== "all" || search) {
    const allStudents = await getStudentPaymentData(
      auth,
      spreadsheetId,
      targetSheetName,
      0 // Fetch all
    );

    let filteredStudents = allStudents;

    if (status !== "all") {
      filteredStudents = filteredStudents.filter((student) => {
        const isPaid = !(
          student.paymentStatus &&
          student.paymentStatus.toLowerCase().includes("not")
        );
        const studentStatus = isPaid ? "paid" : "not-paid";
        return studentStatus === status;
      });
    }

    if (search) {
      filteredStudents = filteredStudents.filter((student) =>
        student.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedStudents = filteredStudents.slice(startIndex, endIndex);
    const hasNextPage = filteredStudents.length > endIndex;

    return { students: paginatedStudents, hasNextPage };
  }

  // For "all" status without search, we fetch one extra item to see if there's a next page.
  const studentsWithExtra = await getStudentPaymentData(
    auth,
    spreadsheetId,
    targetSheetName,
    page,
    limit,
    true // fetch one extra
  );

  const hasNextPage = studentsWithExtra.length > limit;
  const students = studentsWithExtra.slice(0, limit); // Return only the students for the current page

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
  limit = 15,
  fetchExtraForNextPageCheck = false
) {
  try {
    const sheets = google.sheets({ version: "v4", auth });
    let range;
    const fetchLimit = fetchExtraForNextPageCheck ? limit + 1 : limit;

    if (page > 0) {
      // Calculate the range for the current page. `limit` is the page size.
      const startRow = (page - 1) * limit + 2; // +2 because row 1 is headers
      const endRow = startRow + fetchLimit - 1;
      range = `${sheetName}!A${startRow}:H${endRow}`;
    } else {
      // Fetch all rows for stats or filtering
      range = `${sheetName}!A2:H`;
    }

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = res.data.values;
    if (!rows) {
      return [];
    }

    const students = rows
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

    return students;
  } catch (error) {
    if (error.response?.data?.error === "invalid_grant") {
      const authError = new Error(
        "Google token is expired or revoked. Please re-authenticate."
      );
      authError.code = "GOOGLE_TOKEN_EXPIRED";
      throw authError;
    }
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
    if (error.response?.data?.error === "invalid_grant") {
      const authError = new Error(
        "Google token is expired or revoked. Please re-authenticate."
      );
      authError.code = "GOOGLE_TOKEN_EXPIRED";
      throw authError;
    }
    console.error("Error getting spreadsheet info:", error);
    throw error;
  }
}

async function updateStudentPaymentStatus(
  spreadsheetId,
  studentName,
  dob,
  newStatus,
  month,
  markedBy
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
      return false;
    }

    const targetRow = studentRowIndex + 2;

    const newPaymentStatus = newStatus === "paid" ? "PAID" : "NOT PAID";
    const newPaymentDate =
      newStatus === "paid" ? new Date().toLocaleString() : "";
    const finalMarkedBy = newStatus === "paid" ? markedBy : "";

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
        values: [[finalMarkedBy]],
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
    if (error.response?.data?.error === "invalid_grant") {
      const authError = new Error(
        "Google token is expired or revoked. Please re-authenticate."
      );
      authError.code = "GOOGLE_TOKEN_EXPIRED";
      throw authError;
    }
    console.error("Error updating student status:", error);
    throw error;
  }
}

async function updateStudentDetails(spreadsheetId, studentId, updatedData) {
  const auth = await authorize();
  const sheets = google.sheets({ version: "v4", auth });
  const [nameToFind, dobToFind] = studentId.split("-");

  try {
    const spreadsheetInfo = await getSpreadsheetInfo(auth, spreadsheetId);
    const allSheetNames = spreadsheetInfo.sheets.map((s) => s.title);

    let updatedInAtLeastOneSheet = false;

    for (const month of allSheetNames) {
      try {
        const range = `${month}!A2:H`;
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range,
        });

        const rows = res.data.values;
        if (!rows || rows.length === 0) {
          continue; // Skip if sheet is empty
        }

        const studentRowIndex = rows.findIndex(
          (row) =>
            row[0] &&
            row[0].trim() === nameToFind.trim() &&
            row[1]?.trim() === dobToFind.trim()
        );

        if (studentRowIndex === -1) {
          continue; // Skip if student not found in this sheet
        }

        const targetRow = studentRowIndex + 2;
        const currentValues = rows[studentRowIndex];

        const newValues = [
          updatedData.name ?? currentValues[0],
          updatedData.dob ?? currentValues[1],
          updatedData.parentPhone ?? currentValues[2],
        ];

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${month}!A${targetRow}:C${targetRow}`,
          valueInputOption: "USER_ENTERED",
          resource: {
            values: [newValues],
          },
        });

        updatedInAtLeastOneSheet = true;
      } catch (sheetError) {
        // Log error for a specific sheet but continue to the next
        console.error(
          `Error updating details in sheet '${month}':`,
          sheetError
        );
      }
    }

    return updatedInAtLeastOneSheet;
  } catch (error) {
    if (error.response?.data?.error === "invalid_grant") {
      const authError = new Error(
        "Google token is expired or revoked. Please re-authenticate."
      );
      authError.code = "GOOGLE_TOKEN_EXPIRED";
      throw authError;
    }
    console.error("Error updating student details across all sheets:", error);
    throw error;
  }
}

async function deleteStudentRow(spreadsheetId, studentId) {
  const auth = await authorize();
  const sheets = google.sheets({ version: "v4", auth });
  const [nameToFind, dobToFind] = studentId.split("-");

  try {
    const spreadsheetInfo = await getSpreadsheetInfo(auth, spreadsheetId);
    let deletedInAtLeastOneSheet = false;

    for (const sheet of spreadsheetInfo.sheets) {
      const month = sheet.title;
      try {
        const range = `${month}!A2:H`;
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range,
        });

        const rows = res.data.values;
        if (!rows || rows.length === 0) {
          continue; // Skip if sheet is empty
        }

        const studentRowIndex = rows.findIndex(
          (row) =>
            row[0] &&
            row[0].trim() === nameToFind.trim() &&
            row[1]?.trim() === dobToFind.trim()
        );

        if (studentRowIndex === -1) {
          continue; // Skip if student not found
        }

        const targetRow = studentRowIndex + 2;

        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          resource: {
            requests: [
              {
                deleteDimension: {
                  range: {
                    sheetId: sheet.sheetId,
                    dimension: "ROWS",
                    startIndex: targetRow - 1,
                    endIndex: targetRow,
                  },
                },
              },
            ],
          },
        });

        deletedInAtLeastOneSheet = true;
      } catch (sheetError) {
        // Log and continue
        console.error(`Error deleting from sheet '${month}':`, sheetError);
      }
    }
    return deletedInAtLeastOneSheet;
  } catch (error) {
    if (error.response?.data?.error === "invalid_grant") {
      const authError = new Error(
        "Google token is expired or revoked. Please re-authenticate."
      );
      authError.code = "GOOGLE_TOKEN_EXPIRED";
      throw authError;
    }
    console.error("Error deleting student row across all sheets:", error);
    throw error;
  }
}

module.exports = {
  getStudentData,
  getSpreadsheetInfo,
  updateStudentPaymentStatus,
  updateStudentDetails,
  deleteStudentRow,
};
