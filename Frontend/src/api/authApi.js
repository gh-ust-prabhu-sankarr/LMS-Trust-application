import { api } from "./axios.js";

export const authApi = {
  login: (payload) => api.post("/auth/login", payload),
  register: (payload) => api.post("/auth/signup", payload),

  requestOtp: (payload) => api.post("/auth/password-reset", payload),
  verifyOtp: (payload) => api.post("/auth/verify-otp", payload),
  resetPassword: (payload) => api.post("/auth/reset-password", payload),
};
