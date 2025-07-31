import axios from "axios";

const axiosInstance = axios.create({
  baseURL:
    import.meta.env.VITE_BACKEND_URL + "/api" || "http://localhost:5018/api",
  withCredentials: true,
});

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { data } = await axiosInstance.post("/auth/refresh");
        axios.defaults.headers.common["Authorization"] = "Bearer " + data.token;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
