import axios from "axios";
import { getToken, removeToken } from "../utils/token.js";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 20000,
});

const resolveApiErrorMessage = (error) => {
  const data = error?.response?.data;

  if (typeof data?.message === "string" && data.message.trim()) {
    const message = data.message.trim();
    if (message.toLowerCase().includes("exceeds 40% of monthly income")) {
      return "Application rejected: Your income is too low, so we cant process your request";
    }
    return message;
  }

  if (typeof data === "string" && data.trim()) {
    const message = data.trim();
    if (message.toLowerCase().includes("exceeds 40% of monthly income")) {
      return "Application rejected: Your income is too low, so we cant process your request";
    }
    return message;
  }

  // Spring validation handlers can return { field: "message" } map for 400.
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const values = Object.values(data).filter(
      (value) => typeof value === "string" && value.trim()
    );
    if (values.length) {
      return values.join(" | ");
    }
  }

  return error?.message || "Request failed";
};

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    error.message = resolveApiErrorMessage(error);

    if (status === 401) {
      removeToken();
      if (typeof window !== "undefined") {
        const current = window.location.pathname || "";
        const isAuthScreen =
          current === "/login" ||
          current === "/register" ||
          current.startsWith("/login/");
        if (!isAuthScreen) {
          window.location.replace("/login");
        }
      }
    }
    return Promise.reject(error);
  }
);
