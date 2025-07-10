import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Table from "../components/Table";
import { GlobalContext } from "../context/GlobalContext";
import api from "../utils/axios";

export default function Dashboard() {
  const { user, logout } = useContext(GlobalContext);

  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({ total: 0, paid: 0, unpaid: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(
    localStorage.getItem("selectedMonth") || "JAN"
  );
  const [selectedClass, setSelectedClass] = useState(null);
  const [classes, setClasses] = useState([]);
  const [filter, setFilter] = useState("all");

  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const isInitialLoad = statsLoading || (studentsLoading && currentPage === 1);

  // Initialize classes
  useEffect(() => {
    if (user?.role === "admin") {
      api.get("/class").then((res) => {
        const classes = res.data.data;
        setClasses(classes);
        if (classes.length > 0) {
          const savedClassId = localStorage.getItem("selectedClassId");
          const savedClass = classes.find((c) => c._id === savedClassId);
          setSelectedClass(savedClass || classes[0]);
        }
      });
    } else if (user) {
      setSelectedClass({
        _id: user.classId,
        className: user.className,
        sheetId: user.sheetId,
      });
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

  // Fetch data
  useEffect(() => {
    if (!selectedClass?.sheetId) return;

    const fetchData = async () => {
      // Set loading states
      if (currentPage === 1) {
        // studentsLoading is already set by the effects above
      } else {
        setLoadingMore(true);
      }
      setError(null);

      try {
        // Determine endpoint based on filter
        let endpoint = "/students";
        if (filter === "paid") endpoint = "/students/paid";
        else if (filter === "not-paid") endpoint = "/students/unpaid";

        // Fetch students
        const { data } = await api.get(
          `${endpoint}?month=${selectedMonth}&sheetId=${selectedClass.sheetId}&page=${currentPage}`
        );

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
              `/students/stats?month=${selectedMonth}&sheetId=${selectedClass.sheetId}`
            );
            if (statsRes.data.success) {
              setStats(statsRes.data.data);
            }
          } catch (err) {
            console.error("Failed to fetch stats:", err);
          } finally {
            setStatsLoading(false);
          }
        }
      } catch (err) {
        console.error("Failed to fetch data:", err);
        setError("Failed to load data. Please try again later.");
        if (currentPage === 1) {
          setStudents([]);
        }
        setStudentsLoading(false);
        if (statsLoading) setStatsLoading(false);
        setLoadingMore(false);
      }
    };

    fetchData();
  }, [selectedMonth, selectedClass, filter, currentPage, statsLoading]);

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

  const handlePaymentToggle = async (
    studentId,
    studentName,
    dob,
    newStatus
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
      await api.post("/students/update-status", {
        studentName,
        dob,
        newStatus,
        month: selectedMonth,
        sheetId: selectedClass?.sheetId,
      });
    } catch (err) {
      console.error("Failed to update payment status:", err);
      setError("Failed to save payment status. The change has been reverted.");
      // Revert stats on error
      setStats(originalStats);
      throw err;
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex h-screen w-screen bg-gray-900 text-gray-100 overflow-hidden">
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
      <div className="flex-1 flex flex-col">
        <header className="bg-gray-800 py-4 px-4 border-b border-gray-700 flex items-center justify-between z-10">
          <button
            className="text-gray-400 hover:text-white md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
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
          <h3 className="text-2xl font-bold">Payment Dashboard</h3>
        </header>
        <main className="flex-1 overflow-y-auto p-3 sm:p-4">
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
            <Table
              key={selectedClass?._id || "no-class-selected"}
              students={students}
              setStudents={setStudents}
              onPersistToggle={handlePaymentToggle}
              statsLoading={statsLoading}
              studentsLoading={studentsLoading} // KEEP this for disabling filters
              isInitialLoading={isInitialLoad} // ADD THIS PROP
              isPageLoading={loadingMore}
              stats={stats}
              hasNextPage={hasNextPage}
              onLoadMore={loadMoreItems}
              filter={filter}
              onFilterChange={setFilter}
              currentPage={currentPage}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
