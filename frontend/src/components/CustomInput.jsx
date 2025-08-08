// src/components/CustomInput.js

import React from "react";

// CSS to hide date picker calendar icon
const dateInputStyles = `
  input[type="date"]::-webkit-calendar-picker-indicator {
    display: none !important;
    -webkit-appearance: none !important;
  }
  input[type="date"]::-webkit-inner-spin-button,
  input[type="date"]::-webkit-outer-spin-button {
    -webkit-appearance: none !important;
    margin: 0 !important;
  }
  input[type="date"] {
    -moz-appearance: textfield !important;
  }
`;

const CustomInput = ({ label, id, icon: Icon, type = "text", ...props }) => {
  return (
    <div>
      {type === "date" && <style>{dateInputStyles}</style>}
      <label
        htmlFor={id}
        className="block text-xs font-medium text-gray-400 mb-1"
      >
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Icon className="h-4 w-4 text-gray-400" />
          </div>
        )}
        <input
          type={type}
          id={id}
          // Add padding for the icon if it exists
          className={`block w-full rounded-lg border border-gray-600 bg-gray-800 py-2.5 text-sm text-white placeholder-gray-400 transition-all duration-200 hover:border-gray-500 focus:border-blue-500 focus:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
            Icon ? "pl-10" : "pl-4"
          } pr-4 ${
            // Special styling for date input to ensure dark theme is respected
            type === "date" ? "[color-scheme:dark]" : ""
          }`}
          style={{
            // Remove default date input styling and ensure date picker works
            ...(type === "date" && {
              WebkitAppearance: "none",
              MozAppearance: "textfield",
              cursor: "pointer",
            }),
          }}
          onFocus={
            type === "date"
              ? (e) => {
                  e.target.showPicker && e.target.showPicker();
                  props.onFocus && props.onFocus(e);
                }
              : props.onFocus
          }
          {...props} // Pass down other props like value, onChange, placeholder, disabled, etc.
        />
      </div>
    </div>
  );
};

export default CustomInput;
