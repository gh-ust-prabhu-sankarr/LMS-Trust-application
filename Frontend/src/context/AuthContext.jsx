import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/authApi.js";
import { getToken, removeToken, setToken } from "../utils/token.js";
import { decodeToken, getRoleFromToken } from "../utils/jwt.js";

const AuthContext = createContext(null);
const ROLE_KEY = "lms_role";

const normalizeRole = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  return raw.replace(/^ROLE_/, "");
};

export function AuthProvider({ children }) {
  const initialToken = getToken();
  const storedRole = initialToken ? normalizeRole(localStorage.getItem(ROLE_KEY)) : null;
  const initialRole = getRoleFromToken(initialToken) || storedRole;
  const initialPayload = initialToken ? decodeToken(initialToken) : null;

  const [token, setTokenState] = useState(initialToken);
  const [role, setRole] = useState(initialRole);
  const [authLoading, setAuthLoading] = useState(!!initialToken);
  const [user, setUser] = useState(
    initialToken
      ? {
          username: initialPayload?.sub || initialPayload?.username || "User",
          email: initialPayload?.email || null,
          role: initialRole || null,
        }
      : null
  );

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!token) {
        localStorage.removeItem(ROLE_KEY);
        if (!cancelled) setAuthLoading(false);
        return;
      }

      if (role) localStorage.setItem(ROLE_KEY, role);

      try {
        const res = await authApi.me();
        if (cancelled) return;
        const apiUser = res?.data?.data || res?.data || null;
        const resolvedRole = normalizeRole(apiUser?.role || apiUser?.authorities?.[0]);
        if (resolvedRole && resolvedRole !== role) {
          setRole(resolvedRole);
          localStorage.setItem(ROLE_KEY, resolvedRole);
        }
        setUser((prev) => ({ ...(prev || {}), ...apiUser, role: resolvedRole || role || null }));
      } catch {
        // No-op. If /auth/me is not available, fallback is role from login/token.
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [token, role]);

  const login = async ({ identifier, password }) => {
    const normalizedIdentifier = identifier?.trim();
    const res = await authApi.login({
      username: normalizedIdentifier,
      email: normalizedIdentifier,
      password,
    });
    const t = res?.data?.data?.token || res?.data?.token || res?.data?.access_token;
    if (!t) throw new Error("Token missing in response");
    setToken(t);
    setTokenState(t);
    const r = normalizeRole(getRoleFromToken(t) || res?.data?.role || res?.data?.data?.role || null);
    setRole(r);
    if (r) localStorage.setItem(ROLE_KEY, r);
    const userPayload = res?.data?.data?.user || res?.data?.user || null;
    setUser(
      userPayload || {
        username: res?.data?.username || identifier,
        email: res?.data?.email || null,
        role: r,
      }
    );
    return { token: t, role: r };
  };

  const register = async (payload) => {
    const res = await authApi.register(payload);
    return res.data;
  };

  const logout = () => {
    removeToken();
    localStorage.removeItem(ROLE_KEY);
    setTokenState(null);
    setRole(null);
    setUser(null);
  };

  const requestOtp = async ({ email }) => {
    const res = await authApi.requestOtp({ email });
    return res.data;
  };

  const verifyOtp = async ({ email, otp }) => {
    const res = await authApi.verifyOtp({ email, otp });
    return res.data;
  };

  const resetPassword = async ({ email, otp, new_password }) => {
    const res = await authApi.resetPassword({ email, otp, new_password });
    return res.data;
  };

  const value = useMemo(
    () => ({
      token,
      role,
      user,
      authLoading,
      isAuthenticated: !!token,
      login,
      register,
      logout,
      requestOtp,
      verifyOtp,
      resetPassword,
    }),
    [token, role, user, authLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
