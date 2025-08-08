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
  onRemoveFromClass,
  onPaymentAmountUpdate,
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
  isRecordLoading,
}) {
  const { user } = useContext(GlobalContext);
  const [toggledStudents, setToggledStudents] = useState({});
  const [originalFilterStatus, setOriginalFilterStatus] = useState({});
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [paymentAmounts, setPaymentAmounts] = useState({});
  const [editFormData, setEditFormData] = useState({
    name: "",
    parentPhone: "",
    dob: "",
  });
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [studentToRemove, setStudentToRemove] = useState(null);
  const editFormRef = useRef(null);
  const perPage = 15;

  // Debounced payment amount update
  const debounceTimers = useRef({});

  const handlePaymentAmountChange = (studentId, amount) => {
    // Update local state immediately for responsive UI
    setPaymentAmounts((prev) => ({
      ...prev,
      [studentId]: amount,
    }));

    // Clear existing timer for this student
    if (debounceTimers.current[studentId]) {
      clearTimeout(debounceTimers.current[studentId]);
    }

    // Only update database if amount is valid and not empty
    if (amount && !isNaN(parseFloat(amount)) && onPaymentAmountUpdate) {
      // Set new timer for database update
      debounceTimers.current[studentId] = setTimeout(() => {
        onPaymentAmountUpdate(studentId, amount).catch((err) => {
          console.error("Failed to update payment amount:", err);
        });
      }, 1000); // 1 second debounce
    }
  };

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

  const handleRemoveClick = (student) => {
    setStudentToRemove(student);
  };

  const confirmRemove = async () => {
    if (!studentToRemove) return;
    await onRemoveFromClass(studentToRemove.id);
    setStudentToRemove(null);
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
    const initialAmounts = {};
    students.forEach((student) => {
      originalStatus[student.id] = student.status;
      if (student.amount) {
        initialAmounts[student.id] = student.amount.toString();
      }
    });
    setOriginalFilterStatus(originalStatus);

    // Only update payment amounts for new students or those with amounts from backend
    // Preserve locally entered amounts that haven't been saved yet
    setPaymentAmounts((prev) => {
      const updated = { ...prev };
      students.forEach((student) => {
        // If student has amount from backend and we don't have local value, use backend value
        if (student.amount && !updated[student.id]) {
          updated[student.id] = student.amount.toString();
        }
        // If student doesn't have amount from backend and status is not-paid, clear local value
        else if (
          !student.amount &&
          student.status === "not-paid" &&
          updated[student.id]
        ) {
          delete updated[student.id];
        }
      });
      return updated;
    });
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

  const handleRowClick = (studentId, event) => {
    // Prevent row click from triggering if:
    // 1. Clicking on interactive elements (buttons, inputs, etc.)
    // 2. Student is inactive
    // 3. Currently editing this student
    // 4. Record is loading
    const student = students.find((s) => s.id === studentId);
    if (
      !student ||
      student.studentStatus === "inactive" ||
      editingStudentId === studentId ||
      isRecordLoading
    ) {
      return;
    }

    // Check if the click target or its parent is an interactive element
    const target = event.target;
    const isInteractiveElement = target.closest(
      'button, input, select, textarea, [role="button"], .edit-button-class'
    );

    if (isInteractiveElement) {
      return;
    }

    // Trigger the toggle
    handleToggle(studentId);
  };

  const handleToggle = async (studentId) => {
    const originalStudent = students.find((s) => s.id === studentId);
    if (!originalStudent) return;

    // Determine the state before this toggle operation
    const statusBeforeToggle =
      toggledStudents[studentId]?.status || originalStudent.status;

    // Determine the new status
    const newStatus = statusBeforeToggle === "paid" ? "not-paid" : "paid";
    const currentDate = new Date();
    const newPaymentDate =
      newStatus === "paid"
        ? `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${currentDate
            .getDate()
            .toString()
            .padStart(2, "0")} - ${currentDate
            .getHours()
            .toString()
            .padStart(2, "0")}:${currentDate
            .getMinutes()
            .toString()
            .padStart(2, "0")}:${currentDate
            .getSeconds()
            .toString()
            .padStart(2, "0")}`
        : "";
    // Calculate due days only when changing to not-paid
    const paymentDueForUpdate =
      newStatus === "not-paid" ? calculateDueDays(month) : null;
    const markedBy = newStatus === "paid" ? user?.name || "" : "";

    // Get the payment amount for this student
    const paymentAmount = paymentAmounts[studentId] || null;

    const previousToggleState = toggledStudents[studentId];

    // Update the local visual state optimistically
    setToggledStudents((prev) => ({
      ...prev,
      [studentId]: {
        status: newStatus,
        paymentDate: newStatus === "paid" ? "Loading..." : "",
        markedBy: markedBy,
        paymentDue: paymentDueForUpdate,
        isLoading: true,
      },
    }));

    try {
      // Notify the parent to persist the change, including payment amount
      const result = await onPersistToggle(
        studentId,
        newStatus,
        markedBy,
        paymentAmount
      );

      // Update payment amounts based on status change
      if (newStatus === "paid") {
        // Use the amount from backend response if available, otherwise use entered amount
        const finalAmount = result?.amount || paymentAmount;
        if (finalAmount) {
          setPaymentAmounts((prev) => ({
            ...prev,
            [studentId]: finalAmount.toString(),
          }));
        }
      } else {
        // Clear the amount when marking as not-paid
        setPaymentAmounts((prev) => {
          const updated = { ...prev };
          delete updated[studentId];
          return updated;
        });
      }

      // Update with the actual date from backend
      setToggledStudents((prev) => {
        const updatedToggles = { ...prev };
        if (updatedToggles[studentId]) {
          updatedToggles[studentId] = {
            ...updatedToggles[studentId],
            paymentDate:
              result?.paymentDate || updatedToggles[studentId].paymentDate,
            isLoading: false,
          };
        }
        return updatedToggles;
      });
    } catch (error) {
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

  const AdminButtons = ({
    s,
    handleEditClick,
    handleRemoveClick,
    handleDeleteClick,
    isRecordLoading,
  }) => (
    <>
      {s.studentStatus !== "inactive" && (
        <button
          onClick={() => handleEditClick(s)}
          disabled={isRecordLoading}
          className="p-1 text-gray-400 hover:text-white transition edit-button-class disabled:opacity-50"
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
      )}
      {s.studentStatus === "active" && (
        <button
          onClick={() => handleRemoveClick(s)}
          disabled={isRecordLoading}
          className="p-1 text-gray-400 hover:text-orange-500 transition disabled:opacity-50"
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
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
      )}
      <button
        onClick={() => handleDeleteClick(s)}
        disabled={isRecordLoading}
        className="p-1 text-gray-400 hover:text-red-500 transition disabled:opacity-50"
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
              disabled={studentsLoading || isRecordLoading}
            />
          </div>
          <div className="flex mt-3 sm:mt-0 sm:ml-4 bg-gray-800 rounded-lg overflow-hidden flex-wrap justify-center">
            {["all", "not-paid", "paid"].map((f) => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                disabled={studentsLoading || isRecordLoading}
                className={`px-4 py-1.5 font-medium text-sm transition flex-grow sm:flex-grow-0 ${
                  filter === f
                    ? f === "all"
                      ? "bg-blue-500 text-white"
                      : f === "paid"
                      ? "bg-green-500 text-white"
                      : "bg-red-500 text-white"
                    : "text-gray-300 hover:bg-gray-700"
                } ${
                  studentsLoading || isRecordLoading
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
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
                    paymentDue:
                      toggledStudents[s.id].paymentDue !== null
                        ? toggledStudents[s.id].paymentDue
                        : s.paymentDue,
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
                  onClick={(e) => handleRowClick(s.id, e)}
                  className={`rounded-lg border border-gray-600 transition ${
                    s.studentStatus === "inactive"
                      ? "bg-red-900/20 hover:bg-red-900/30"
                      : `bg-gray-700 hover:bg-gray-600 ${
                          editingStudentId !== s.id && !isRecordLoading
                            ? "cursor-pointer"
                            : ""
                        }`
                  }`}
                >
                  {/* Main Info Row */}
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
                            {s.studentStatus === "inactive" && (
                              <span className="italic text-red-400 ml-1">
                                inactive
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="hidden sm:flex flex-col sm:flex-row sm:items-center sm:gap-3 mt-1">
                          <div className="text-xs text-gray-400">
                            {displayInfo.status === "paid" ? (
                              displayInfo.isLoading ? (
                                <span className="italic">Paid: Loading...</span>
                              ) : (
                                `Paid: ${displayInfo.paymentDate || "Today"}`
                              )
                            ) : (
                              `Due: ${displayInfo.paymentDue || 0} days`
                            )}
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
                    {/* DESKTOP Controls */}
                    <div className="hidden sm:flex items-center gap-2 sm:gap-3 flex-shrink-0">
                      {user?.role === "admin" && (
                        <AdminButtons
                          s={s}
                          handleEditClick={handleEditClick}
                          handleRemoveClick={handleRemoveClick}
                          handleDeleteClick={handleDeleteClick}
                          isRecordLoading={isRecordLoading}
                        />
                      )}
                      {/* Payment Controls for Desktop */}
                      {s.studentStatus === "inactive" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-sm bg-green-500 text-white">
                          <svg
                            className="w-3.5 h-3.5"
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
                        </span>
                      ) : (
                        <>
                          <div className="relative">
                            <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">
                              $
                            </div>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={paymentAmounts[s.id] || ""}
                              onChange={(e) => {
                                handlePaymentAmountChange(s.id, e.target.value);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-28 pl-5 pr-8 py-1 text-xs border border-gray-600 rounded bg-gray-800 text-white focus:outline-none focus:border-blue-400 focus:bg-gray-700 placeholder-gray-400"
                              disabled={
                                isRecordLoading || displayInfo.status === "paid"
                              }
                            />
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">
                              CAD
                            </div>
                          </div>
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
                            onClick={
                              isRecordLoading
                                ? undefined
                                : (e) => {
                                    e.stopPropagation();
                                    handleToggle(s.id);
                                  }
                            }
                            className={`w-6 h-6 rounded flex items-center justify-center transition cursor-pointer flex-shrink-0 ${
                              displayInfo.status === "paid"
                                ? "bg-green-500 border border-green-500"
                                : "bg-gray-800 border border-gray-600"
                            } ${
                              isRecordLoading
                                ? "cursor-not-allowed opacity-50"
                                : ""
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
                        </>
                      )}
                    </div>
                  </div>

                  {/* MOBILE Controls */}
                  <div className="block sm:hidden px-3 pb-3">
                    <div className="border-t border-gray-600 mt-2 pt-3 flex items-center justify-between">
                      {user?.role === "admin" && (
                        <div className="flex items-center gap-1">
                          <AdminButtons
                            s={s}
                            handleEditClick={handleEditClick}
                            handleRemoveClick={handleRemoveClick}
                            handleDeleteClick={handleDeleteClick}
                            isRecordLoading={isRecordLoading}
                          />
                        </div>
                      )}
                      <div className="flex-grow flex justify-end items-center gap-2">
                        {/* Payment Controls for Mobile */}
                        {s.studentStatus === "inactive" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-sm bg-green-500 text-white">
                            <svg
                              className="w-3.5 h-3.5"
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
                          </span>
                        ) : (
                          <>
                            <div className="relative">
                              <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">
                                $
                              </div>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={paymentAmounts[s.id] || ""}
                                onChange={(e) => {
                                  handlePaymentAmountChange(
                                    s.id,
                                    e.target.value
                                  );
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-28 pl-5 pr-8 py-1 text-xs border border-gray-600 rounded bg-gray-800 text-white focus:outline-none focus:border-blue-400 focus:bg-gray-700 placeholder-gray-400"
                                disabled={
                                  isRecordLoading ||
                                  displayInfo.status === "paid"
                                }
                              />
                              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs">
                                CAD
                              </div>
                            </div>
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
                              onClick={
                                isRecordLoading
                                  ? undefined
                                  : (e) => {
                                      e.stopPropagation();
                                      handleToggle(s.id);
                                    }
                              }
                              className={`w-6 h-6 rounded flex items-center justify-center transition cursor-pointer flex-shrink-0 ${
                                displayInfo.status === "paid"
                                  ? "bg-green-500 border border-green-500"
                                  : "bg-gray-800 border border-gray-600"
                              } ${
                                isRecordLoading
                                  ? "cursor-not-allowed opacity-50"
                                  : ""
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
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Collapsible Edit Form */}
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
                        className="p-6 border-t border-gray-600 bg-gray-750 bg-opacity-50"
                      >
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
                            <svg
                              className="w-4 h-4 text-blue-400"
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
                            Edit Student Details
                          </h4>
                          <p className="text-xs text-gray-400 mt-1">
                            Update student information below
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">
                              Name
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                                <svg
                                  className="w-4 h-4 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                  />
                                </svg>
                              </div>
                              <input
                                type="text"
                                value={editFormData.name}
                                onChange={(e) =>
                                  setEditFormData({
                                    ...editFormData,
                                    name: e.target.value,
                                  })
                                }
                                onClick={(e) => e.stopPropagation()}
                                placeholder="Enter student name"
                                className="w-full pl-10 pr-3 py-2.5 border border-gray-600 rounded-lg bg-gray-800 text-white focus:outline-none focus:border-blue-400 focus:bg-gray-700 focus:ring-2 focus:ring-blue-400/20 placeholder-gray-400 text-sm transition-all duration-200 hover:border-gray-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">
                              Parent Phone
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                                <svg
                                  className="w-4 h-4 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                                  />
                                </svg>
                              </div>
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
                                onClick={(e) => e.stopPropagation()}
                                placeholder="(555) 123-4567"
                                className="w-full pl-10 pr-3 py-2.5 border border-gray-600 rounded-lg bg-gray-800 text-white focus:outline-none focus:border-blue-400 focus:bg-gray-700 focus:ring-2 focus:ring-blue-400/20 placeholder-gray-400 text-sm transition-all duration-200 hover:border-gray-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">
                              Date of Birth
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                                <svg
                                  className="w-4 h-4 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                              </div>
                              <input
                                type="date"
                                value={editFormData.dob}
                                onChange={(e) =>
                                  setEditFormData({
                                    ...editFormData,
                                    dob: e.target.value,
                                  })
                                }
                                onClick={(e) => e.stopPropagation()}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-600 rounded-lg bg-gray-800 text-white focus:outline-none focus:border-blue-400 focus:bg-gray-700 focus:ring-2 focus:ring-blue-400/20 placeholder-gray-400 text-sm [color-scheme:dark] transition-all duration-200 hover:border-gray-500"
                                style={{
                                  WebkitAppearance: "none",
                                  MozAppearance: "textfield",
                                }}
                              />
                              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <svg
                                  className="w-4 h-4 text-gray-500"
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
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end mt-6">
                          <button
                            onClick={handleUpdate}
                            disabled={isRecordLoading}
                            className="px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors disabled:opacity-50"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mobile-only Detailed Info */}
                  <div className="sm:hidden mt-2 pt-2 border-t border-gray-600 p-3">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      {displayInfo.status === "paid" ? (
                        <>
                          <div className="text-gray-400">Paid on</div>
                          <div className="font-medium text-white">
                            {displayInfo.isLoading ? (
                              <span className="italic">Loading...</span>
                            ) : (
                              displayInfo.paymentDate || ""
                            )}
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
                            {displayInfo.paymentDue || 0} days
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
            Are you sure you want to permanently delete{" "}
            <span className="font-bold">{studentToDelete.name}</span> and all
            associated payment records connected with this student? This action
            cannot be undone.
          </p>
        </Modal>
      )}
      {studentToRemove && (
        <Modal
          isOpen={!!studentToRemove}
          onClose={() => setStudentToRemove(null)}
          onConfirm={confirmRemove}
          title="Remove from Class"
          confirmButtonText="Remove"
        >
          <p>
            Are you sure you want to remove{" "}
            <span className="font-bold">{studentToRemove.name}</span> from the
            class? This will:
          </p>
          <ul className="list-disc list-inside mt-2 text-sm text-gray-300">
            <li>Set the student status to inactive</li>
            <li>Delete all unpaid payment records</li>
            <li>Keep paid payment records for historical purposes</li>
          </ul>
        </Modal>
      )}
    </>
  );
}
