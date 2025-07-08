import React, { createContext, useReducer, useEffect } from "react";
import AppReducer from "./AppReducer";

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
    dispatch({
      type: "LOGIN_SUCCESS",
      payload: data,
    });
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    dispatch({
      type: "LOGOUT",
    });
  }

  function loadUser() {
    try {
      const token = localStorage.getItem("token");
      const user = JSON.parse(localStorage.getItem("user"));
      if (token && user) {
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
