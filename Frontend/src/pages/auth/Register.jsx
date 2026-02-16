import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../../components/auth/AuthShell.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { getFriendlyError } from "../../utils/errorMessage.js";

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRx = /^[6-9]\d{9}$/;

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    email: false,
    phone: false,
    password: false,
    confirmPassword: false,
  });

  const errors = useMemo(() => {
    const e = {};

    if (touched.firstName && !form.firstName.trim()) e.firstName = "First name required";
    if (touched.lastName && !form.lastName.trim()) e.lastName = "Last name required";

    if (touched.email && !emailRx.test(form.email.trim())) e.email = "Valid email required";

    if (touched.phone && !phoneRx.test(form.phone.trim())) e.phone = "Valid 10-digit phone required";

    if (touched.password && form.password.length < 8) e.password = "Min 8 characters";
    if (touched.confirmPassword && form.confirmPassword !== form.password) e.confirmPassword = "Passwords not matching";

    return e;
  }, [form, touched]);

  const canSubmit =
    Object.keys(errors).length === 0 &&
    !busy;

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setServerError("");

    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
    });

    if (!canSubmit) return;

    try {
      setBusy(true);
      const composedUsername = `${form.firstName.trim()} ${form.lastName.trim()}`
        .replace(/\s+/g, " ")
        .toLowerCase();

      await register({
        username: composedUsername,
        email: form.email.trim(),
        password: form.password,
      });
      navigate("/login", { replace: true });
    } catch (err) {
      setServerError(getFriendlyError(err, "Registration failed. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Create account"
      subtitle="Quick registration"
      compact={true}
      cardMaxWidth="max-w-xl"
      footer={
        <div className="text-center text-sm text-slate-700">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-emerald-700 hover:text-emerald-800">
            Login
          </Link>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {serverError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {serverError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="First Name"
            placeholder="First name"
            value={form.firstName}
            onChange={(e) => {
              setForm((p) => ({ ...p, firstName: e.target.value }));
              setTouched((t) => ({ ...t, firstName: true }));
            }}
            onBlur={() => setTouched((t) => ({ ...t, firstName: true }))}
            error={errors.firstName}
            autoComplete="given-name"
          />

          <Input
            label="Last Name"
            placeholder="Last name"
            value={form.lastName}
            onChange={(e) => {
              setForm((p) => ({ ...p, lastName: e.target.value }));
              setTouched((t) => ({ ...t, lastName: true }));
            }}
            onBlur={() => setTouched((t) => ({ ...t, lastName: true }))}
            error={errors.lastName}
            autoComplete="family-name"
          />
        </div>

        {/* EMAIL + EMAIL OTP */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Input
              label="Email"
              type="email"
              placeholder="name@email.com"
            value={form.email}
            onChange={(e) => {
                setForm((p) => ({ ...p, email: e.target.value }));
                setTouched((t) => ({ ...t, email: true }));
              }}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              error={errors.email}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Input
              label="Phone Number"
              type="tel"
              placeholder="9876543210"
              value={form.phone}
              onChange={(e) => {
                setForm((p) => ({ ...p, phone: e.target.value }));
                setTouched((t) => ({ ...t, phone: true }));
              }}
              onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              error={errors.phone}
              autoComplete="tel"
            />
          </div>
        </div>

        {/* PASSWORDS */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Password"
            type="password"
            placeholder="Min 8 characters"
            value={form.password}
            onChange={(e) => {
              setForm((p) => ({ ...p, password: e.target.value }));
              setTouched((t) => ({ ...t, password: true }));
            }}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            error={errors.password}
            autoComplete="new-password"
          />

          <Input
            label="Confirm Password"
            type="password"
            placeholder="Re-enter password"
            value={form.confirmPassword}
            onChange={(e) => {
              setForm((p) => ({ ...p, confirmPassword: e.target.value }));
              setTouched((t) => ({ ...t, confirmPassword: true }));
            }}
            onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
            error={errors.confirmPassword}
            autoComplete="new-password"
          />
        </div>

        <Button type="submit" variant="primary" disabled={!canSubmit}>
          {busy ? "Creating..." : "Create Account"}
        </Button>
      </form>
    </AuthShell>
  );
}
