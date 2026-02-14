import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";
import AdminLogin from "./pages/auth/AdminLogin.jsx";
import LoanOfficerLogin from "./pages/auth/LoanOfficerLogin.jsx";
import ForgotPassword from "./pages/auth/ForgotPassword.jsx";
import VerifyOtp from "./pages/auth/VerifyOtp.jsx";
import ResetPassword from "./pages/auth/ResetPassword.jsx";
import AuthGate from "./auth/AuthGate.jsx";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import UserDashboard from "./pages/app/UserDashboard.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import OfficerDashboard from "./pages/officer/OfficerDashboard.jsx";
import LoanDetailsEMI from "./pages/loans/LoanDetailsEMI.jsx";
import LoanApplication from "./pages/loans/applications/LoanApplication.jsx";

export default function App() {
  return (
    <div className="relative min-h-screen overflow-x-hidden hero-page-bg">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 hero-page-bg" />
        <div
          className="absolute inset-0 opacity-[0.09]"
          style={{
            backgroundImage:
              "linear-gradient(#0F172A 1px, transparent 1px), linear-gradient(90deg, #0F172A 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute top-[-10%] right-[-5%] h-[600px] w-[600px] rounded-full bg-emerald-400/20 blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-5%] h-[500px] w-[500px] rounded-full bg-blue-400/15 blur-[120px]" />
        <div className="absolute top-[30%] left-[20%] h-[300px] w-[300px] rounded-full bg-indigo-400/10 blur-[100px]" />
        <div className="absolute inset-0 backdrop-blur-[1.5px]" />
      </div>

      <div className="relative z-10">
        <Routes>
          <Route path="/" element={<LandingPage />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login/admin" element={<AdminLogin />} />
          <Route path="/login/loan-officer" element={<LoanOfficerLogin />} />

          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route path="/loan/:slug" element={<LoanDetailsEMI />} />
          <Route path="/loan/:slug/apply" element={<LoanApplication />} />
          <Route path="/education-loan/apply" element={<Navigate to="/loan/education/apply" replace />} />

          <Route path="/gate" element={<AuthGate />} />

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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}
