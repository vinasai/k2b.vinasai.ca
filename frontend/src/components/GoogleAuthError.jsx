import React from "react";

const GoogleAuthError = ({ authUrl, onRenew }) => {
  const handleRenewClick = () => {
    if (onRenew) {
      onRenew();
    }
    window.location.href = authUrl;
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 mx-10">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700">
        <h2 className="text-2xl font-bold text-red-500 mb-4">
          Google Authentication Required
        </h2>
        <p className="mb-6">
          Your access to Google Sheets has expired or is not configured. Please
          re-authenticate to continue.
        </p>
        <button
          onClick={handleRenewClick}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors duration-300"
        >
          Renew Authentication
        </button>
      </div>
    </div>
  );
};

export default GoogleAuthError;
