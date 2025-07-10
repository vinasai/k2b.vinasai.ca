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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(
    localStorage.getItem("selectedMonth") || "JAN"
  );
  const [selectedClass, setSelectedClass] = useState(null);
  const [classes, setClasses] = useState([]);

  // Pagination and caching state
  const [currentPage, setCurrentPage] = useState(1);
  const [pagesCache, setPagesCache] = useState({});
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(false);

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

  const fetchPageData = async (page, month, sheetId) => {
    if (!sheetId || isPageLoading) return;

    const cacheKey = `${sheetId}-${month}`;
    if (pagesCache[cacheKey] && pagesCache[cacheKey][page]) {
      const cachedPage = pagesCache[cacheKey][page];
      setStudents(cachedPage.students);
      setHasNextPage(cachedPage.hasNextPage);
      return;
    }

    setIsPageLoading(true);
    setError(null);

    try {
      const { data } = await api.get(
        `/students?month=${month}&sheetId=${sheetId}&page=${page}`
      );
      if (data.success) {
        setStudents(data.data);
        setHasNextPage(data.hasNextPage);
        setPagesCache((prev) => ({
          ...prev,
          [cacheKey]: {
            ...prev[cacheKey],
            [page]: { students: data.data, hasNextPage: data.hasNextPage },
          },
        }));
      }
    } catch (err) {
      console.error("Failed to fetch page data:", err);
      setError("Failed to load student data. Please try again later.");
    } finally {
      if (loading) setLoading(false);
      setIsPageLoading(false);
    }
  };

  // Fetch stats separately, as it requires scanning the whole sheet.
  // This can be optimized on the backend later if needed.
  const fetchStats = async (month, sheetId) => {
    if (!sheetId) return;
    try {
      const { data } = await api.get(
        `/students/stats?month=${month}&sheetId=${sheetId}`
      );
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  // Reset pagination and cache when month or class changes
  useEffect(() => {
    setCurrentPage(1);
    setPagesCache({});
    setStudents([]);
    setStats({ total: 0, paid: 0, unpaid: 0 });
    if (selectedClass?._id) {
      localStorage.setItem("selectedClassId", selectedClass._id);
    }
  }, [selectedMonth, selectedClass]);

  // Fetch data when page, month, or class changes
  useEffect(() => {
    localStorage.setItem("selectedMonth", selectedMonth);
    if (selectedClass?.sheetId) {
      fetchPageData(currentPage, selectedMonth, selectedClass.sheetId);
      if (currentPage === 1) {
        fetchStats(selectedMonth, selectedClass.sheetId);
      }
    }
  }, [currentPage, selectedMonth, selectedClass]);

  const handlePaymentToggle = async (
    studentId,
    studentName,
    dob,
    newStatus
  ) => {
    const originalStats = { ...stats };
    const originalStudents = [...students];
    const originalCache = { ...pagesCache };

    // Optimistic UI update
    const paidIncrement = newStatus === "paid" ? 1 : -1;
    setStats((prevStats) => ({
      ...prevStats,
      paid: prevStats.paid + paidIncrement,
      unpaid: prevStats.unpaid - paidIncrement,
    }));

    const updatedStudents = students.map((s) =>
      s.id === studentId ? { ...s, status: newStatus } : s
    );
    setStudents(updatedStudents);

    // Optimistic cache update
    const cacheKey = `${selectedClass.sheetId}-${selectedMonth}`;
    if (pagesCache[cacheKey]?.[currentPage]) {
      const newCache = JSON.parse(JSON.stringify(pagesCache));
      newCache[cacheKey][currentPage].students = updatedStudents;
      setPagesCache(newCache);
    }

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
      // Revert UI on error
      setStats(originalStats);
      setStudents(originalStudents);
      setPagesCache(originalCache);
      throw err; // Re-throw for Table component to catch
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
      <div className="flex-1 flex flex-col ">
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
              loading={loading}
              isPageLoading={isPageLoading}
              stats={stats}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              hasNextPage={hasNextPage}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
