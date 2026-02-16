import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../../components/auth/AuthShell.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { getFriendlyError } from "../../utils/errorMessage.js";

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { requestOtp } = useAuth();

  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
  const [email, setEmail] = useState("");

  const err = useMemo(() => {
    if (!emailRx.test(email.trim())) return "Enter a valid email";
    return "";
  }, [email]);

  const canSubmit = !err && !busy;

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setServerError("");
    if (!canSubmit) return;

    try {
      setBusy(true);
      await requestOtp({ email: email.trim() });
      navigate(`/verify-otp?email=${encodeURIComponent(email.trim())}`, { replace: true });
    } catch (e) {
      setServerError(getFriendlyError(e, "OTP request failed. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Forgot password" subtitle="We will send OTP to your email" compact={true}>
      <form onSubmit={onSubmit} className="space-y-4">
        {serverError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {serverError}
          </div>
        ) : null}

        <Input
          label="Email"
          type="email"
          placeholder="name@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={err}
          autoComplete="email"
        />

        <Button type="submit" disabled={!canSubmit}>
          {busy ? "Sending..." : "Send OTP"}
        </Button>

        <div className="text-center text-sm text-slate-700">
          Back to{" "}
          <Link to="/login" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Login
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
