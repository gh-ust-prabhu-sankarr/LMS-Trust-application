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
  const storedRole = initialToken ? normalizeRole(sessionStorage.getItem(ROLE_KEY)) : null;
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
        sessionStorage.removeItem(ROLE_KEY);
        if (!cancelled) setAuthLoading(false);
        return;
      }

      if (role) sessionStorage.setItem(ROLE_KEY, role);

      try {
        const res = await authApi.me();
        if (cancelled) return;
        const apiUser = res?.data?.data || res?.data || null;
        const resolvedRole = normalizeRole(apiUser?.role || apiUser?.authorities?.[0]);
        if (resolvedRole && resolvedRole !== role) {
          setRole(resolvedRole);
          sessionStorage.setItem(ROLE_KEY, resolvedRole);
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
    const loginPayload = res?.data?.data || res?.data || {};
    const t = loginPayload?.token || res?.data?.token || res?.data?.access_token;
    if (!t) throw new Error("Token missing in response");
    setToken(t);
    setTokenState(t);
    const r = normalizeRole(getRoleFromToken(t) || loginPayload?.role || null);
    setRole(r);
    if (r) sessionStorage.setItem(ROLE_KEY, r);
    const userPayload = loginPayload?.user || null;
    setUser(userPayload || {
      username: loginPayload?.username || normalizedIdentifier,
      email: loginPayload?.email || null,
      role: r,
    });

    // Hydrate missing profile fields (like phone) immediately after login.
    try {
      const meRes = await authApi.me();
      const apiUser = meRes?.data?.data || meRes?.data || null;
      const resolvedRole = normalizeRole(apiUser?.role || apiUser?.authorities?.[0]) || r;
      setUser((prev) => ({ ...(prev || {}), ...(apiUser || {}), role: resolvedRole }));
      if (resolvedRole) {
        setRole(resolvedRole);
        sessionStorage.setItem(ROLE_KEY, resolvedRole);
      }
    } catch {
      // keep basic login payload as fallback
    }
    return { token: t, role: r };
  };

  const register = async (payload) => {
    const res = await authApi.register(payload);
    return res.data;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // Even if audit call fails, clear client auth state to avoid trapping user.
      console.error("Logout request failed", err);
    } finally {
      removeToken();
      sessionStorage.removeItem(ROLE_KEY);
      localStorage.removeItem(ROLE_KEY);
      setTokenState(null);
      setRole(null);
      setUser(null);
    }
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
