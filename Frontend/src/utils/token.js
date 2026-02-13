const KEY = "lms_token";

export const getToken = () => localStorage.getItem(KEY);
export const setToken = (token) => {
  if (!token || typeof token !== "string") return;
  const normalized = token.trim();
  if (!normalized || normalized === "null" || normalized === "undefined") return;
  localStorage.setItem(KEY, normalized);
};
export const removeToken = () => localStorage.removeItem(KEY);
