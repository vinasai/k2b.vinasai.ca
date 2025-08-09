import React, { useState, useEffect, useContext } from "react";
import toast from "react-hot-toast";
import Sidebar from "../components/Sidebar";
import Table from "../components/Table";
import GoogleAuthError from "../components/GoogleAuthError";
import { GlobalContext } from "../context/GlobalContext";
import api from "../utils/axios";
import formatPhoneNumber from "../utils/formatPhone";
import axios from "axios";

// Debounce hook
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

const getCurrentMonthAbbr = () => {
  return new Date().toLocaleString("default", { month: "short" }).toUpperCase();
};

export default function Dashboard() {
  const { user, logout } = useContext(GlobalContext);

  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({ total: 0, paid: 0, unpaid: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(
    localStorage.getItem("selectedMonth") || getCurrentMonthAbbr()
  );
  const [selectedClass, setSelectedClass] = useState(null);
  const [classes, setClasses] = useState([]);
  const [classesLoaded, setClassesLoaded] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500); // 500ms debounce delay

  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [googleAuthUrl, setGoogleAuthUrl] = useState(null);
  const [isRecordLoading, setIsRecordLoading] = useState(false);

  const isInitialLoad =
    statsLoading || (studentsLoading && currentPage === 1) || !classesLoaded;

  // Reset component state on mount (for handling refresh scenarios)
  useEffect(() => {
    setStudents([]);
    setError(null);
    setCurrentPage(1);
    setHasNextPage(false);
    setLoadingMore(false);
    setGoogleAuthUrl(null);
  }, []);

  // Initialize classes
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get("/class");
        const classes = res.data.data;
        setClasses(classes);
        setClassesLoaded(true);
        if (classes.length > 0) {
          const savedClassId = localStorage.getItem("selectedClassId");
          const savedClass = classes.find((c) => c._id === savedClassId);
          setSelectedClass(savedClass || classes[0]);
        }
      } catch (error) {
        console.error("Failed to fetch classes:", error);
        setError("Failed to load classes. Please refresh the page.");
        setClassesLoaded(true); // Set to true even on error to prevent infinite loading
      }
    };

    if (user) {
      fetchClasses();
    }
  }, [user]);

  // Reset when month or class changes
  useEffect(() => {
    setCurrentPage(1);
    setStudentsLoading(true);
    setStatsLoading(true); // Only set stats loading when month/class changes
  }, [selectedMonth, selectedClass]);

  // Reset only pagination when filter changes (NOT stats loading)
  useEffect(() => {
    setCurrentPage(1);
    setStudentsLoading(true);
    // Don't set statsLoading here - stats don't change with filter
  }, [filter]);

  // Reset pagination when search term changes
  useEffect(() => {
    setCurrentPage(1);
    setStudentsLoading(true);
  }, [debouncedSearch]);

  // Fetch data
  useEffect(() => {
    if (!selectedClass?._id || !classesLoaded) {
      console.log("Fetch blocked:", {
        selectedClassId: selectedClass?._id,
        classesLoaded,
        selectedClass: selectedClass?.className,
      });
      return;
    }

    console.log("Starting fetch with:", {
      selectedMonth,
      selectedClassId: selectedClass._id,
      filter,
      currentPage,
    });

    const fetchData = async () => {
      if (currentPage === 1) {
      } else {
        setLoadingMore(true);
      }
      setError(null);

      try {
        // Determine endpoint based on filter
        let endpoint = "/students";
        if (filter === "paid") endpoint = "/students/paid";
        else if (filter === "not-paid") endpoint = "/students/unpaid";

        const params = new URLSearchParams({
          month: selectedMonth,
          classId: selectedClass._id,
          page: currentPage,
        });

        if (debouncedSearch) {
          params.append("search", debouncedSearch);
        }

        // Fetch students
        const { data } = await api.get(`${endpoint}?${params.toString()}`);

        if (data.success) {
          if (currentPage === 1) {
            setStudents(data.data);
          } else {
            setStudents((prev) => [...prev, ...data.data]);
          }
          setHasNextPage(data.hasNextPage);
        }

        setStudentsLoading(false);
        setLoadingMore(false);

        // Fetch stats only when statsLoading is true (month/class changed)
        if (statsLoading) {
          try {
            const statsRes = await api.get(
              `/students/stats?month=${selectedMonth}&classId=${selectedClass._id}`
            );
            if (statsRes.data.success) {
              setStats(statsRes.data.data);
            }
          } catch (err) {
            console.error("Failed to fetch stats:", err.response.data.error);
          } finally {
            setStatsLoading(false);
          }
        }
      } catch (err) {
        console.error("Failed to fetch data:", err.response.data.error);
        if (
          err.response?.status === 401 &&
          err.response?.data?.googleAuth === true
        ) {
          setGoogleAuthUrl(err.response.data.authUrl);
          setError(
            "Google Authorization is required. Please renew your authentication."
          );
        } else {
          setError(err.response.data.error);
          if (currentPage === 1) {
            setStudents([]);
          }
        }
        setStudentsLoading(false);
        if (statsLoading) setStatsLoading(false);
        setLoadingMore(false);
      }
    };

    fetchData();
  }, [
    selectedMonth,
    selectedClass,
    filter,
    currentPage,
    statsLoading,
    debouncedSearch,
    classesLoaded,
  ]);

  // Save preferences
  useEffect(() => {
    localStorage.setItem("selectedMonth", selectedMonth);
    if (selectedClass?._id) {
      localStorage.setItem("selectedClassId", selectedClass._id);
    }
  }, [selectedMonth, selectedClass]);

  const loadMoreItems = () => {
    if (hasNextPage && !loadingMore) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePaymentAmountUpdate = async (studentId, amount) => {
    try {
      const { data } = await api.post("/students/update-amount", {
        studentId,
        amount: parseFloat(amount),
        month: selectedMonth,
        classId: selectedClass?._id,
      });

      if (data.success) {
        // Update the local student data with the new amount
        setStudents((prev) =>
          prev.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  amount: parseFloat(amount),
                }
              : s
          )
        );
      }
    } catch (err) {
      console.error("Failed to update payment amount:", err);
      throw err;
    }
  };

  const handlePaymentToggle = async (
    studentId,
    newStatus,
    markedBy,
    amount = null
  ) => {
    // Optimistic update for stats
    const originalStats = { ...stats };
    const paidIncrement = newStatus === "paid" ? 1 : -1;
    setStats((prevStats) => ({
      ...prevStats,
      paid: prevStats.paid + paidIncrement,
      unpaid: prevStats.unpaid - paidIncrement,
    }));

    try {
      const requestPayload = {
        studentId,
        newStatus,
        month: selectedMonth,
        classId: selectedClass?._id,
        markedBy,
      };

      // Add amount to payload if provided and status is paid
      if (
        newStatus === "paid" &&
        amount !== null &&
        amount !== "" &&
        !isNaN(parseFloat(amount))
      ) {
        requestPayload.amount = parseFloat(amount);
      }

      const { data } = await api.post(
        "/students/update-status",
        requestPayload
      );

      if (data.success) {
        // Use the payment date from the backend response if available
        let paymentDate = "";

        if (newStatus === "paid") {
          // If backend provides a date, use it, otherwise format our own
          if (data.paymentDate) {
            paymentDate = data.paymentDate;
          } else {
            const currentDate = new Date();
            paymentDate = `${currentDate.getFullYear()}-${(
              currentDate.getMonth() + 1
            )
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
              .padStart(2, "0")}`;
          }
        }
        // Calculate due days for unpaid status
        const calculateDueDays = (monthName) => {
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

        const paymentDueForUpdate =
          newStatus === "not-paid" ? calculateDueDays(selectedMonth) : null;

        setStudents((prev) =>
          prev.map((s) =>
            s.id === studentId
              ? {
                  ...s,
                  status: newStatus,
                  paymentDate: paymentDate,
                  paymentMarkedBy: newStatus === "paid" ? markedBy : "",
                  paymentDue: paymentDueForUpdate,
                  amount:
                    newStatus === "paid" && amount
                      ? parseFloat(amount)
                      : newStatus === "not-paid"
                      ? null
                      : s.amount,
                }
              : s
          )
        );

        // Return the payment date and amount for the Table component to use.
        // Include the final status so the child can clear optimistic state precisely.
        return {
          paymentDate,
          amount: newStatus === "paid" && amount ? parseFloat(amount) : null,
          status: newStatus,
        };
      }
    } catch (err) {
      console.error("Failed to update payment status:", err);
      setError("Failed to save payment status. The change has been reverted.");
      // Revert stats on error
      setStats(originalStats);
      throw err;
    }
  };

  const handleUpdateStudent = async (studentId, updatedData) => {
    const toastId = toast.loading("Updating student...", {
      duration: Infinity,
    });
    setIsRecordLoading(true);
    try {
      await api.put(`/students?id=${studentId}`, {
        ...updatedData,
        classId: selectedClass?._id,
      });

      setStudents((prev) =>
        prev.map((s) =>
          s.id === studentId
            ? {
                ...s,
                name: updatedData.name || s.name,
                parentPhone: updatedData.parentPhone
                  ? formatPhoneNumber(updatedData.parentPhone)
                  : s.parentPhone,
                dob: updatedData.dob || s.dob,
              }
            : s
        )
      );

      toast.success("Student updated successfully", {
        id: toastId,
        duration: 4000,
      });
    } catch (err) {
      console.error("Failed to update student:", err);

      if (
        err.response?.status === 401 &&
        err.response?.data?.googleAuth === true
      ) {
        toast.error("Authorization expired. Redirecting to Google...", {
          id: toastId,
          duration: 4000,
        });
        //window.location.href = err.response.data.authUrl;
        return;
      }
      toast.error("Failed to update student details.", {
        id: toastId,
        duration: 4000,
      });
      throw err;
    } finally {
      setIsRecordLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    const toastId = toast.loading("Deleting student...", {
      duration: Infinity,
    });
    setIsRecordLoading(true);
    const studentToDelete = students.find((s) => s.id === studentId);

    try {
      await api.delete(`/students?id=${studentId}`);
      setStudents((prev) => prev.filter((s) => s.id !== studentId));

      if (studentToDelete) {
        setStats((prevStats) => ({
          ...prevStats,
          total: prevStats.total - 1,
          paid:
            studentToDelete.status === "paid"
              ? prevStats.paid - 1
              : prevStats.paid,
          unpaid:
            studentToDelete.status === "not-paid"
              ? prevStats.unpaid - 1
              : prevStats.unpaid,
        }));
      } else {
        setStatsLoading(true);
      }

      toast.success("Student deleted successfully", {
        id: toastId,
        duration: 4000, // Auto-dismiss after 4 seconds
      });
    } catch (err) {
      console.error("Failed to delete student:", err);
      toast.error("Failed to delete student.", {
        id: toastId,
        duration: 4000, // Auto-dismiss after 4 seconds
      });
      throw err; // Add throw to maintain error propagation
    } finally {
      setIsRecordLoading(false);
    }
  };

  const handleRemoveFromClass = async (studentId) => {
    const toastId = toast.loading("Removing student from class...", {
      duration: Infinity,
    });
    setIsRecordLoading(true);
    const studentToRemove = students.find((s) => s.id === studentId);

    try {
      await api.post(`/students/remove?id=${studentId}`);

      // Update the student status to inactive in the local state
      setStudents((prev) =>
        prev.map((s) =>
          s.id === studentId ? { ...s, studentStatus: "inactive" } : s
        )
      );

      toast.success("Student removed from class successfully", {
        id: toastId,
        duration: 4000,
      });
    } catch (err) {
      console.error("Failed to remove student from class:", err);
      toast.error("Failed to remove student from class.", {
        id: toastId,
        duration: 4000,
      });
      throw err;
    } finally {
      setIsRecordLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex h-full w-screen bg-gray-900 text-gray-100 overflow-hidden">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onLogout={handleLogout}
        onMonthChange={setSelectedMonth}
        selectedMonth={selectedMonth}
        classes={classes}
        selectedClass={selectedClass}
        onClassChange={setSelectedClass}
      />
      <div className="flex-1 flex flex-col min-h-0">
        <header className="bg-gray-800 py-3 px-4 border-b border-gray-700 flex items-center justify-between z-10 flex-shrink-0 shadow-lg">
          <div className="flex items-center space-x-3">
            <button
              className="text-gray-400 hover:text-white transition-colors duration-200 md:hidden p-1 rounded-md hover:bg-gray-700"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
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
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h3 className="text-xl sm:text-2xl font-bold text-white truncate">
              Payment Dashboard
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              className="text-gray-400 hover:text-white transition-colors duration-200 p-2 rounded-md hover:bg-gray-700 md:hidden"
              onClick={() => window.location.reload()}
              aria-label="Refresh page"
              title="Refresh"
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button
              className="hidden md:flex items-center space-x-2 text-gray-400 hover:text-white transition-colors duration-200 px-3 py-2 rounded-md hover:bg-gray-700"
              onClick={() => window.location.reload()}
              aria-label="Refresh page"
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
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="text-sm font-medium">Refresh</span>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0">
          {error && (
            <div
              className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded-lg relative mb-4"
              role="alert"
            >
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          <div className="bg-gray-800 rounded-lg border border-gray-700 h-full flex flex-col">
            {googleAuthUrl ? (
              <GoogleAuthError authUrl={googleAuthUrl} />
            ) : (
              <Table
                key={selectedClass?._id || "no-class-selected"}
                students={students}
                setStudents={setStudents}
                onPersistToggle={handlePaymentToggle}
                onUpdateStudent={handleUpdateStudent}
                onDeleteStudent={handleDeleteStudent}
                onRemoveFromClass={handleRemoveFromClass}
                onPaymentAmountUpdate={handlePaymentAmountUpdate}
                statsLoading={statsLoading}
                studentsLoading={studentsLoading}
                isInitialLoading={isInitialLoad}
                isPageLoading={loadingMore}
                isRecordLoading={isRecordLoading}
                stats={stats}
                hasNextPage={hasNextPage}
                onLoadMore={loadMoreItems}
                filter={filter}
                onFilterChange={setFilter}
                search={search}
                onSearchChange={setSearch}
                month={selectedMonth}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
