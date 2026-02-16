const b64urlToJson = (b64url) => {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const str = atob(b64 + pad);
  try {
    return JSON.parse(
      decodeURIComponent(
        [...str]
          .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
          .join("")
      )
    );
  } catch {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }
};

export const decodeToken = (token) => {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  return b64urlToJson(parts[1]);
};

export const isTokenExpired = (token) => {
  const payload = decodeToken(token);
  if (!payload?.exp) return false;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return Number(payload.exp) <= nowInSeconds;
};

export const isTokenUsable = (token) => {
  const payload = decodeToken(token);
  if (!payload) return false;
  return !isTokenExpired(token);
};

export const getRoleFromToken = (token) => {
  const payload = decodeToken(token);
  if (!payload) return null;
  const rawRole = payload.role || payload.roles?.[0] || payload.authorities?.[0] || null;
  if (!rawRole) return null;
  return String(rawRole).replace(/^ROLE_/, "");
};
