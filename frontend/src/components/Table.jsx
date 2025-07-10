import React, { useState, useEffect } from "react";

export default function Table({
  students,
  setStudents,
  onPersistToggle,
  loading = false,
  isPageLoading = false,
  stats,
  currentPage,
  setCurrentPage,
  hasNextPage,
}) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [toggledStudents, setToggledStudents] = useState({});
  const perPage = 15;

  // When the source students for the page change, clear local toggles.
  useEffect(() => {
    setToggledStudents({});
  }, [students]);

  const applyPendingToggles = () => {
    if (Object.keys(toggledStudents).length === 0) return;

    // Create a new students array with the toggled statuses applied
    const updatedStudents = students.map((s) => {
      if (toggledStudents[s.id]) {
        return { ...s, status: toggledStudents[s.id] };
      }
      return s;
    });

    // Update the parent state
    setStudents(updatedStudents);
    // Clear the local toggles
    setToggledStudents({});
  };

  const handleFilterChange = (newFilter) => {
    applyPendingToggles();
    setFilter(newFilter);
  };

  const handleToggle = async (studentId, studentName, dob) => {
    const originalStudent = students.find((s) => s.id === studentId);
    if (!originalStudent) return;

    // Determine the state before this toggle operation
    const statusBeforeToggle =
      toggledStudents[studentId] || originalStudent.status;

    // Determine the new status
    const newStatus = statusBeforeToggle === "paid" ? "not-paid" : "paid";

    // Update the local visual state optimistically
    setToggledStudents((prev) => ({
      ...prev,
      [studentId]: newStatus,
    }));

    try {
      // Notify the parent to persist the change
      await onPersistToggle(studentId, studentName, dob, newStatus);
    } catch (error) {
      // If persistence fails, revert the optimistic UI change.
      // The error message is already set by the parent component.
      setToggledStudents((prev) => ({
        ...prev,
        [studentId]: statusBeforeToggle,
      }));
    }
  };

  const totalPages = Math.ceil(stats.total / perPage);

  const getPaginationNumbers = () => {
    if (totalPages <= 1) return [];
    const window = 1; // Pages to show around current page
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - window && i <= currentPage + window)
      ) {
        pages.push(i);
      }
    }
    const withDots = [];
    let lastPage = 0;
    for (const page of pages) {
      if (lastPage !== 0 && page - lastPage > 1) {
        withDots.push("...");
      }
      withDots.push(page);
      lastPage = page;
    }
    return withDots;
  };

  const paginationNumbers = getPaginationNumbers();

  // The list used for rendering is now filtered from the current page's students
  const filteredStudents = students.filter((s) => {
    // Apply local toggles for instant feedback before filtering
    const displayStatus = toggledStudents[s.id] || s.status;
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === "all" || displayStatus === filter;
    return matchesSearch && matchesFilter;
  });

  const StatsCardSkeleton = () => (
    <div className="bg-gray-700 px-2 sm:px-4 py-2 rounded-lg border border-gray-600 text-center animate-pulse">
      <div className="h-7 sm:h-8 bg-gray-600 rounded mb-2 mx-auto w-16"></div>
      <div className="h-4 bg-gray-600 rounded w-24 mx-auto"></div>
    </div>
  );

  const StudentRowSkeleton = () => (
    <div className="flex items-center justify-between bg-gray-700 p-2 sm:p-3 rounded-lg border border-gray-600 animate-pulse">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-8 h-8 bg-gray-600 rounded-lg flex-shrink-0"></div>
        <div className="flex-1">
          <div className="h-4 bg-gray-600 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-600 rounded w-24"></div>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="w-16 h-6 bg-gray-600 rounded-sm"></div>
        <div className="w-7 h-7 bg-gray-600 rounded"></div>
      </div>
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:gap-4 p-4 border-b border-gray-700">
        {loading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <div className="bg-gray-700 px-2 sm:px-4 py-2 rounded-lg border border-gray-600 text-center">
              <div className="text-lg sm:text-2xl font-bold text-white">
                {stats.total}
              </div>
              <div className="text-xs sm:text-sm text-gray-400 mt-1">
                Total Students
              </div>
            </div>
            <div className="bg-gray-700 px-2 sm:px-4 py-2 rounded-lg border border-gray-600 text-center">
              <div className="text-lg sm:text-2xl font-bold text-white">
                {stats.paid}
              </div>
              <div className="text-xs sm:text-sm text-gray-400 mt-1">Paid</div>
            </div>
            <div className="bg-gray-700 px-2 sm:px-4 py-2 rounded-lg border border-gray-600 text-center">
              <div className="text-lg sm:text-2xl font-bold text-white">
                {stats.unpaid}
              </div>
              <div className="text-xs sm:text-sm text-gray-400 mt-1">
                Unpaid
              </div>
            </div>
          </>
        )}
      </div>

      <div className="p-4 border-b border-gray-700">
        <div className="flex flex-col sm:flex-row items-center">
          <div className="relative flex-1 w-full">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search students..."
              className="w-full pl-10 pr-3 py-2 border border-gray-600 rounded-lg bg-gray-700 text-white focus:outline-none focus:border-blue-400 focus:bg-gray-600 placeholder-gray-400 text-sm"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              disabled={loading}
            />
          </div>
          <div className="flex mt-3 sm:mt-0 sm:ml-4 bg-gray-800 rounded-lg overflow-hidden flex-wrap justify-center">
            {["all", "not-paid", "paid"].map((f) => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                disabled={loading}
                className={`px-4 py-1.5 font-medium text-sm transition flex-grow sm:flex-grow-0 ${
                  filter === f
                    ? f === "all"
                      ? "bg-blue-500 text-white"
                      : f === "paid"
                      ? "bg-green-500 text-white"
                      : "bg-red-500 text-white"
                    : "text-gray-300 hover:bg-gray-700"
                } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {f === "all" ? "All" : f === "paid" ? "Paid" : "Unpaid"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 sm:p-4 custom-scrollbar">
        {isPageLoading ? (
          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <StudentRowSkeleton key={i} />
            ))}
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center text-blue-300">
            <div className="text-2xl font-semibold mb-2">No students found</div>
            <div className="text-base text-blue-200 opacity-80">
              Try adjusting your filters or search to find students.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredStudents.map((s) => {
              const isToggled = toggledStudents[s.id] !== undefined;
              const displayStatus = isToggled
                ? toggledStudents[s.id]
                : s.status;

              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between bg-gray-700 p-2 sm:p-3 rounded-lg border border-gray-600 hover:bg-gray-600 transition"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-blue-500 text-white flex items-center justify-center font-semibold text-sm rounded-lg flex-shrink-0">
                      {s.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
                        <div className="text-sm font-medium text-white truncate">
                          {s.name}
                        </div>
                        <div className="text-xs text-gray-400 flex items-center gap-1">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                          </svg>
                          {s.parentPhone}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 mt-1">
                        <div className="text-xs text-gray-400">
                          {displayStatus === "paid"
                            ? `Paid: ${s.paymentDate}`
                            : `Due: ${s.paymentDue} days`}
                        </div>
                        <div className="text-xs text-gray-500">
                          DOB: {s.dob}
                        </div>
                        {displayStatus !== "paid" && s.paymentDue && (
                          <div className="text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap">
                            <svg
                              className="w-3 h-3 flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                            </svg>
                            <span>Last notified: {s.lastReminderDate}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 text-xs font-medium rounded-sm ${
                        displayStatus === "paid"
                          ? "bg-green-500 text-white"
                          : "bg-red-500 text-white"
                      }`}
                    >
                      {displayStatus === "paid" ? (
                        <>
                          <svg
                            className="w-3.5 h-3.5 hidden sm:block"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Paid
                        </>
                      ) : (
                        <>
                          <svg
                            className="w-3.5 h-3.5 hidden sm:block"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                          Unpaid
                        </>
                      )}
                    </span>
                    <div
                      onClick={() => handleToggle(s.id, s.name, s.dob)}
                      className={`w-7 h-7 rounded flex items-center justify-center transition cursor-pointer flex-shrink-0 ${
                        displayStatus === "paid"
                          ? "bg-green-500 border border-green-500"
                          : "bg-gray-800 border border-gray-600"
                      }`}
                    >
                      {displayStatus === "paid" && (
                        <svg
                          className="w-5 h-5 text-white"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-2 sm:px-4 py-2 border-t border-gray-700 bg-gray-800">
        {loading ? (
          <div className="flex justify-between w-full">
            <div className="h-4 bg-gray-600 rounded w-24 animate-pulse"></div>
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-8 h-8 bg-gray-600 rounded animate-pulse"></div>
              <div className="w-8 h-8 bg-gray-600 rounded animate-pulse"></div>
            </div>
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-400">
              {stats.total > 0
                ? `Showing ${(currentPage - 1) * perPage + 1} - ${
                    (currentPage - 1) * perPage + students.length
                  } of ${stats.total}`
                : "0 of 0"}
            </div>
            <div className="flex items-center gap-1 sm:gap-2 text-xs">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="w-8 h-8 flex items-center justify-center text-sm bg-gray-700 border border-gray-600 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ←
              </button>

              <div className="hidden sm:flex items-center gap-2">
                {paginationNumbers.map((pageNumber, index) =>
                  pageNumber === "..." ? (
                    <span
                      key={`dots-${index}`}
                      className="px-2 py-1 text-gray-400"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={pageNumber}
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`w-8 h-8 flex items-center justify-center rounded ${
                        currentPage === pageNumber
                          ? "bg-blue-500 text-white"
                          : "bg-gray-700 border border-gray-600 hover:bg-gray-600 text-gray-300"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  )
                )}
              </div>

              <span className="sm:hidden text-gray-400 px-2">
                {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={!hasNextPage}
                className="w-8 h-8 flex items-center justify-center text-sm bg-gray-700 border border-gray-600 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                →
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
