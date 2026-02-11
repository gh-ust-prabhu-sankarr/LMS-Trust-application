import { useEffect, useMemo, useState } from "react";
import PortalShell from "../../components/layout/PortalShell.jsx";
import { customerApi, fileApi, kycApi, loanApi } from "../../api/domainApi.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useEmiSchedule } from "../../hooks/useEmiSchedule.js";

const money = (n) => {
  const value = Number(n);
  return Number.isFinite(value)
    ? value.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
    : "-";
};

const KYC_META = {
  PENDING: { label: "PENDING", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  APPROVED: { label: "APPROVED", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  VERIFIED: { label: "APPROVED", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  REJECTED: { label: "REJECTED", cls: "bg-rose-50 text-rose-800 border-rose-200" },
};
const MAX_KYC_DOC_SIZE_BYTES = 500 * 1024; //size....kb 

export default function UserDashboard() {
  const { user } = useAuth();
  
  // --- UI State ---
  const [activeTab, setActiveTab] = useState("profile"); // profile | kyc | loans | repayments
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --- Data States ---
  const [profile, setProfile] = useState(null);
  const [myLoans, setMyLoans] = useState([]);
  const [activeLoanId, setActiveLoanId] = useState("");
  const { repayments, schedule, docs, actionBusy, actionError, payInstallment, missInstallment } = useEmiSchedule(activeLoanId);
  const [myKyc, setMyKyc] = useState(null);

  // --- Form States ---
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [kycError, setKycError] = useState("");
  const [kycEditing, setKycEditing] = useState(false);
  const [panFile, setPanFile] = useState(null);
  const [aadhaarFile, setAadhaarFile] = useState(null);

  const [editForm, setEditForm] = useState({
    fullName: "", phone: "", panNumber: "", address: "", employmentType: "", monthlyIncome: "",
  });
  const [kycForm, setKycForm] = useState({
    fullName: "", dob: "", panNumber: "", aadhaarNumber: "",
  });
  const resolvedWallet = profile?.walletBalance ?? 100000;
  const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("en-IN");
  };

  // --- Logic ---
  const kycStatusMeta = useMemo(() => {
    const key = (myKyc?.status || profile?.kycStatus || "PENDING").toUpperCase();
    return KYC_META[key] || KYC_META.PENDING;
  }, [myKyc?.status, profile?.kycStatus]);
  const kycSubmissionCount = myKyc?.submissionCount ?? 0;
  const canResubmitKyc = kycSubmissionCount < 2;

  const stats = useMemo(() => {
    const active = myLoans.filter((l) => l.status === "ACTIVE" || l.status === "DISBURSED").length;
    const pendingEmiAmount = myLoans
      .filter((l) => l.status === "ACTIVE" || l.status === "DISBURSED")
      .reduce((sum, l) => sum + (Number(l.emi) || 0), 0);
    return { 
        draft: myLoans.filter((l) => l.status === "DRAFT").length,
        submitted: myLoans.filter((l) => l.status === "SUBMITTED" || l.status === "UNDER_REVIEW").length,
        active, 
        pendingEmiAmount 
    };
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
      }
      if (loansRes.status === "fulfilled") setMyLoans(loansRes.value.data || []);

      try {
        const myKycRes = await kycApi.getMyKyc();
        const k = myKycRes?.data || null;
        setMyKyc(k);
        if (k) {
          setKycForm({
            fullName: k?.fullName || profileData?.fullName || "",
            dob: k?.dob || "",
            panNumber: k?.panNumber || profileData?.panNumber || "",
            aadhaarNumber: k?.aadhaarNumber || "",
          });
        }
      } catch { setMyKyc(null); }
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed loading dashboard");
    } finally { setLoading(false); }
  };

  useEffect(() => { loadBase(); }, []);

  const saveProfile = async () => {
    setEditError("");
    try {
      setSaving(true);
      const payload = {
        fullName: String(editForm.fullName || profile?.fullName || "").trim(),
        phone: String(editForm.phone || profile?.phone || "").replace(/\D/g, "").slice(-10),
        panNumber: String(editForm.panNumber || profile?.panNumber || "").toUpperCase().trim(),
        address: String(editForm.address || profile?.address || "").trim(),
        employmentType: String(editForm.employmentType || profile?.employmentType || "").trim(),
        monthlyIncome: Number(editForm.monthlyIncome || profile?.monthlyIncome || 0),
      };

      if (!payload.fullName || !payload.phone || !payload.panNumber || !payload.address || !payload.employmentType) {
        setEditError("Please fill all required profile fields.");
        return;
      }
      if (!/^[0-9]{10}$/.test(payload.phone)) {
        setEditError("Phone must be exactly 10 digits.");
        return;
      }
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(payload.panNumber)) {
        setEditError("PAN must be valid (e.g., ABCDE1234F).");
        return;
      }
      if (!Number.isFinite(payload.monthlyIncome) || payload.monthlyIncome <= 0) {
        setEditError("Monthly income must be greater than 0.");
        return;
      }

      const res = await customerApi.updateMyProfile(payload);
      const updated = res?.data?.data || res?.data;
      setProfile(updated);
      setEditing(false);
    } catch (e) {
      const data = e?.response?.data;
      if (data && typeof data === "object" && !Array.isArray(data) && !data.message) {
        const firstError = Object.values(data)[0];
        setEditError(String(firstError || "Update failed"));
      } else {
        setEditError(data?.message || e?.message || "Update failed");
      }
    } 
    finally { setSaving(false); }
  };

  const submitKyc = async () => {
    setKycError("");  //pdf validation -----
    const validatePdf = (file, label) => {
      if (!file) return `${label} PDF is required`;
      if (file.type !== "application/pdf") return `${label} must be a PDF`;
      if (file.size > MAX_KYC_DOC_SIZE_BYTES) return `${label} exceeds 500KB`;
      return "";
    };

    const err = validatePdf(panFile, "PAN") || validatePdf(aadhaarFile, "Aadhaar");
    if (err) return setKycError(err);

    try {
      setKycSubmitting(true);
      await kycApi.submit({ ...kycForm, panNumber: kycForm.panNumber?.toUpperCase() }, panFile, aadhaarFile);
      setKycEditing(false);
      setPanFile(null);
      setAadhaarFile(null);
      await loadBase();
    } catch (e) { setKycError(e?.response?.data?.message || "KYC failed"); } 
    finally { setKycSubmitting(false); }
  };

  const handleFileDownload = async (fileId, name) => {
    try { await fileApi.download(fileId, name); } 
    catch { setKycError("Download failed"); }
  };

  const handlePayInstallment = async (installment) => {
    const ok = await payInstallment(installment);
    if (ok) await loadBase();
  };

  const handleMissInstallment = async () => {
    const ok = await missInstallment();
    if (ok) await loadBase();
  };

  if (loading) return <PortalShell title="Loading...">...</PortalShell>;

  const TabButton = ({ id, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
        activeTab === id ? "bg-slate-900 text-white shadow-md" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );

  return (
    <PortalShell title="Customer Portal" subtitle="Unified workspace for your finances.">
      
      {/* --- TAB NAVIGATION --- */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-200 pb-4">
        <TabButton id="profile" label="Details" />
        <TabButton id="kyc" label="KYC Verification" />
        <TabButton id="loans" label="My Loans" />
        <TabButton id="repayments" label="Repayments & Docs" />
      </div>

      {error && <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {/* --- SECTION 1: PROFILE --- */}
      {activeTab === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900">Personal Information</h2>
              <button onClick={() => (editing ? setEditing(false) : setEditing(true))} className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-lg border border-slate-300">
                {editing ? "Cancel" : "Edit"}
              </button>
            </div>

            {!editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Info label="Full Name" value={profile?.fullName} />
                <Info label="Phone" value={profile?.phone} />
                <Info label="PAN" value={profile?.panNumber} />
                <Info label="Income" value={money(profile?.monthlyIncome)} />
                <Info label="Employment" value={profile?.employmentType} />
                <Info label="Credit Score" value={profile?.creditScore} />
                <Info label="Wallet Balance" value={money(resolvedWallet)} />
                <Info label="Address" value={profile?.address} wide />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Full Name"><input value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" /></Field>
                <Field label="Phone"><input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" /></Field>
                <Field label="PAN"><input value={editForm.panNumber} onChange={(e) => setEditForm({ ...editForm, panNumber: e.target.value.toUpperCase() })} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" /></Field>
                <Field label="Employment Type">
                  <select
                    value={editForm.employmentType}
                    onChange={(e) => setEditForm({ ...editForm, employmentType: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Select type</option>
                    <option value="SALARIED">SALARIED</option>
                    <option value="SELF_EMPLOYED">SELF_EMPLOYED</option>
                    <option value="BUSINESS">BUSINESS</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </Field>
                <Field label="Monthly Income">
                  <input
                    type="number"
                    min="1"
                    value={editForm.monthlyIncome}
                    onChange={(e) => setEditForm({ ...editForm, monthlyIncome: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  />
                </Field>
                <Field label="Address" wide><input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" /></Field>
                <div className="md:col-span-2"><button onClick={saveProfile} className="bg-slate-900 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase">{saving ? "Saving..." : "Save Profile"}</button></div>
              </div>
            )}
          </div>
          <div className="space-y-4">
             <StatCard label="Monthly EMI" value={money(stats.pendingEmiAmount)} />
             
             <StatCard label="Wallet" value={money(resolvedWallet)} />
          </div>
        </div>
      )}

      {/* --- SECTION 2: KYC --- */}
      {activeTab === "kyc" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 animate-in fade-in duration-500">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-900">Verification Status</h2>
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${kycStatusMeta.cls}`}>{kycStatusMeta.label}</span>
          </div>
          {kycError && <div className="mb-4 text-sm text-rose-600">{kycError}</div>}

          {myKyc && !kycEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Info label="KYC Holder" value={myKyc.fullName} />
              <Info label="PAN" value={myKyc.panNumber} />
              <Info label="Submission Attempts" value={`${kycSubmissionCount}/2`} />
              <div className="md:col-span-2 p-4 bg-slate-50 rounded-xl flex gap-4">
                {myKyc.panDocumentFileId && <button onClick={() => handleFileDownload(myKyc.panDocumentFileId, "PAN.pdf")} className="text-xs font-bold text-emerald-700 underline">View PAN PDF</button>}
                {myKyc.aadhaarDocumentFileId && <button onClick={() => handleFileDownload(myKyc.aadhaarDocumentFileId, "Aadhar.pdf")} className="text-xs font-bold text-emerald-700 underline">View Aadhaar PDF</button>}
              </div>
              <div className="md:col-span-2">
                {canResubmitKyc ? (
                  <button
                    onClick={() => setKycEditing(true)}
                    className="bg-slate-900 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase"
                  >
                    Edit and Resubmit KYC
                  </button>
                ) : (
                  <p className="text-xs text-slate-500">KYC submission limit reached (2/2).</p>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Full Name"><input value={kycForm.fullName} onChange={(e) => setKycForm({...kycForm, fullName: e.target.value})} className="w-full border rounded-xl p-2" /></Field>
              <Field label="Date of Birth"><input type="date" value={kycForm.dob} onChange={(e) => setKycForm({...kycForm, dob: e.target.value})} className="w-full border rounded-xl p-2" /></Field>
              <Field label="PAN Number"><input value={kycForm.panNumber} onChange={(e) => setKycForm({...kycForm, panNumber: e.target.value.toUpperCase()})} className="w-full border rounded-xl p-2" /></Field>
              <Field label="Aadhaar"><input value={kycForm.aadhaarNumber} onChange={(e) => setKycForm({...kycForm, aadhaarNumber: e.target.value})} className="w-full border rounded-xl p-2" /></Field>
              <Field label="PAN Card (PDF)"><input type="file" accept="application/pdf" onChange={(e) => setPanFile(e.target.files[0])} className="w-full text-xs" /></Field> //pdf onlyyy
              <Field label="Aadhaar (PDF)"><input type="file" accept="application/pdf" onChange={(e) => setAadhaarFile(e.target.files[0])} className="w-full text-xs" /></Field>
              <div className="md:col-span-2 flex gap-2">
                <button onClick={submitKyc} className="bg-slate-900 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase">{kycSubmitting ? "Uploading..." : myKyc ? "Resubmit Verification" : "Submit Verification"}</button>
                {myKyc ? (
                  <button onClick={() => setKycEditing(false)} className="px-6 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-300">Cancel</button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- SECTION 3: LOANS --- */}
      {activeTab === "loans" && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="In Review" value={stats.submitted} />
            <StatCard label="Active" value={stats.active} />
            <StatCard label="Drafts" value={stats.draft} />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500">
                <tr><th className="p-4">Loan ID</th><th className="p-4">Amount</th><th className="p-4">Status</th><th className="p-4">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {myLoans.map(loan => (
                  <tr key={loan.id}>
                    <td className="p-4 font-mono">{loan.id.slice(-8)}</td>
                    <td className="p-4">{money(loan.requestedAmount)}</td>
                    <td className="p-4"><span className="px-2 py-1 rounded-md bg-slate-100 text-[10px] font-bold">{loan.status}</span></td>
                    <td className="p-4"><button onClick={() => { setActiveLoanId(loan.id); setActiveTab("repayments"); }} className="text-emerald-700 font-bold hover:underline">View Details</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- SECTION 4: REPAYMENTS & DOCS --- */}
      {activeTab === "repayments" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
          <div className="xl:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200">
                <h3 className="text-xs font-black uppercase mb-4">Select Loan</h3>
                <select value={activeLoanId} onChange={(e) => setActiveLoanId(e.target.value)} className="w-full rounded-xl border-slate-300 text-sm">
                  <option value="">Choose a loan...</option>
                  {myLoans.map(l => <option key={l.id} value={l.id}>{l.id.slice(-8)} ({l.status})</option>)}
                </select>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200">
                <h3 className="text-xs font-black uppercase mb-4">Documents</h3>
                {docs.length === 0 ? <p className="text-xs text-slate-400">No documents found.</p> : docs.map(d => (
                  <div key={d.id} className="flex justify-between items-center text-xs py-2 border-b last:border-0">
                    <span className="truncate mr-2">{d.fileName}</span>
                    <button onClick={() => handleFileDownload(d.id, d.fileName)} className="text-emerald-700 font-bold">Get</button>
                  </div>
                ))}
            </div>
          </div>

          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <h3 className="text-xs font-black uppercase mb-4">EMI Schedule</h3>
              {actionError && <div className="mb-4 text-sm text-rose-600">{actionError}</div>}
              {!schedule ? <p className="text-sm text-slate-400">Select an active loan to see the schedule.</p> : (
                <div className="space-y-3">
                  {schedule.installments?.map((ins, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-sm">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold">EMI #{ins.installmentNumber ?? ins.emiNumber ?? idx + 1}</span>
                          <span className="text-slate-500 text-xs">Due: {formatDate(ins.dueDate)}</span>
                          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full border ${
                            ins.status === "PAID"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : ins.status === "PARTIAL"
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : ins.status === "OVERDUE"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                          }`}>
                            {ins.status || "PENDING"}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Paid: {money(ins.paidAmount)}{ins.paidDate ? ` on ${formatDate(ins.paidDate)}` : ""}
                        </div>
                      </div>
                        <div className="flex items-center gap-3">
                          <div className="font-bold text-slate-900">{money(ins.totalAmount)}</div>
                          <button
                          onClick={() => handlePayInstallment(ins)}
                          disabled={actionBusy || ins.status === "PAID"}
                          className={`px-3 py-1 text-xs rounded ${
                            ins.status === "PAID" ? "bg-slate-200 text-slate-500" : "bg-emerald-600 text-white"
                          }`}
                        >
                          Pay
                        </button>
                        <button
                          onClick={handleMissInstallment}
                          disabled={actionBusy || ins.status === "PAID"}
                          className="px-3 py-1 text-xs rounded border border-rose-300 text-rose-700"
                        >
                          Miss
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}

// --- Internal UI Components ---
function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</div>
      <div className="text-2xl font-bold text-slate-900 mt-1">{value}</div>
    </div>
  );
}

function Info({ label, value, wide }) {
  return (
    <div className={`${wide ? "md:col-span-2" : ""} rounded-xl border border-slate-100 bg-slate-50/50 p-4`}>
      <div className="text-[9px] uppercase tracking-widest font-black text-slate-400">{label}</div>
      <div className="text-sm font-semibold text-slate-800 mt-1">{value || "-"}</div>
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
