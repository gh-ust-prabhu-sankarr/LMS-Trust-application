import React, { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthShell from "../../components/auth/AuthShell.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { getFriendlyError } from "../../utils/errorMessage.js";

const useQuery = () => new URLSearchParams(useLocation().search);

export default function ResetPassword() {
  const navigate = useNavigate();
  const q = useQuery();
  const email = q.get("email") || "";
  const otp = q.get("otp") || "";

  const { resetPassword } = useAuth();

  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ password: "", confirm: "" });

  const errors = useMemo(() => {
    const e = {};
    if (!form.password || form.password.length < 8) e.password = "Min 8 characters";
    if (form.confirm !== form.password) e.confirm = "Passwords not matching";
    if (!email) e.email = "Email missing";
    if (!otp) e.otp = "OTP missing";
    return e;
  }, [form, email, otp]);

  const canSubmit = Object.keys(errors).length === 0 && !busy;

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setServerError("");
    if (!canSubmit) return;

    try {
      setBusy(true);
      await resetPassword({ email, otp, new_password: form.password });
      navigate("/login", { replace: true });
    } catch (e) {
      setServerError(getFriendlyError(e, "Password reset failed. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Reset password" subtitle="Set a new password" compact={true}>
      <form onSubmit={onSubmit} className="space-y-4">
        {serverError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {serverError}
          </div>
        ) : null}

        <Input
          label="New Password"
          type={show ? "text" : "password"}
          placeholder="Min 8 characters"
          value={form.password}
          onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
          error={errors.password}
          autoComplete="new-password"
          right={
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="rounded-xl px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              {show ? "Hide" : "Show"}
            </button>
          }
        />

        <Input
          label="Confirm Password"
          type={show ? "text" : "password"}
          placeholder="Re-enter password"
          value={form.confirm}
          onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
          error={errors.confirm}
          autoComplete="new-password"
        />

        <Button type="submit" disabled={!canSubmit}>
          {busy ? "Saving..." : "Update Password"}
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
