import React, { useState, useEffect } from "react";
import { saveAs } from "file-saver";
import api from "../../utils/axios";
import CustomInput from "../CustomInput";
import CustomSelect from "../CustomSelect";

const ReportGenerator = ({ classes, selectedClass, onClose }) => {
  const CURRENT_YEAR = new Date().getFullYear();
  const [formData, setFormData] = useState({
    classId: selectedClass?._id || "",
    month: "",
    year: CURRENT_YEAR,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [errors, setErrors] = useState({});

  const months = [
    { value: "JAN", label: "January" },
    { value: "FEB", label: "February" },
    { value: "MAR", label: "March" },
    { value: "APR", label: "April" },
    { value: "MAY", label: "May" },
    { value: "JUN", label: "June" },
    { value: "JUL", label: "July" },
    { value: "AUG", label: "August" },
    { value: "SEP", label: "September" },
    { value: "OCT", label: "October" },
    { value: "NOV", label: "November" },
    { value: "DEC", label: "December" },
  ];

  // Set current month as default
  useEffect(() => {
    const currentMonth = months[new Date().getMonth()].value;
    setFormData((prev) => ({ ...prev, month: currentMonth }));
  }, []);

  // Update class when selectedClass changes
  useEffect(() => {
    if (selectedClass?._id) {
      setFormData((prev) => ({ ...prev, classId: selectedClass._id }));
    }
  }, [selectedClass]);

  const clampYear = (raw) => {
    if (raw === "" || raw === null || raw === undefined) return "";
    const parsed = parseInt(String(raw).replace(/[^0-9]/g, ""), 10);
    if (Number.isNaN(parsed)) return "";
    const min = 2020;
    const max = CURRENT_YEAR;
    return Math.max(min, Math.min(max, parsed));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "year") {
      const clamped = clampYear(value);
      setFormData((prev) => ({ ...prev, year: clamped }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleYearBlur = () => {
    setFormData((prev) => ({ ...prev, year: clampYear(prev.year) }));
  };

  const handleCustomSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.classId) {
      newErrors.classId = "Please select a class";
    }

    if (!formData.month) {
      newErrors.month = "Please select a month";
    }

    if (
      !formData.year ||
      formData.year < 2020 ||
      formData.year > CURRENT_YEAR
    ) {
      newErrors.year = "Please enter a valid year (past or current)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerateReport = async () => {
    if (!validateForm()) {
      return;
    }

    setIsGenerating(true);

    try {
      const response = await api.post("/reports/generate", formData, {
        responseType: "blob",
      });

      // Get filename from response headers or create default
      const contentDisposition = response.headers["content-disposition"];
      let filename = `report-${formData.month}-${formData.year}.csv`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = new Blob([response.data], { type: "text/csv" });
      saveAs(blob, filename);

      // Show success message or close modal
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error("Error generating report:", error);

      // Handle different error types
      if (error.response?.status === 404) {
        setErrors({
          general: "No data found for the selected class and period",
        });
      } else if (error.response?.status === 400) {
        setErrors({
          general: error.response.data?.message || "Invalid input parameters",
        });
      } else {
        setErrors({ general: "Failed to generate report. Please try again." });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedClassName =
    classes?.find((c) => c._id === formData.classId)?.className || "";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
          <svg
            className="w-6 h-6 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">
            Generate Payment Report
          </h3>
          <p className="text-sm text-gray-400">
            Download CSV report for class payment records
          </p>
        </div>
      </div>

      {errors.general && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{errors.general}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Class Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Class <span className="text-red-400">*</span>
          </label>
          <CustomSelect
            name="classId"
            value={formData.classId}
            onChange={handleCustomSelectChange}
            options={
              classes?.map((classItem) => ({
                value: classItem._id,
                label: classItem.className,
              })) || []
            }
            placeholder="Choose a class"
            error={errors.classId}
          />
          {errors.classId && (
            <p className="mt-1 text-sm text-red-400">{errors.classId}</p>
          )}
        </div>

        {/* Month Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Month <span className="text-red-400">*</span>
          </label>
          <CustomSelect
            name="month"
            value={formData.month}
            onChange={handleCustomSelectChange}
            options={months}
            placeholder="Choose a month"
            error={errors.month}
          />
          {errors.month && (
            <p className="mt-1 text-sm text-red-400">{errors.month}</p>
          )}
        </div>

        {/* Year Input */}
        <div>
          <CustomInput
            label="Year"
            name="year"
            type="number"
            value={formData.year}
            onChange={handleInputChange}
            onBlur={handleYearBlur}
            placeholder="Enter year"
            min={2020}
            max={CURRENT_YEAR}
            step={1}
            inputMode="numeric"
            required
            error={errors.year}
          />
        </div>
      </div>

      {/* Preview Information */}
      {formData.classId && formData.month && formData.year && (
        <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600/50">
          <h4 className="text-sm font-medium text-gray-300 mb-2">
            Report Preview
          </h4>
          <div className="text-sm text-gray-400 space-y-1">
            <p>
              <span className="text-gray-300">Class:</span> {selectedClassName}
            </p>
            <p>
              <span className="text-gray-300">Period:</span>{" "}
              {months.find((m) => m.value === formData.month)?.label}{" "}
              {formData.year}
            </p>
            <p>
              <span className="text-gray-300">Format:</span> CSV file
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Generating...
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Generate Report
            </>
          )}
        </button>

        {onClose && (
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default ReportGenerator;
