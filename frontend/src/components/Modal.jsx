import React from "react";

export default function Modal({ isOpen, onClose, onConfirm, title, children }) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
        </div>
        <div className="p-6 text-gray-300">{children}</div>
        <div className="px-4 py-2 bg-gray-700/50 flex justify-end gap-4 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1 bg-red-600 text-white rounded-md hover:bg-red-500 transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
