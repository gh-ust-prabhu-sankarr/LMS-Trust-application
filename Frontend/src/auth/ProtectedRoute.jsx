import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ allow = [], children }) {
  const { isAuthenticated, role, user, authLoading } = useAuth();
  const effectiveRole = role || user?.role || null;

  if (authLoading) return null; // or a loader component

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allow.length && !effectiveRole) return <Navigate to="/" replace />;
  if (allow.length && !allow.includes(effectiveRole)) return <Navigate to="/gate" replace />;

  return children;
}
