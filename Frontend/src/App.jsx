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
    <div className="relative min-h-screen overflow-x-hidden app-gradient-bg">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 app-gradient-bg" />
        <div
          className="absolute top-[-12%] left-[10%] h-[42vh] w-[35vw] rounded-full blur-[130px]"
          style={{ backgroundColor: "color-mix(in srgb, var(--fs-emerald) 22%, transparent)" }}
        />
        <div
          className="absolute top-[10%] right-[8%] h-[36vh] w-[32vw] rounded-full blur-[125px]"
          style={{ backgroundColor: "color-mix(in srgb, #6ee7b7 24%, transparent)" }}
        />
        <div
          className="absolute bottom-[-16%] right-[6%] h-[46vh] w-[36vw] rounded-full blur-[145px]"
          style={{ backgroundColor: "color-mix(in srgb, #34d399 16%, transparent)" }}
        />
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
          <Route path="/dashboard" element={<AuthGate />} />
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
              <ProtectedRoute allow={["CREDIT_OFFICER", "LOAN_OFFICER"]}>
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
