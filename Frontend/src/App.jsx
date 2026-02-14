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
import PaySuccess from "./pages/pay/PaySuccess.jsx";
import PayCancel from "./pages/pay/PayCancel.jsx";


export default function App() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--fs-bg)]">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[var(--fs-bg)]" />
        <div className="absolute top-[-12%] left-[12%] h-[45vh] w-[38vw] rounded-full blur-[130px]" style={{ backgroundColor: "color-mix(in srgb, var(--fs-emerald) 24%, transparent)" }} />
        <div className="absolute top-[8%] right-[10%] h-[38vh] w-[34vw] rounded-full blur-[130px]" style={{ backgroundColor: "color-mix(in srgb, var(--fs-blue) 18%, transparent)" }} />
        <div className="absolute bottom-[-14%] left-[20%] h-[44vh] w-[34vw] rounded-full blur-[140px]" style={{ backgroundColor: "color-mix(in srgb, var(--fs-purple) 16%, transparent)" }} />
        <div className="absolute bottom-[-18%] right-[8%] h-[48vh] w-[38vw] rounded-full blur-[150px]" style={{ backgroundColor: "color-mix(in srgb, var(--fs-orange) 14%, transparent)" }} />
        <div className="absolute top-[38%] left-[42%] h-[34vh] w-[26vw] rounded-full blur-[120px]" style={{ backgroundColor: "color-mix(in srgb, var(--fs-pink) 10%, transparent)" }} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[color-mix(in_srgb,var(--fs-slate)_4%,transparent)] to-transparent" />
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
          
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/pay/success" element={<PaySuccess />} />
          <Route path="/pay/cancel" element={<PayCancel />} />


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
