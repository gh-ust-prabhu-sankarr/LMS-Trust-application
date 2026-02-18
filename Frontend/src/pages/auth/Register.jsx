import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../../components/auth/AuthShell.jsx";
import Input from "../../components/ui/Input.jsx";
import Button from "../../components/ui/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { getFriendlyError } from "../../utils/errorMessage.js";
import { usePopup } from "../../components/ui/PopupProvider.jsx";

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRx = /^[6-9]\d{9}$/;
const legalNameRx = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;
const sanitizeNameInput = (value = "") => value.replace(/[^A-Za-z\s'-]/g, "");

const validatePassword = (password = "") => ({
  minLength: password.length >= 8,
  upper: /[A-Z]/.test(password),
  lower: /[a-z]/.test(password),
  digit: /\d/.test(password),
  special: /[^A-Za-z0-9]/.test(password),
});

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showPopup } = usePopup();

  const [busy, setBusy] = useState(false);

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

  const passwordChecks = useMemo(() => validatePassword(form.password), [form.password]);
  const passwordScore = useMemo(
    () => Object.values(passwordChecks).filter(Boolean).length,
    [passwordChecks]
  );
  const passwordMeter = useMemo(() => {
    if (!form.password) return { label: "", cls: "bg-slate-300", width: "w-0" };
    if (passwordScore <= 2) return { label: "Bad", cls: "bg-rose-500", width: "w-1/3" };
    if (passwordScore <= 4) return { label: "Strong", cls: "bg-amber-500", width: "w-2/3" };
    return { label: "Very Strong", cls: "bg-emerald-600", width: "w-full" };
  }, [passwordScore, form.password]);

  const validationErrors = useMemo(() => {
    const e = {};

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();

    if (!firstName) e.firstName = "First name is required";
    else if (!legalNameRx.test(firstName)) e.firstName = "Enter a legal first name (letters only)";

    if (!lastName) e.lastName = "Last name is required";
    else if (!legalNameRx.test(lastName)) e.lastName = "Enter a legal last name (letters only)";

    if (!email) e.email = "Email is required";
    else if (!emailRx.test(email)) e.email = "Enter a valid email address";

    if (!phone) e.phone = "Phone number is required";
    else if (!phoneRx.test(phone)) e.phone = "Enter a valid 10-digit Indian phone number";

    if (!form.password) e.password = "Password is required";
    else if (!Object.values(passwordChecks).every(Boolean)) {
      e.password = "Password must contain uppercase, lowercase, number and special character";
    }

    if (!form.confirmPassword) e.confirmPassword = "Confirm password is required";
    else if (form.confirmPassword !== form.password) e.confirmPassword = "Passwords do not match";

    return e;
  }, [form, passwordChecks]);

  const errors = useMemo(() => {
    const visible = {};
    Object.keys(validationErrors).forEach((k) => {
      if (touched[k]) visible[k] = validationErrors[k];
    });
    return visible;
  }, [validationErrors, touched]);

  const canSubmit =
    Object.keys(validationErrors).length === 0 &&
    !busy;

  const onSubmit = async (ev) => {
    ev.preventDefault();

    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      password: true,
      confirmPassword: true,
    });

    if (Object.keys(validationErrors).length > 0) {
      const firstError = Object.values(validationErrors)[0];
      showPopup(firstError, { type: "error", title: "Registration Error" });
      return;
    }

    try {
      setBusy(true);
      const composedUsername = `${form.firstName.trim()} ${form.lastName.trim()}`
        .replace(/\s+/g, " ");

      await register({
        username: composedUsername,
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone.trim(),
      });
      showPopup("Registration successful. Please login to continue.", { type: "success" });
      navigate("/login", { replace: true });
    } catch (err) {
      showPopup(getFriendlyError(err, "Registration failed. Please try again."), {
        type: "error",
        title: "Registration Failed",
      });
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="First Name"
            placeholder="Legal first name"
            value={form.firstName}
            onChange={(e) => {
              setForm((p) => ({ ...p, firstName: sanitizeNameInput(e.target.value) }));
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
              setForm((p) => ({ ...p, lastName: sanitizeNameInput(e.target.value) }));
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
            onBlur={() => {
              setForm((p) => ({ ...p, email: p.email.trim().toLowerCase() }));
              setTouched((t) => ({ ...t, email: true }));
            }}
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
        <div className="-mt-1 md:w-[calc(50%-0.5rem)]">
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div className={`h-2 rounded-full transition-all duration-300 ${passwordMeter.cls} ${passwordMeter.width}`} />
          </div>
          {passwordMeter.label && (
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {passwordMeter.label}
            </p>
          )}
        </div>

        <Button type="submit" variant="primary" disabled={!canSubmit}>
          {busy ? "Creating..." : "Create Account"}
        </Button>
      </form>
    </AuthShell>
  );
}
