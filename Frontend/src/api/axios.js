import axios from "axios";
import { getToken, removeToken } from "../utils/token.js";
import { isTokenUsable } from "../utils/jwt.js";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token && isTokenUsable(token)) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (token) {
    removeToken();
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = String(error?.config?.url || "");
    const isAuthRoute = url.includes("/auth/login") || url.includes("/auth/signup");

    if ((status === 401 || status === 403) && !isAuthRoute) {
      removeToken();
    }

    return Promise.reject(error);
  },
);
