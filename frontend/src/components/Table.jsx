import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
} from "react";
import { GlobalContext } from "../context/GlobalContext";
import Modal from "./Modal";
import formatPhoneNumber from "../utils/formatPhone";

export default function Table({
  students,
  setStudents,
  onPersistToggle,
  onUpdateStudent,
  onDeleteStudent,
  studentsLoading = false,
  isInitialLoading = false,
  statsLoading = false,
  isPageLoading = false,
  stats,
  hasNextPage,
  onLoadMore,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  month,
}) {
  const { user } = useContext(GlobalContext);
  const [toggledStudents, setToggledStudents] = useState({});
  const [originalFilterStatus, setOriginalFilterStatus] = useState({});
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    parentPhone: "",
    dob: "",
  });
  const [studentToDelete, setStudentToDelete] = useState(null);
  const editFormRef = useRef(null);
  const perPage = 15;

  const formatDateForInput = (dateStr = "") => {
    if (!dateStr || !dateStr.includes("/")) return "";
    const parts = dateStr.split("/");
    if (parts.length !== 3) return "";
    const [month, day, year] = parts;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0"
    )}`;
  };

  const formatDateForStorage = (dateStr = "") => {
    if (!dateStr || !dateStr.includes("-")) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return "";
    const [year, month, day] = parts;
    return `${parseInt(month, 10)}/${parseInt(day, 10)}/${year}`;
  };

  const handleEditClick = (student) => {
    if (editingStudentId === student.id) {
      setEditingStudentId(null);
    } else {
      setEditingStudentId(student.id);
      setEditFormData({
        name: student.name,
        parentPhone: student.parentPhone,
        dob: formatDateForInput(student.dob),
      });
    }
  };

  const handleUpdate = async () => {
    if (!editingStudentId) return;
    const unformattedPhone = (editFormData.parentPhone || "").replace(
      /\D/g,
      ""
    );
    await onUpdateStudent(editingStudentId, {
      ...editFormData,
      parentPhone: unformattedPhone,
      dob: formatDateForStorage(editFormData.dob),
    });
    setEditingStudentId(null);
  };

  const handleDeleteClick = (student) => {
    setStudentToDelete(student);
  };

  const confirmDelete = async () => {
    if (!studentToDelete) return;
    await onDeleteStudent(studentToDelete.id);
    setStudentToDelete(null);
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        editFormRef.current &&
        !editFormRef.current.contains(event.target) &&
        !event.target.closest(".edit-button-class")
      ) {
        setEditingStudentId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // For infinite scroll
  const observer = useRef();
  const lastStudentElementRef = useCallback(
    (node) => {
      if (isPageLoading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasNextPage) {
          onLoadMore();
        }
      });
      if (node) observer.current.observe(node);
    },
    [isPageLoading, hasNextPage]
  );

  // When the source students for the page change or filter changes,
  useEffect(() => {
    setToggledStudents({});

    // Capture the original status of each student for the current filter view
    const originalStatus = {};
    students.forEach((student) => {
      originalStatus[student.id] = student.status;
    });
    setOriginalFilterStatus(originalStatus);
  }, [students, filter]);

  const monthMap = {
    JAN: 0,
    FEB: 1,
    MAR: 2,
    APR: 3,
    MAY: 4,
    JUN: 5,
    JUL: 6,
    AUG: 7,
    SEP: 8,
    OCT: 9,
    NOV: 10,
    DEC: 11,
  };

  const calculateDueDays = (monthName) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthIndex = today.getMonth();
    const selectedMonthIndex = monthMap[monthName];

    if (selectedMonthIndex < currentMonthIndex) {
      const firstOfMonth = new Date(currentYear, selectedMonthIndex, 1);
      const msPerDay = 1000 * 60 * 60 * 24;

      return Math.floor((today - firstOfMonth) / msPerDay);
    } else if (selectedMonthIndex === currentMonthIndex) {
      return today.getDate();
    } else {
      return 0;
    }
  };

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
    onFilterChange(newFilter);
  };

  const handleToggle = async (studentId, studentName, dob, parentPhone) => {
    const originalStudent = students.find((s) => s.id === studentId);
    if (!originalStudent) return;

    // Determine the state before this toggle operation
    const statusBeforeToggle =
      toggledStudents[studentId]?.status || originalStudent.status;

    // Determine the new status
    const newStatus = statusBeforeToggle === "paid" ? "not-paid" : "paid";
    const newPaymentDate =
      newStatus === "paid" ? new Date().toLocaleDateString("en-GB") : "";
    const markedBy = newStatus === "paid" ? user?.name || "" : "";

    const previousToggleState = toggledStudents[studentId];

    // Update the local visual state optimistically
    setToggledStudents((prev) => ({
      ...prev,
      [studentId]: {
        status: newStatus,
        paymentDate: newPaymentDate,
        markedBy: markedBy,
        paymentDue:
          newStatus === "not-paid" ? calculateDueDays(month) : undefined,
      },
    }));

    try {
      // Notify the parent to persist the change
      await onPersistToggle(
        studentId,
        studentName,
        dob,
        parentPhone,
        newStatus,
        markedBy
      );
    } catch (error) {
      // If persistence fails, revert the optimistic UI change.
      // The error message is already set by the parent component.
      setToggledStudents((prev) => {
        const revertedToggles = { ...prev };
        if (previousToggleState) {
          revertedToggles[studentId] = previousToggleState;
        } else {
          delete revertedToggles[studentId];
        }
        return revertedToggles;
      });
    }
  };

  // The list used for rendering is now filtered based on original status
  const filteredStudents = students.filter((s) => {
    // Use the original status for filtering to keep students in view
    const filterStatus = originalFilterStatus[s.id] || s.status;
    const matchesFilter = filter === "all" || filterStatus === filter;
    return matchesFilter;
  });

  const StatsCardSkeleton = () => (
    <div className="bg-gray-700 px-2 sm:px-4 py-2 rounded-lg border border-gray-600 text-center animate-pulse">
      <div className="h-7 sm:h-8 bg-gray-600 rounded mb-2 mx-auto w-16"></div>
      <div className="h-4 bg-gray-600 rounded w-16 mx-auto"></div>
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
        {statsLoading ? (
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
                onSearchChange(e.target.value);
              }}
              disabled={studentsLoading}
            />
          </div>
          <div className="flex mt-3 sm:mt-0 sm:ml-4 bg-gray-800 rounded-lg overflow-hidden flex-wrap justify-center">
            {["all", "not-paid", "paid"].map((f) => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                disabled={studentsLoading}
                className={`px-4 py-1.5 font-medium text-sm transition flex-grow sm:flex-grow-0 ${
                  filter === f
                    ? f === "all"
                      ? "bg-blue-500 text-white"
                      : f === "paid"
                      ? "bg-green-500 text-white"
                      : "bg-red-500 text-white"
                    : "text-gray-300 hover:bg-gray-700"
                } ${studentsLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {f === "all" ? "All" : f === "paid" ? "Paid" : "Unpaid"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto p-2 sm:p-4 custom-scrollbar"
        style={{ minHeight: "400px" }}
      >
        {isInitialLoading ? (
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
            {filteredStudents.map((s, index) => {
              const isToggled = toggledStudents[s.id] !== undefined;
              const displayInfo = isToggled
                ? {
                    status: toggledStudents[s.id].status,
                    paymentDate: toggledStudents[s.id].paymentDate,
                    paymentMarkedBy: toggledStudents[s.id].markedBy,
                    paymentDue: toggledStudents[s.id].paymentDue,
                  }
                : {
                    status: s.status,
                    paymentDate: s.paymentDate,
                    paymentMarkedBy: s.paymentMarkedBy,
                    paymentDue: s.paymentDue,
                  };

              const isLastElement = index === filteredStudents.length - 1;

              return (
                <div
                  ref={isLastElement ? lastStudentElementRef : null}
                  key={s.id}
                  className="bg-gray-700 rounded-lg border border-gray-600 hover:bg-gray-600 transition"
                >
                  <div className="flex items-center justify-between p-2 sm:p-3">
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
                        <div className="hidden sm:flex flex-col sm:flex-row sm:items-center sm:gap-3 mt-1">
                          <div className="text-xs text-gray-400">
                            {displayInfo.status === "paid"
                              ? `Paid: ${displayInfo.paymentDate}`
                              : `Due: ${displayInfo.paymentDue} days`}
                          </div>
                          {displayInfo.status === "paid" &&
                            displayInfo.paymentMarkedBy && (
                              <div className="text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap">
                                <svg
                                  className="w-3 h-3 flex-shrink-0"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                <span>
                                  Marked by: {displayInfo.paymentMarkedBy}
                                </span>
                              </div>
                            )}
                          {displayInfo.status !== "paid" &&
                            typeof s.paymentDue === "number" &&
                            s.lastReminderDate && (
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
                      {user?.role === "admin" && (
                        <>
                          <button
                            onClick={() => handleEditClick(s)}
                            className="p-1 text-gray-400 hover:text-white transition edit-button-class"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteClick(s)}
                            className="p-1 text-gray-400 hover:text-red-500 transition"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </>
                      )}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-1 text-xs font-medium rounded-sm ${
                          displayInfo.status === "paid"
                            ? "bg-green-500 text-white"
                            : "bg-red-500 text-white"
                        }`}
                      >
                        {displayInfo.status === "paid" ? (
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
                        onClick={() =>
                          handleToggle(s.id, s.name, s.dob, s.parentPhone)
                        }
                        className={`w-7 h-7 rounded flex items-center justify-center transition cursor-pointer flex-shrink-0 ${
                          displayInfo.status === "paid"
                            ? "bg-green-500 border border-green-500"
                            : "bg-gray-800 border border-gray-600"
                        }`}
                      >
                        {displayInfo.status === "paid" && (
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

                  <div
                    className={`transition-all duration-300 ease-in-out overflow-hidden ${
                      editingStudentId === s.id
                        ? "max-h-96 opacity-100"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    {editingStudentId === s.id && (
                      <div
                        ref={editFormRef}
                        className="p-4 border-t border-gray-600"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">
                              Name
                            </label>
                            <input
                              type="text"
                              value={editFormData.name}
                              onChange={(e) =>
                                setEditFormData({
                                  ...editFormData,
                                  name: e.target.value,
                                })
                              }
                              className="w-full pl-3 pr-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white focus:outline-none focus:border-blue-400 focus:bg-gray-700 placeholder-gray-400 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">
                              Parent Phone
                            </label>
                            <input
                              type="text"
                              value={editFormData.parentPhone}
                              onChange={(e) => {
                                setEditFormData({
                                  ...editFormData,
                                  parentPhone: formatPhoneNumber(
                                    e.target.value
                                  ),
                                });
                              }}
                              className="w-full pl-3 pr-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white focus:outline-none focus:border-blue-400 focus:bg-gray-700 placeholder-gray-400 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">
                              Date of Birth
                            </label>
                            <div className="relative">
                              <input
                                type="date"
                                value={editFormData.dob}
                                onChange={(e) =>
                                  setEditFormData({
                                    ...editFormData,
                                    dob: e.target.value,
                                  })
                                }
                                className="w-full pl-3 pr-4 py-2 border border-gray-600 rounded-lg bg-gray-800 text-white focus:outline-none focus:border-blue-400 focus:bg-gray-700 placeholder-gray-400 text-sm [color-scheme:dark]"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end mt-4">
                          <button
                            onClick={handleUpdate}
                            className="px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="sm:hidden mt-2 pt-2 border-t border-gray-600 p-3">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      {displayInfo.status === "paid" ? (
                        <>
                          <div className="text-gray-400">Paid on</div>
                          <div className="font-medium text-white">
                            {displayInfo.paymentDate}
                          </div>
                          {displayInfo.paymentMarkedBy && (
                            <>
                              <div className="text-gray-400">Marked by</div>
                              <div className="font-medium text-white truncate">
                                {displayInfo.paymentMarkedBy}
                              </div>
                            </>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="text-gray-400">Due since</div>
                          <div className="font-medium text-white">
                            {displayInfo.paymentDue} days
                          </div>
                          {s.lastReminderDate && (
                            <>
                              <div className="text-gray-400">Last notified</div>
                              <div className="font-medium text-white">
                                {s.lastReminderDate}
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {isPageLoading && (
              <>
                <StudentRowSkeleton />
                <StudentRowSkeleton />
                <StudentRowSkeleton />
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-2 sm:px-4 py-2 border-t border-gray-700 bg-gray-800">
        {isInitialLoading ? (
          <div className="flex justify-between w-full">
            <div className="h-4 bg-gray-600 rounded w-24 animate-pulse"></div>
          </div>
        ) : (
          <>
            <div className="text-sm text-gray-400">
              {stats.total > 0
                ? `Showing ${filteredStudents.length} of ${
                    filter === "all"
                      ? stats.total
                      : filter === "paid"
                      ? stats.paid
                      : stats.unpaid
                  }`
                : "0 of 0"}
            </div>
            {!hasNextPage && students.length > 0 && (
              <div className="text-sm text-gray-500">End of list</div>
            )}
          </>
        )}
      </div>
      {studentToDelete && (
        <Modal
          isOpen={!!studentToDelete}
          onClose={() => setStudentToDelete(null)}
          onConfirm={confirmDelete}
          title="Confirm Deletion"
        >
          <p>
            Are you sure you want to delete{" "}
            <span className="font-bold">{studentToDelete.name}</span>? This
            action cannot be undone.
          </p>
        </Modal>
      )}
    </>
  );
}
