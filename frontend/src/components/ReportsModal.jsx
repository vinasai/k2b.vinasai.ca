import React, { useState, useEffect, useRef } from "react";

// A minimalist Icon component using single-color SVG paths for a professional look
const Icon = ({ path, className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d={path}
    />
  </svg>
);

// A placeholder Modal for demonstration purposes.
const Modal = ({ isOpen, onClose, title, size = "xl", children }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 font-sans">
      <div
        className={`bg-gray-800 text-white rounded-xl shadow-2xl w-full ${sizeClasses[size]} transform transition-all duration-300 ease-out`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <Icon path="M6 18L18 6M6 6l12 12" className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// A fully custom, reusable Select component with scrolling and better UX.
const CustomSelect = ({ options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref]);

  const selectedOption = options.find((option) => option.value === value);

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full pl-3 pr-5 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex justify-between items-center"
      >
        <span className={selectedOption ? "text-white" : "text-gray-400"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <Icon
          path="M19 9l-7 7-7-7"
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto custom-scrollbar">
          {options.map((option) => (
            <div
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`px-3 py-2 cursor-pointer hover:bg-blue-600 ${
                option.value === value ? "bg-blue-700" : ""
              }`}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// This is the main component you are working on.
export default function ReportsModal({
  isOpen,
  onClose,
  classes = [
    // Mock data for demonstration
    { _id: "1", className: "K2B Movement" },
    { _id: "2", className: "Advanced Yoga" },
    { _id: "3", className: "Cardio Blast" },
    { _id: "4", className: "Monday/Friday Batch" },
    { _id: "5", className: "Tuesday/Thursday Kids" },
    { _id: "6", className: "Big Batch" },
    { _id: "7", className: "Mini Stars" },
    { _id: "8", className: "Middle Batch 1" },
    { _id: "9", className: "Monday Ladies Batch" },
    { _id: "10", className: "Middle Batch 2" },
    { _id: "11", className: "Wednesday Ladies Batch" },
    { _id: "12", className: "Monday/Saturday Batch" },
  ],
  selectedClass: dashboardSelectedClass,
}) {
  const [selectedClass, setSelectedClass] = useState(null);
  const [dateRange, setDateRange] = useState("single"); // "single" or "range"
  const [singleMonth, setSingleMonth] = useState(
    new Date().toLocaleString("default", { month: "short" }).toUpperCase()
  );
  const [startMonth, setStartMonth] = useState("JAN");
  const [endMonth, setEndMonth] = useState("DEC");
  const [exportType, setExportType] = useState("pdf"); // "pdf" or "csv"
  const [isGenerating, setIsGenerating] = useState(false);

  const months = [
    { abbr: "JAN", full: "January" },
    { abbr: "FEB", full: "February" },
    { abbr: "MAR", full: "March" },
    { abbr: "APR", full: "April" },
    { abbr: "MAY", full: "May" },
    { abbr: "JUN", full: "June" },
    { abbr: "JUL", full: "July" },
    { abbr: "AUG", full: "August" },
    { abbr: "SEP", full: "September" },
    { abbr: "OCT", full: "October" },
    { abbr: "NOV", full: "November" },
    { abbr: "DEC", full: "December" },
  ];

  // Effect to reset the state completely every time the modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedClass(dashboardSelectedClass || null);
      setDateRange("single");
      setExportType("pdf");
      setSingleMonth(
        new Date().toLocaleString("default", { month: "short" }).toUpperCase()
      );
      setStartMonth("JAN");
      setEndMonth("DEC");
      setIsGenerating(false);
    }
  }, [isOpen, dashboardSelectedClass]);

  const startMonthIndex = months.findIndex((m) => m.abbr === startMonth);
  const availableEndMonths = months.slice(startMonthIndex);

  useEffect(() => {
    if (
      dateRange === "range" &&
      !availableEndMonths.some((m) => m.abbr === endMonth)
    ) {
      setEndMonth(startMonth);
    }
  }, [startMonth, dateRange, availableEndMonths, endMonth]);

  const handleClassChange = (classId) => {
    if (classId === "all") {
      setSelectedClass({ _id: "all", className: "All Classes" });
    } else {
      const selectedClassObj = classes.find((c) => c._id === classId);
      setSelectedClass(selectedClassObj);
    }
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    const reportParams = {
      classId: selectedClass?._id,
      className: selectedClass?.className,
      dateRange,
      exportType,
      year: new Date().getFullYear(),
      ...(dateRange === "single" ? { singleMonth } : { startMonth, endMonth }),
    };
    console.log("Generating report with params:", reportParams);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      onClose();
    } catch (error) {
      console.error("Failed to generate report:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const getDateRangeDisplay = () => {
    if (!selectedClass) return "—";
    const year = new Date().getFullYear();
    if (dateRange === "single") {
      const month = months.find((m) => m.abbr === singleMonth);
      return `${month?.full} ${year}`;
    } else {
      const start = months.find((m) => m.abbr === startMonth)?.full;
      const end = months.find((m) => m.abbr === endMonth)?.full;
      return `${start} - ${end} ${year}`;
    }
  };

  const classOptions = [
    { value: "all", label: "All Classes" },
    ...classes.map((c) => ({ value: c._id, label: c.className })),
  ];

  const monthOptions = months.map((m) => ({ value: m.abbr, label: m.full }));
  const endMonthOptions = availableEndMonths.map((m) => ({
    value: m.abbr,
    label: m.full,
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Report" size="xl">
      <div className="space-y-6">
        {/* --- Step 1: Class Selection --- */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Class
          </label>
          <CustomSelect
            options={classOptions}
            value={selectedClass?._id}
            onChange={handleClassChange}
            placeholder="Select a class..."
          />
        </div>

        {/* --- Step 2: Date Range --- */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Date Range
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-900/50 rounded-lg mb-3">
            <button
              onClick={() => setDateRange("single")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                dateRange === "single"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              Single Month
            </button>
            <button
              onClick={() => setDateRange("range")}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                dateRange === "range"
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              Month Range
            </button>
          </div>
          {dateRange === "single" && (
            <CustomSelect
              options={monthOptions}
              value={singleMonth}
              onChange={setSingleMonth}
              placeholder="Select a month..."
            />
          )}
          {dateRange === "range" && (
            <div className="flex items-center gap-2">
              <CustomSelect
                options={monthOptions}
                value={startMonth}
                onChange={setStartMonth}
                placeholder="Start month..."
              />
              <span className="text-gray-400 font-medium">to</span>
              <CustomSelect
                options={endMonthOptions}
                value={endMonth}
                onChange={setEndMonth}
                placeholder="End month..."
              />
            </div>
          )}
        </div>

        {/* --- Step 3: Export Format --- */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Format
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                id: "pdf",
                title: "PDF",
                desc: "Visual report with charts",
                icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
              },
              {
                id: "csv",
                title: "CSV",
                desc: "Spreadsheet-ready data",
                icon: "M3 10h18M3 6h18M3 14h18M3 18h18",
              },
            ].map((item) => (
              <label
                key={item.id}
                className={`relative flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                  exportType === item.id
                    ? "border-blue-500 bg-gray-700/60"
                    : "border-gray-600 bg-gray-700/30 hover:border-gray-500"
                }`}
              >
                <input
                  type="radio"
                  name="exportType"
                  value={item.id}
                  checked={exportType === item.id}
                  onChange={(e) => setExportType(e.target.value)}
                  className="absolute opacity-0"
                />
                <div
                  className={`mr-4 text-gray-400 ${
                    exportType === item.id && "text-blue-400"
                  }`}
                >
                  <Icon path={item.icon} className="w-8 h-8" />
                </div>
                <div>
                  <span className="font-semibold text-white">{item.title}</span>
                  <p className="text-sm text-gray-400">{item.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <hr className="border-gray-700" />

        {/* --- Summary & Actions --- */}
        <div className="space-y-4">
          <div className="text-sm">
            <p className="flex justify-between text-gray-400">
              <span>Class:</span>{" "}
              <span className="font-medium text-gray-200">
                {selectedClass?.className || (
                  <span className="text-yellow-500">Not Selected</span>
                )}
              </span>
            </p>
            <p className="flex justify-between text-gray-400">
              <span>Period:</span>{" "}
              <span className="font-medium text-gray-200">
                {getDateRangeDisplay()}
              </span>
            </p>
            <p className="flex justify-between text-gray-400">
              <span>Format:</span>{" "}
              <span className="font-medium text-gray-200">
                {exportType.toUpperCase()}
              </span>
            </p>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              disabled={isGenerating}
              className="px-5 py-2 text-sm font-medium text-gray-300 bg-transparent border border-gray-600 rounded-lg hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateReport}
              disabled={!selectedClass || isGenerating}
              className="px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isGenerating && (
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              <span>{isGenerating ? "Generating..." : "Generate Report"}</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
