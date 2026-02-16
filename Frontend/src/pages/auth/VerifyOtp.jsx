import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthShell from "../../components/auth/AuthShell.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { getFriendlyError } from "../../utils/errorMessage.js";

const useQuery = () => new URLSearchParams(useLocation().search);

export default function VerifyOtp() {
  const navigate = useNavigate();
  const q = useQuery();
  const email = q.get("email") || "";

  const { verifyOtp, requestOtp } = useAuth();

  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
  const [otp, setOtp] = useState("");

  const err = useMemo(() => {
    const v = otp.trim();
    if (!v) return "OTP required";
    if (!/^\d{4,8}$/.test(v)) return "Enter valid OTP";
    return "";
  }, [otp]);

  const canSubmit = !err && !busy && !!email;

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setServerError("");
    if (!canSubmit) return;

    try {
      setBusy(true);
      await verifyOtp({ email, otp: otp.trim() });
      navigate(`/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp.trim())}`, {
        replace: true,
      });
    } catch (e) {
      setServerError(getFriendlyError(e, "OTP verification failed. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      setServerError("");
      setBusy(true);
      await requestOtp({ email });
    } catch (e) {
      setServerError(getFriendlyError(e, "OTP resend failed. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Verify OTP" subtitle={email ? `OTP sent to ${email}` : "Email missing"} compact={true}>
      <form onSubmit={onSubmit} className="space-y-4">
        {serverError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {serverError}
          </div>
        ) : null}

        <Input
          label="OTP"
          placeholder="Enter OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          error={err}
          inputMode="numeric"
        />

        <Button type="submit" disabled={!canSubmit}>
          {busy ? "Verifying..." : "Verify OTP"}
        </Button>

        <div className="flex items-center justify-between text-sm text-slate-700">
          <Link to="/forgot-password" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Change email
          </Link>
          <button type="button" onClick={resend} className="font-semibold text-slate-700 hover:text-slate-900">
            Resend OTP
          </button>
        </div>
      </form>
    </AuthShell>
  );
}
