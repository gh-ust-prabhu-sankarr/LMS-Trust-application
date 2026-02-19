import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../../components/auth/AuthShell.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { getFriendlyError } from "../../utils/errorMessage.js";

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
  const [show, setShow] = useState(false);

  const [form, setForm] = useState({ identifier: "", password: "" });

  const [touched, setTouched] = useState({ identifier: false, password: false });

  const errors = useMemo(() => {
    const e = {};

    if (touched.identifier) {
      const v = form.identifier.trim();
      if (!v) e.identifier = "Enter email";
      else if (!emailRx.test(v)) e.identifier = "Enter a valid email";
    }

    if (touched.password && !form.password) {
      e.password = "Enter your password";
    }

    return e;
  }, [form, touched]);

  const canSubmit = Object.keys(errors).length === 0 && !busy;

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setServerError("");

    setTouched({ identifier: true, password: true });

    if (!canSubmit) return;

    try {
      setBusy(true);

      const out = await login({
        identifier: form.identifier.trim(),
        password: form.password,
      });

      if (out?.role !== "ADMIN") throw new Error("Not authorized for Admin portal");

      navigate("/admin", { replace: true });
    } catch (err) {
      setServerError(getFriendlyError(err, "Login failed. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Admin Login" subtitle="">
      <form onSubmit={onSubmit} className="space-y-4">
        {serverError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {serverError}
          </div>
        )}

        <Input
          label="Admin Email"
          placeholder="admin@email.com"
          value={form.identifier}
          onChange={(e) => {
            setForm((p) => ({ ...p, identifier: e.target.value }));
            setTouched((t) => ({ ...t, identifier: true }));
          }}
          onBlur={() => setTouched((t) => ({ ...t, identifier: true }))}
          error={errors.identifier}
          autoComplete="email"
        />

        <Input
          label="Password"
          type={show ? "text" : "password"}
          placeholder="••••••••"
          value={form.password}
          onChange={(e) => {
            setForm((p) => ({ ...p, password: e.target.value }));
            setTouched((t) => ({ ...t, password: true }));
          }}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={errors.password}
          autoComplete="current-password"
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

        <div className="flex items-center justify-between">
          

          <span className="text-xs font-semibold text-slate-400 cursor-not-allowed select-none">

          </span>
        </div>

        <Button type="submit" variant="primary" disabled={!canSubmit}>
          {busy ? "Please wait..." : "Login"}
        </Button>

        <div className="text-center text-sm text-slate-700">
          Loan Officer?{" "}
          <Link to="/login/loan-officer" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Officer login
          </Link>
        </div>

        <div className="text-center text-xs text-slate-500">
          Customer?{" "}
          <Link to="/login" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Customer login
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
