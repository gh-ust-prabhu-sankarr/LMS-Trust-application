import { api } from "./axios.js";

export const authApi = {
  login: (payload) => api.post("/auth/login", payload),
  logout: () => api.post("/auth/logout"),
  register: (payload) => api.post("/auth/signup", payload),
  me: () => api.get("/auth/me"),

  requestOtp: (payload) => api.post("/auth/password-reset", payload),
  verifyOtp: (payload) => api.post("/auth/verify-otp", payload),
  resetPassword: (payload) => api.post("/auth/reset-password", payload),
};
