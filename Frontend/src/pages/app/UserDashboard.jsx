import { useEffect, useMemo, useState } from "react";
import PortalShell from "../../components/layout/PortalShell.jsx";
import { customerApi, fileApi, kycApi, loanApi, repaymentApi } from "../../api/domainApi.js";
import { useAuth } from "../../context/AuthContext.jsx";

const money = (n) =>
  typeof n === "number"
    ? n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
    : "-";

const KYC_META = {
  PENDING: { label: "PENDING", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  APPROVED: { label: "APPROVED", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  VERIFIED: { label: "APPROVED", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  REJECTED: { label: "REJECTED", cls: "bg-rose-50 text-rose-800 border-rose-200" },
};

export default function UserDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [myLoans, setMyLoans] = useState([]);
  const [activeLoanId, setActiveLoanId] = useState("");
  const [repayments, setRepayments] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [docs, setDocs] = useState([]);

  // --- Edit profile (customer entity fields) ---
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [kycError, setKycError] = useState("");
  const [myKyc, setMyKyc] = useState(null);
  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    panNumber: "",
    address: "",
    employmentType: "",
    monthlyIncome: "",
  });
  const [kycForm, setKycForm] = useState({
    fullName: "",
    dob: "",
    panNumber: "",
    aadhaarNumber: "",
  });

  const kyc = useMemo(() => {
    const key = (myKyc?.status || profile?.kycStatus || "PENDING").toUpperCase();
    return KYC_META[key] || KYC_META.PENDING;
  }, [myKyc?.status, profile?.kycStatus]);

  const stats = useMemo(() => {
    const draft = myLoans.filter((l) => l.status === "DRAFT").length;
    const active = myLoans.filter((l) => l.status === "ACTIVE" || l.status === "DISBURSED").length;
    const submitted = myLoans.filter((l) => l.status === "SUBMITTED" || l.status === "UNDER_REVIEW").length;
    const pendingEmiAmount = myLoans
      .filter((l) => l.status === "ACTIVE" || l.status === "DISBURSED")
      .reduce((sum, l) => sum + (Number(l.emi) || 0), 0);
    return { draft, active, submitted, pendingEmiAmount };
  }, [myLoans]);

  const loadBase = async () => {
    setError("");
    try {
      let profileData = null;
      const [profileRes, loansRes] = await Promise.allSettled([customerApi.getMyProfile(), loanApi.getMyLoans()]);
      if (profileRes.status === "fulfilled") {
        const p = profileRes.value.data;
        profileData = p;
        setProfile(p);
        setEditForm({
          fullName: p?.fullName || "",
          phone: p?.phone || "",
          panNumber: p?.panNumber || "",
          address: p?.address || "",
          employmentType: p?.employmentType || "",
          monthlyIncome: p?.monthlyIncome ?? "",
        });
        setKycForm((prev) => ({
          ...prev,
          fullName: p?.fullName || "",
          panNumber: p?.panNumber || "",
        }));
      }
      if (loansRes.status === "fulfilled") setMyLoans(loansRes.value.data || []);
      try {
        const myKycRes = await kycApi.getMyKyc();//calls backend kycme.....check alreedy submited or not...
        const k = myKycRes?.data || null; //  based on this myKyc ?  truee //falss
        setMyKyc(k);
        if (k) {
          setKycForm({
            fullName: k?.fullName || profileData?.fullName || "",
            dob: k?.dob || "",
            panNumber: k?.panNumber || profileData?.panNumber || "",
            aadhaarNumber: k?.aadhaarNumber || "",
          });
        }
      } catch {
        setMyKyc(null);
      }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed loading dashboard");
    } finally {
      setLoading(false);
    }
  };
//first....
  useEffect(() => {
    loadBase();
  }, []);

  useEffect(() => {
    if (!activeLoanId) {
      setRepayments([]);
      setSchedule(null);
      setDocs([]);
      return;
    }
    const loadLoanSide = async () => {
      try {
        const [repRes, schRes, fileRes] = await Promise.allSettled([
          repaymentApi.getByLoan(activeLoanId),
          repaymentApi.getSchedule(activeLoanId),
          fileApi.listByEntity("LOAN_APPLICATION", activeLoanId),
        ]);
        if (repRes.status === "fulfilled") setRepayments(repRes.value.data || []);
        if (schRes.status === "fulfilled") setSchedule(schRes.value.data || null);
        if (fileRes.status === "fulfilled") setDocs(fileRes.value.data || []);
      } catch {
        // ignore side panel errors
      }
    };
    loadLoanSide();
  }, [activeLoanId]);

  const startEdit = () => {
    setEditError("");
    setEditing(true);
    setEditForm({
      fullName: profile?.fullName || "",
      phone: profile?.phone || "",
      panNumber: profile?.panNumber || "",
      address: profile?.address || "",
      employmentType: profile?.employmentType || "",
      monthlyIncome: profile?.monthlyIncome ?? "",
    });
  };

  const cancelEdit = () => {
    setEditError("");
    setEditing(false);
  };

  const saveProfile = async () => {
    setEditError("");
    try {
      setSaving(true);
      const payload = {
        fullName: editForm.fullName?.trim(),
        phone: editForm.phone?.trim(),
        panNumber: editForm.panNumber?.trim()?.toUpperCase(),
        address: editForm.address?.trim(),
        employmentType: editForm.employmentType?.trim(),
        monthlyIncome: editForm.monthlyIncome === "" ? null : Number(editForm.monthlyIncome),
      };
      const res = await customerApi.updateMyProfile(payload);
      setProfile(res.data);
      setEditing(false);
    } catch (e) {
      setEditError(e?.response?.data?.message || e?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const submitKyc = async () => {
    setKycError("");
    try {
      setKycSubmitting(true);//DISABLE BUTTN
      await kycApi.submit({//submiting calling backendd....sending to create new kyc records
        fullName: kycForm.fullName?.trim(),
        dob: kycForm.dob,
        panNumber: kycForm.panNumber?.trim()?.toUpperCase(),
        aadhaarNumber: kycForm.aadhaarNumber?.trim(),
      });
      await loadBase();
      setKycError("");
    } catch (e) {
      const payload = e?.response?.data;//BACKEND SEND ERRR MSGG
      if (payload?.message) {
        setKycError(payload.message);//ONE ERRE PANx
      } else if (payload && typeof payload === "object" && !Array.isArray(payload)) {//TWOR ERRS PAN X AADHAR
        const validationErrors = payload;
        const firstMessage = Object.values(validationErrors)[0];
        setKycError(firstMessage || "KYC validation failed");
      } else {
        setKycError(e?.response?.data?.message || e?.message || "KYC submission failed");
      }
    } finally {
      setKycSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PortalShell title="Customer Portal" subtitle="Loading your workspace...">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">Loading...</div>
      </PortalShell>
    );
  }

  return (
    <PortalShell title="Customer Portal" subtitle="Profile, loans, repayments, and documents in one place.">
      {error ? (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <section className="mb-8 rounded-[2rem] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50/60 p-6 md:p-8 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white/80 p-5">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700">Customer Dashboard</div>
            <h2 className="mt-3 text-3xl md:text-4xl font-serif text-slate-900 leading-tight">
              Welcome, <span className="text-emerald-700 italic">{user?.username || profile?.fullName || "Customer"}</span>
            </h2>
            <p className="mt-3 text-slate-600 max-w-xl">Your loan profile snapshot with credit and repayment health.</p>

            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">User Details</div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${kyc.cls}`}>
                    {kyc.label}
                  </span>
                  <button
                    onClick={editing ? cancelEdit : startEdit}
                    className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl border border-slate-300 hover:bg-slate-50"
                  >
                    {editing ? "Cancel" : "Edit"}
                  </button>
                </div>
              </div>

              {editError ? (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{editError}</div>
              ) : null}

              {!editing ? (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Info label="Username" value={user?.username || "-"} />
                  <Info label="Phone Number" value={profile?.phone || "-"} />
                  <Info label="Full Name" value={profile?.fullName || "-"} />
                  <Info label="PAN Number" value={profile?.panNumber || "-"} />
                  <Info label="Employment Type" value={profile?.employmentType || "-"} />
                  <Info label="Monthly Income" value={money(profile?.monthlyIncome)} />
                  <Info label="Credit Score" value={profile?.creditScore ?? "-"} />
                  <Info label="KYC Status" value={myKyc?.status || profile?.kycStatus || "PENDING"} />
                  <Info label="Address" value={profile?.address || "-"} wide />
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Field label="Full Name">
                    <input
                      value={editForm.fullName}
                      onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </Field>

                  <Field label="Phone">
                    <input
                      value={editForm.phone}
                      onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </Field>

                  <Field label="PAN Number">
                    <input
                      value={editForm.panNumber}
                      onChange={(e) => setEditForm((p) => ({ ...p, panNumber: e.target.value.toUpperCase() }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm uppercase"
                    />
                  </Field>

                  <Field label="Employment Type">
                    <input
                      value={editForm.employmentType}
                      onChange={(e) => setEditForm((p) => ({ ...p, employmentType: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Salaried / Self-employed"
                    />
                  </Field>

                  <Field label="Monthly Income">
                    <input
                      type="number"
                      value={editForm.monthlyIncome}
                      onChange={(e) => setEditForm((p) => ({ ...p, monthlyIncome: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </Field>

                  <Field label="Address" wide>
                    <input
                      value={editForm.address}
                      onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                    />
                  </Field>

                  <div className="md:col-span-2 flex flex-wrap gap-2 pt-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={saveProfile}
                      className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save Profile"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <StatCard label="Active Loans" value={stats.active} />
            <StatCard label="Pending EMI (Monthly)" value={money(stats.pendingEmiAmount)} />
            <StatCard label="CIBIL Score" value={profile?.creditScore ?? "-"} />
          </div>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-slate-900">KYC Verification</h2>
          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${kyc.cls}`}>
            {myKyc?.status || "NOT SUBMITTED"}
          </span>
        </div>

        {kycError ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{kycError}</div>
        ) : null}

        {myKyc ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Info label="Full Name" value={myKyc.fullName} />
            <Info label="Date of Birth" value={myKyc.dob} />
            <Info label="PAN Number" value={myKyc.panNumber} />
            <Info label="Aadhaar Number" value={myKyc.aadhaarNumber} />
            <Info label="Status" value={myKyc.status} />
            <Info label="Remarks" value={myKyc.remarks || "-"} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Full Name">
              <input
                value={kycForm.fullName}
                onChange={(e) => setKycForm((p) => ({ ...p, fullName: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="Date of Birth (yyyy-MM-dd)">
              <input
                type="date"
                value={kycForm.dob}
                onChange={(e) => setKycForm((p) => ({ ...p, dob: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </Field>
            <Field label="PAN Number">
              <input
                value={kycForm.panNumber}
                onChange={(e) => setKycForm((p) => ({ ...p, panNumber: e.target.value.toUpperCase() }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm uppercase"
                placeholder="ABCDE1234F"
              />
            </Field>
            <Field label="Aadhaar Number (12 digits)">
              <input
                value={kycForm.aadhaarNumber}
                onChange={(e) => setKycForm((p) => ({ ...p, aadhaarNumber: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                placeholder="123412341234"
              />
            </Field>
            <div className="md:col-span-2">
              <button
                type="button"
                disabled={kycSubmitting}
                onClick={submitKyc}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-60"
              >
                {kycSubmitting ? "Submitting..." : "Submit KYC"}
              </button>
              <p className="text-xs text-slate-500 mt-2">After submission, loan officer will approve/reject your KYC.</p>
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Draft Loans" value={stats.draft} />
        <StatCard label="In Review" value={stats.submitted} />
        <StatCard label="Active Loans" value={stats.active} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Customer Profile</h2>
            {profile ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <Info label="Full Name" value={profile.fullName} />
                <Info label="Phone" value={profile.phone} />
                <Info label="PAN" value={profile.panNumber} />
                <Info label="Employment Type" value={profile.employmentType} />
                <Info label="Income" value={money(profile.monthlyIncome)} />
                <Info label="KYC" value={myKyc?.status || profile.kycStatus} />
                <Info label="Credit Score" value={profile.creditScore} />
                <Info label="Address" value={profile.address} wide />
              </div>
            ) : (
              <p className="text-sm text-slate-500">Customer profile is not available yet.</p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">My Loan Applications</h2>
            <div className="space-y-3">
              {myLoans.length === 0 ? (
                <p className="text-sm text-slate-500">No applications yet.</p>
              ) : (
                myLoans.map((loan) => (
                  <div key={loan.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-slate-900">
                        {loan.id.slice(-8)} | {money(loan.requestedAmount)} | {loan.status}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Tenure: {loan.tenure} | Interest: {loan.interestRate ?? "-"} | EMI: {loan.emi ? money(loan.emi) : "-"}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-600 mb-3">Active Loan Tools</h3>
            <select
              value={activeLoanId}
              onChange={(e) => setActiveLoanId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm mb-4"
            >
              <option value="">Select Loan</option>
              {myLoans.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.id.slice(-8)} ({l.status})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">Choose a loan to view repayment, EMI schedule, and documents.</p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-600 mb-3">Repayments</h3>
            <div className="space-y-2 max-h-56 overflow-auto">
              {repayments.length === 0 ? (
                <p className="text-xs text-slate-500">No repayments yet.</p>
              ) : (
                repayments.map((r) => (
                  <div key={r.id} className="rounded-lg border border-slate-200 p-2 text-xs">
                    <div className="font-semibold text-slate-700">{money(r.amount)}</div>
                    <div className="text-slate-500">
                      {r.status} | {new Date(r.paymentDate).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-600 mb-3">EMI Schedule</h3>
            <div className="space-y-2 max-h-56 overflow-auto">
              {!schedule?.installments?.length ? (
                <p className="text-xs text-slate-500">Schedule unavailable until disbursement.</p>
              ) : (
                schedule.installments.map((ins, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 p-2 text-xs">
                    <div className="font-semibold text-slate-700">
                      EMI #{ins.emiNumber} - {money(ins.totalAmount)}
                    </div>
                    <div className="text-slate-500">
                      {ins.status} | Due: {ins.dueDate}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-600 mb-3">Documents</h3>
            <div className="space-y-2 max-h-40 overflow-auto">
              {docs.length === 0 ? (
                <p className="text-xs text-slate-500">No files uploaded.</p>
              ) : (
                docs.map((d) => (
                  <div key={d.id} className="rounded-lg border border-slate-200 p-2 text-xs">
                    <div className="font-semibold text-slate-700 break-all">{d.fileName}</div>
                    <div className="flex gap-2 mt-2">
                      <a
                        href={fileApi.downloadUrl(d.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 border border-slate-300 rounded-sm hover:bg-slate-100"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </PortalShell>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{label}</div>
      <div className="text-2xl font-semibold text-slate-900 mt-1">{value}</div>
    </div>
  );
}

function Info({ label, value, wide }) {
  return (
    <div className={wide ? "md:col-span-2 rounded-lg border border-slate-200 p-3" : "rounded-lg border border-slate-200 p-3"}>
      <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500">{label}</div>
      <div className="text-sm text-slate-800 mt-1">{value || "-"}</div>
    </div>
  );
}

function Field({ label, children, wide }) {
  return (
    <div className={wide ? "md:col-span-2" : ""}>
      <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">{label}</div>
      {children}
    </div>
  );
}
