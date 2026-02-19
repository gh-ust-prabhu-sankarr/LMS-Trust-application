const KEY = "lms_token";

const decodePayload = (token) => {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(base64 + pad));
  } catch {
    return null;
  }
};

export const isTokenExpired = (token) => {
  const payload = decodePayload(token);
  const exp = Number(payload?.exp || 0);
  if (!exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return exp <= now;
};

export const getToken = () => {
  const token = sessionStorage.getItem(KEY);
  if (!token) return null;
  if (isTokenExpired(token)) {
    sessionStorage.removeItem(KEY);
    return null;
  }
  return token;
};
export const setToken = (token) => {
  sessionStorage.setItem(KEY, token);
  localStorage.removeItem(KEY);
};
export const removeToken = () => {
  sessionStorage.removeItem(KEY);
  localStorage.removeItem(KEY);
};
