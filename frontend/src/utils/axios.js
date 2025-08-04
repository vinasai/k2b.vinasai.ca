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
      !originalRequest.url?.includes("/auth/login") &&
      !error.response.data.googleAuth
    ) {
      originalRequest._retry = true;
      try {
        const { data } = await axiosInstance.post("/auth/refresh");

        // Update both axios instances
        const token = `Bearer ${data.token}`;
        axiosInstance.defaults.headers.common["Authorization"] = token;
        originalRequest.headers["Authorization"] = token;

        // Update localStorage with new token
        localStorage.setItem("token", data.token);

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        delete axiosInstance.defaults.headers.common["Authorization"];

        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }

        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
