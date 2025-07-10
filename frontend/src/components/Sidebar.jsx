import React, { useState, useEffect, useRef, useContext } from "react";
import { GlobalContext } from "../context/GlobalContext";
import api from "../utils/axios";

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  onLogout,
  onMonthChange,
  selectedMonth,
  classes,
  selectedClass,
  onClassChange,
}) {
  const { user, loading } = useContext(GlobalContext);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const monthPickerRef = useRef(null);
  const classPickerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        monthPickerRef.current &&
        !monthPickerRef.current.contains(event.target)
      ) {
        setShowMonthPicker(false);
      }
      if (
        classPickerRef.current &&
        !classPickerRef.current.contains(event.target)
      ) {
        setShowClassPicker(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleClassSelect = (classItem) => {
    onClassChange(classItem);
    setShowClassPicker(false);
  };

  const getInitials = (name) => {
    if (!name) return "";
    const names = name.split(" ");
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return `${names[0][0]}`.toUpperCase();
  };

  const currentDate = new Date().toLocaleDateString("default", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const getFullMonthName = (abbr) => {
    const month = months.find((m) => m.substring(0, 3).toUpperCase() === abbr);
    return month || "";
  };

  const handleMonthSelect = (month) => {
    setShowMonthPicker(false);
    if (onMonthChange) {
      onMonthChange(month.substring(0, 3).toUpperCase());
    }
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden transition-opacity duration-300 ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
      ></div>
      <aside
        className={`fixed inset-y-0 left-0 w-72 bg-gray-800 border-r border-gray-700 flex flex-col z-30 transform transition-transform duration-300 md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <div>
            <div className="text-xl font-bold text-blue-400 mb-1">
              Payment System
            </div>
            <div className="text-sm text-gray-400">Student Management</div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-gray-400 hover:text-white"
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

        <div className="p-6 bg-gray-700 m-4 rounded-lg border border-gray-600">
          {loading ? (
            <div className="animate-pulse">
              <div className="w-16 h-16 rounded-xl bg-gray-600 mb-4"></div>
              <div className="mb-6">
                <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-600 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-600 rounded w-1/3"></div>
              </div>
              <div className="h-10 bg-gray-600 rounded w-full"></div>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xl font-semibold text-white mb-4 shadow-lg">
                {getInitials(user?.name)}
              </div>
              <div className="mb-6">
                <div className="text-lg font-semibold text-white mb-1">
                  {user?.name}
                </div>
                <div className="text-sm text-gray-400 mb-1">
                  {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                </div>
                {
                  !selectedClass ? (
                    <div
                      className="h-4 bg-gray-600 rounded w-20 animate-pulse mt-1"
                      data-testid="class-skeleton"
                    ></div>
                  ) : (
                    <div className="relative" ref={classPickerRef}>
                      <button
                        onClick={() => setShowClassPicker(!showClassPicker)}
                        className="text-sm text-blue-400 font-medium flex items-center gap-2"
                      >
                        <span>
                          Class:{" "}
                          {selectedClass?.className
                            ? selectedClass.className.length > 17
                              ? `${selectedClass.className.slice(0, 17)}...`
                              : selectedClass.className
                            : ""}
                        </span>

                        <svg
                          className={`w-4 h-4 transition-transform duration-200 ${
                            showClassPicker ? "rotate-180" : ""
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                      {showClassPicker && (
                        <div className="absolute top-full left-0 right-0 mt-2 mb-4 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-60 min-w-[250px] max-w-[400px] overflow-y-auto z-50 custom-scrollbar">
                          <div className="flex flex-col gap-1 p-2">
                            {classes.map((classItem) => (
                              <button
                                key={classItem._id}
                                onClick={() => handleClassSelect(classItem)}
                                className={`px-3 py-2 text-sm text-left rounded-md transition-colors duration-150 truncate ${
                                  selectedClass?._id === classItem._id
                                    ? "bg-blue-600 text-white font-semibold"
                                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                                }`}
                                style={{ maxWidth: "350px" }}
                              >
                                <span
                                  className="truncate block w-full"
                                  title={classItem.className}
                                >
                                  {classItem.className}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )

                  // user?.role === "admin" ? (
                  //   <div className="relative" ref={classPickerRef}>
                  //     <button
                  //       onClick={() => setShowClassPicker(!showClassPicker)}
                  //       className="text-sm text-blue-400 font-medium flex items-center gap-2"
                  //     >
                  //       <span>Class: {selectedClass?.className}</span>
                  //       <svg
                  //         className={`w-4 h-4 transition-transform duration-200 ${
                  //           showClassPicker ? "rotate-180" : ""
                  //         }`}
                  //         fill="none"
                  //         stroke="currentColor"
                  //         viewBox="0 0 24 24"
                  //       >
                  //         <path
                  //           strokeLinecap="round"
                  //           strokeLinejoin="round"
                  //           strokeWidth={2}
                  //           d="M19 9l-7 7-7-7"
                  //         />
                  //       </svg>
                  //     </button>
                  //     {showClassPicker && (
                  //       <div className="absolute top-full left-0 right-0 mt-2 mb-4 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-50 overflow-y-auto z-50 custom-scrollbar">
                  //         <div className="flex flex-col gap-1 p-2">
                  //           {classes.map((classItem) => (
                  //             <button
                  //               key={classItem._id}
                  //               onClick={() => handleClassSelect(classItem)}
                  //               className="px-3 py-2 text-sm text-left text-gray-300 hover:bg-gray-700 hover:text-white rounded-md transition-colors duration-150"
                  //             >
                  //               {classItem.className}
                  //             </button>
                  //           ))}
                  //         </div>
                  //       </div>
                  //     )}
                  //   </div>
                  // ) : (
                  //   <div className="text-sm text-blue-400 font-medium">
                  //     Class: {selectedClass?.className}
                  //   </div>
                  //)
                }
              </div>
              <button
                onClick={onLogout}
                className="w-full py-2.5 bg-red-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-red-600 transition-colors duration-200 shadow-md"
              >
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
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Logout
              </button>
            </>
          )}
        </div>

        {/* Month Selector Section */}
        <div className="p-4 mx-4 bg-gray-700/50 rounded-lg border border-gray-600/50 backdrop-blur-sm">
          <div className="relative" ref={monthPickerRef}>
            <button
              onClick={() => setShowMonthPicker(!showMonthPicker)}
              className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg flex items-center justify-between hover:bg-gray-750 transition-colors duration-200 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-xs text-gray-400 mb-0.5">
                    Selected Period
                  </div>
                  <div className="text-sm font-semibold text-white">
                    {`${getFullMonthName(
                      selectedMonth
                    )} ${new Date().getFullYear()}`}
                  </div>
                </div>
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                  showMonthPicker ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Month Dropdown */}
            {showMonthPicker && (
              <div className="absolute top-full left-0 right-0 mt-2 mb-4 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-50 overflow-y-auto z-50 custom-scrollbar">
                <div className="grid grid-cols-2 gap-1 p-2">
                  {months.map((month) => {
                    const abbr = month.substring(0, 3).toUpperCase();
                    const isSelected = abbr === selectedMonth;
                    return (
                      <button
                        key={month}
                        onClick={() => handleMonthSelect(month)}
                        className={`px-3 py-2 text-sm text-left rounded-md transition-colors duration-150 ${
                          isSelected
                            ? "bg-blue-600 text-white font-bold"
                            : "text-gray-300 hover:bg-gray-700 hover:text-white"
                        }`}
                      >
                        {month}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Current Date Display */}
          <div className="mt-3 p-3 bg-gray-800/50 rounded-lg border border-gray-600/30">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <div className="text-xs text-gray-400">Today</div>
            </div>
            <div className="text-sm text-gray-300 font-medium">
              {currentDate}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
