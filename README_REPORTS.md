# Payment Report Generation Feature

This feature allows users to generate CSV reports for class payment records with comprehensive data and summaries.

## Backend Implementation

### API Endpoint

- **URL**: `POST /api/reports/generate`
- **Authentication**: Required (Bearer token)
- **Content-Type**: `application/json`

### Request Body

```json
{
  "classId": "string (MongoDB ObjectId)",
  "month": "string (JAN, FEB, MAR, etc.)",
  "year": "number (e.g., 2024)"
}
```

### Response

- **Content-Type**: `text/csv`
- **Content-Disposition**: `attachment; filename="{className}-{month}-{year}.csv"`
- Returns a CSV file download

### CSV Columns

1. **Student Name** - Full name of the student
2. **Parent Contact Number** - Contact information
3. **Status** - "In class" or "Inactive - Not in class"
4. **Class** - Class name
5. **Joined Date** - When student joined (YYYY-MMM format)
6. **Last Notification Sent** - Date of last payment reminder (if unpaid)
7. **Amount** - Payment amount (if paid)
8. **Payment Marked By** - User who marked payment as paid

### Summary Section

The CSV includes a summary section at the bottom with:

- Total Students in Class
- Total Students Paid
- Total Students Not Paid
- Total Fees Collected (in ₹)

## Frontend Implementation

### Components

1. **ReportGenerator** (`components/reports/ReportGenerator.jsx`)

   - Form with class selection, month, and year inputs
   - Input validation and error handling
   - Progress indicator during generation
   - Automatic file download

2. **ReportsModal** (`components/ReportsModal.jsx`)
   - Modal wrapper for the ReportGenerator
   - Clean, responsive design

### Integration

- Accessible from the Sidebar "Reports" button
- Pre-selects currently selected class in dashboard
- Current month is pre-selected by default

## Dependencies

### Backend

- `csv-writer` - For CSV file generation
- `mongoose` - Database operations
- `express` - Web framework

### Frontend

- `file-saver` - For downloading generated files
- `axios` - API communication
- `react` - UI framework

## Error Handling

### Backend Errors

- **400**: Invalid input parameters
- **404**: Class not found or no students in class
- **500**: Internal server error

### Frontend Handling

- Form validation with real-time feedback
- User-friendly error messages
- Graceful handling of API errors

## Usage Examples

### API Call (Frontend)

```javascript
const response = await api.post(
  "/reports/generate",
  {
    classId: "507f1f77bcf86cd799439011",
    month: "JAN",
    year: 2024,
  },
  {
    responseType: "blob",
  }
);

const blob = new Blob([response.data], { type: "text/csv" });
saveAs(blob, "report.csv");
```

### File Generation

Generated files follow the naming convention:
`{ClassName}-{Month}-{Year}.csv`

Example: `K2B_Movement-JAN-2024.csv`

## Features

- ✅ Real-time validation
- ✅ Automatic file download
- ✅ Comprehensive payment data
- ✅ Summary statistics
- ✅ Error handling
- ✅ Responsive design
- ✅ User authentication
- ✅ Pre-filled current selections

## Installation

### Backend Dependencies

```bash
cd backend
npm install csv-writer
```

### Frontend Dependencies

```bash
cd frontend
npm install file-saver
```

## Testing

To test the feature:

1. Start the backend server
2. Start the frontend development server
3. Login to the application
4. Select a class from the sidebar
5. Click the "Reports" button
6. Fill in the form and click "Generate Report"
7. The CSV file should download automatically
