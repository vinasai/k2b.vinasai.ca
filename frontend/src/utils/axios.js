import axios from "axios";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_BACKEND_URL + "/api" || "http://localhost:5018/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Add the JWT token to the header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle global errors, including Google Auth
api.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    return response;
  },
  (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    if (
      error.response &&
      error.response.status === 401 &&
      error.response.data.googleAuth === true
    ) {
      // This is the specific error for Google Auth requirement.
      // Redirect the user to the provided Google authentication URL.
      const authUrl = error.response.data.authUrl;
      if (authUrl) {
        // Redirect the whole page to the Google consent screen.
        window.location.href = authUrl;
      }
      // Return a resolving promise to stop the error from propagating
      return new Promise(() => {});
    }

    // For any other errors, we reject the promise to be handled by the component.
    return Promise.reject(error);
  }
);

export default api;
