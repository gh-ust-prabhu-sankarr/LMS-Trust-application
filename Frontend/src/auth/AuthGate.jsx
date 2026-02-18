import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function AuthGate() {
  const { isAuthenticated, role, user, authLoading } = useAuth();
  const effectiveRole = role || user?.role || null;

  if (authLoading) return null;

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!effectiveRole) return <Navigate to="/" replace />;
  if (effectiveRole === "ADMIN") return <Navigate to="/admin" replace />;
  if (effectiveRole === "CREDIT_OFFICER" || effectiveRole === "LOAN_OFFICER") return <Navigate to="/officer" replace />;
  return <Navigate to="/app" replace />;
}
