import React from "react";
import ReportGenerator from "./reports/ReportGenerator";

const ReportsModal = ({ isOpen, onClose, classes, selectedClass }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
      <div className="bg-gray-800 text-white rounded-xl shadow-2xl w-full max-w-xl transform transition-all duration-300 ease-out flex flex-col max-h-[95vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          <h3 className="text-lg font-semibold">Payment Reports</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto">
          <ReportGenerator
            classes={classes}
            selectedClass={selectedClass}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};

export default ReportsModal;
