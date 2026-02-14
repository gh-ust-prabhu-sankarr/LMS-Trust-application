import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/authApi.js";
import { getToken, removeToken, setToken } from "../utils/token.js";
import { decodeToken, getRoleFromToken, isTokenUsable } from "../utils/jwt.js";

const AuthContext = createContext(null);

const restoreValidToken = () => {
  const stored = getToken();
  if (!stored) return null;
  if (!isTokenUsable(stored)) {
    removeToken();
    return null;
  }
  return stored;
};

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(restoreValidToken);
  const [role, setRole] = useState(() => getRoleFromToken(restoreValidToken()));
  const [user, setUser] = useState(null);

  useEffect(() => {
    let alive = true;

    const syncSession = async () => {
      const t = restoreValidToken();
      if (!alive) return;

      if (!t) {
        setTokenState(null);
        setRole(null);
        setUser(null);
        return;
      }

      const restoredRole = getRoleFromToken(t);
      const payload = decodeToken(t);
      setTokenState(t);
      setRole(restoredRole);
      setUser((prev) =>
        prev || {
          username: payload?.sub || payload?.username || "User",
          email: payload?.email || null,
          role: restoredRole || null,
        },
      );

      try {
        const meRes = await authApi.me();
        if (!alive) return;

        const me = meRes?.data?.data || meRes?.data || null;
        if (me) {
          setUser({
            username: me.username || payload?.sub || "User",
            email: me.email || payload?.email || null,
            role: String(me.role || restoredRole || "").replace(/^ROLE_/, "") || null,
          });
          setRole(String(me.role || restoredRole || "").replace(/^ROLE_/, "") || null);
        }
      } catch {
        if (!alive) return;
        removeToken();
        setTokenState(null);
        setRole(null);
        setUser(null);
      }
    };

    syncSession();

    return () => {
      alive = false;
    };
  }, []);

  const login = async ({ identifier, password }) => {
    const normalizedIdentifier = identifier?.trim();
    const res = await authApi.login({
      username: normalizedIdentifier,
      email: normalizedIdentifier,
      password,
    });
    const t = res?.data?.data?.token || res?.data?.token || res?.data?.access_token;
    if (!t) throw new Error("Token missing in response");
    if (!isTokenUsable(t)) throw new Error("Invalid token in response");
    setToken(t);
    setTokenState(t);
    const r = getRoleFromToken(t) || res?.data?.role || res?.data?.data?.role || null;
    setRole(r);
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
      isAuthenticated: !!token,
      login,
      register,
      logout,
      requestOtp,
      verifyOtp,
      resetPassword,
    }),
    [token, role, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
