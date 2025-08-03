import axios from "axios";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL
    ? `${import.meta.env.VITE_BACKEND_URL}/api`
    : "http://localhost:5018/api",
  withCredentials: true,
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent infinite loops by checking if this is already a refresh request
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/refresh") &&
      !error.response.data.googleAuth
    ) {
      console.log("🔄 Token expired, attempting refresh...");
      originalRequest._retry = true;
      try {
        console.log("📡 Making refresh request...");
        const { data } = await axiosInstance.post("/auth/refresh");
        console.log("✅ Refresh successful, new token received");

        // Update both axios instances
        const token = `Bearer ${data.token}`;
        axiosInstance.defaults.headers.common["Authorization"] = token;
        originalRequest.headers["Authorization"] = token;

        // Update localStorage with new token
        localStorage.setItem("token", data.token);

        console.log("🔁 Retrying original request...");
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        console.log("❌ Refresh failed:", refreshError);
        // If refresh fails, clear stored data and redirect to login
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        delete axiosInstance.defaults.headers.common["Authorization"];

        // Only redirect if we're not already on the login page
        if (window.location.pathname !== "/login") {
          console.log("🔄 Redirecting to login...");
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
