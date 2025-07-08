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

  useEffect(() => {
    if (user?.role === "admin") {
      api.get("/class").then((res) => {
        setClasses(res.data.data);
        if (res.data.data.length > 0) {
          setSelectedClass(res.data.data[0]);
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

  const fetchDashboardData = async (month, sheetId, silent = false) => {
    if (!sheetId) return;

    if (!silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const [studentsResponse, statsResponse] = await Promise.all([
        api.get(`/students?month=${month}&sheetId=${sheetId}`),
        api.get(`/students/stats?month=${month}&sheetId=${sheetId}`),
      ]);

      if (studentsResponse.data.success) {
        setStudents(studentsResponse.data.data);
      }

      if (statsResponse.data.success) {
        setStats(statsResponse.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError("Failed to load dashboard data. Please try again later.");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    localStorage.setItem("selectedMonth", selectedMonth);
    fetchDashboardData(selectedMonth, selectedClass?.sheetId);
  }, [selectedMonth, selectedClass]);

  const handlePaymentToggle = async (studentName, newStatus) => {
    // Optimistically update stats. The student list is handled by the Table component.
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
        newStatus,
        month: selectedMonth,
        sheetId: selectedClass?.sheetId,
      });
    } catch (err) {
      console.error("Failed to update payment status:", err);
      setError("Failed to save payment status. The change has been reverted.");
      // Revert stats and re-throw so the calling component can revert its state
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
          {/* Stats cards are now rendered inside the Table component */}
          <div className="bg-gray-800 rounded-lg border border-gray-700 h-full flex flex-col">
            <Table
              students={students}
              setStudents={setStudents}
              onPersistToggle={handlePaymentToggle}
              loading={loading}
              stats={stats}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
