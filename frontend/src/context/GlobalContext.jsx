import React, {
  createContext,
  useReducer,
  useEffect,
  useCallback,
} from "react";
import AppReducer from "./AppReducer";
import axiosInstance from "../utils/axios";

// Initial state
const initialState = {
  token: localStorage.getItem("token"),
  isAuthenticated: null,
  user: null,
  loading: true,
};

// Create context
export const GlobalContext = createContext(initialState);

// Provider component
export const GlobalProvider = ({ children }) => {
  const [state, dispatch] = useReducer(AppReducer, initialState);

  // Actions
  function login(data) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    axiosInstance.defaults.headers.common[
      "Authorization"
    ] = `Bearer ${data.token}`;
    dispatch({
      type: "LOGIN_SUCCESS",
      payload: data,
    });
  }

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    delete axiosInstance.defaults.headers.common["Authorization"];
    dispatch({
      type: "LOGOUT",
    });
  }, []);

  function loadUser() {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user"));
      if (token && user) {
        axiosInstance.defaults.headers.common[
          "Authorization"
        ] = `Bearer ${token}`;
        dispatch({
          type: "USER_LOADED",
          payload: { token, user },
        });
      } else {
        dispatch({ type: "AUTH_ERROR" });
      }
    } catch (err) {
      dispatch({ type: "AUTH_ERROR" });
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    const resInterceptor = axiosInstance.interceptors.response.use(
      (res) => res,
      (err) => {
        if (
          err.response &&
          err.response.status === 401 &&
          !err.response.data.googleAuth
        ) {
          logout();
        }
        return Promise.reject(err);
      }
    );

    return () => {
      axiosInstance.interceptors.response.eject(resInterceptor);
    };
  }, [logout]);

  return (
    <GlobalContext.Provider
      value={{
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        loading: state.loading,
        login,
        logout,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};
