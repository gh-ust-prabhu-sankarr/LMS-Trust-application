import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLoanFormTemplates from "./pages/admin/AdminLoanFormTemplates.jsx";
import DynamicLoanApply from "./pages/loans/DynamicLoanApply.jsx";

// Auth pages
import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";

import AdminLogin from "./pages/auth/AdminLogin.jsx";
import LoanOfficerLogin from "./pages/auth/LoanOfficerLogin.jsx";

/* Forgot Password (Customer + Loan Officer) */
import ForgotPassword from "./pages/auth/ForgotPassword.jsx";
import VerifyOtp from "./pages/auth/VerifyOtp.jsx";
import ResetPassword from "./pages/auth/ResetPassword.jsx";

// Auth guards
import AuthGate from "./auth/AuthGate.jsx";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";

// Landing
import LandingPage from "./pages/LandingPage.jsx";

// Dashboards
import UserDashboard from "./pages/app/UserDashboard.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import OfficerDashboard from "./pages/officer/OfficerDashboard.jsx";
import EducationLoanApplication from "./pages/loans/applications/EducationLoanApplication.jsx";
// ✅ NEW: Loan page
import EducationLoanEMI from "./pages/loans/EducationLoanEMI.jsx";
import BusinessLoanEMI from "./pages/loans/BusinessLoanEMI.jsx";
import PersonalLoanEMI from "./pages/loans/PersonalLoanEMI.jsx";
import VehicleLoanEMI from "./pages/loans/VehicleLoanEMI.jsx";


import BusinessLoanApplication from
  "./pages/loans/applications/BusinessLoanApplication.jsx";
import LoanSection from "./components/loans/LoansSection.jsx";
export default function App() {
  return (
    <Routes>
      {/* Landing */}
      <Route path="/" element={<LandingPage />} />

      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
       

      {/* ADMIN & OFFICER AUTH */}
      <Route path="/login/admin" element={<AdminLogin />} />
      <Route path="/login/loan-officer" element={<LoanOfficerLogin />} />
<Route path="/education-loan/apply" element={<EducationLoanApplication />} />

      {/* FORGOT PASSWORD (CUSTOMER + LOAN OFFICER ONLY) */}
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Loan Pages */}
      <Route path="/loan/education" element={<EducationLoanEMI />} />
      <Route path="/loan/business" element={<BusinessLoanEMI />} />
      <Route path="/loan/personal" element={<PersonalLoanEMI />} />
       <Route path="/loan/vehicle" element={<VehicleLoanEMI />} />




       
<Route
  path="/loan/business/apply"
  element={<BusinessLoanApplication />}
/>

      {/* Gate */}
      <Route path="/gate" element={<AuthGate />} />

      {/* Dashboards */}
      <Route
        path="/app"
        element={
          <ProtectedRoute allow={["CUSTOMER"]}>
            <UserDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allow={["CUSTOMER"]}>
            <UserDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute allow={["ADMIN"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/officer"
        element={
          <ProtectedRoute allow={["CREDIT_OFFICER"]}>
            <OfficerDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/admin/forms" element={<AdminLoanFormTemplates />} />
      <Route path="/loan/:loanType/apply" element={<DynamicLoanApply />} />


      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
} 
