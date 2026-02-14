import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PortalShell from "../../components/layout/PortalShell.jsx";
import { customerApi, fileApi, kycApi, loanApi, repaymentApi } from "../../api/domainApi.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useEmiSchedule } from "../../hooks/useEmiSchedule.jsx";
import { maskAadhaarNumber, maskPanNumber } from "../../utils/masking.js";
import { 
  User, ShieldCheck, Landmark, ReceiptIndianRupee, ChevronRight, 
  ArrowRight, FileText, Wallet, Calendar, CheckCircle2, 
  AlertCircle, ChevronLeft, UploadCloud
} from "lucide-react";

// --- UTILITIES ---
const money = (n) => {
  const value = Number(n);
  return Number.isFinite(value)
    ? value.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
    : "-";
};

const KYC_META = {
  PENDING: { label: "PENDING", cls: "bg-amber-50 text-amber-800 border-amber-200", icon: <AlertCircle size={14}/> },
  APPROVED: { label: "VERIFIED", cls: "bg-emerald-50 text-emerald-800 border-emerald-200", icon: <CheckCircle2 size={14}/> },
  VERIFIED: { label: "VERIFIED", cls: "bg-emerald-50 text-emerald-800 border-emerald-200", icon: <CheckCircle2 size={14}/> },
  REJECTED: { label: "REJECTED", cls: "bg-rose-50 text-rose-800 border-rose-200", icon: <AlertCircle size={14}/> },
};

const loanStatusClass = (status) => {
  const s = String(status || "").toUpperCase();
  if (["CLOSED", "APPROVED", "ACTIVE", "DISBURSED"].includes(s)) return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (["UNDER_REVIEW", "SUBMITTED"].includes(s)) return "bg-amber-50 text-amber-800 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};

export default function UserDashboard() {
  const { user } = useAuth();
  
  // --- UI & DATA STATE ---
  const [activeTab, setActiveTab] = useState("profile"); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [myLoans, setMyLoans] = useState([]);
  const [activeLoanId, setActiveLoanId] = useState("");
  const { schedule, docs, actionBusy, payInstallment } = useEmiSchedule(activeLoanId);
  const [myKyc, setMyKyc] = useState(null);

  // --- PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // --- FORM STATES ---
  const [editing, setEditing] = useState(false);
  const [kycEditing, setKycEditing] = useState(false);
  const [panFile, setPanFile] = useState(null);
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [kycForm, setKycForm] = useState({ fullName: "", dob: "", panNumber: "", aadhaarNumber: "" });

  const formatDate = (val) => val ? new Date(val).toLocaleDateString("en-IN") : "-";

  const loadBase = async () => {
    setLoading(true);
    try {
      const [pRes, lRes] = await Promise.all([customerApi.getMyProfile(), loanApi.getMyLoans()]);
      setProfile(pRes.data);
      const loans = lRes.data || [];
      setMyLoans(loans);
      const kRes = await kycApi.getMyKyc().catch(() => null);
      if (kRes?.data) setMyKyc(kRes.data);
    } catch (e) { setError("Failed to synchronize workspace."); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadBase(); }, []);
  useEffect(() => { setCurrentPage(1); }, [activeLoanId]);

  const paginatedEMI = useMemo(() => {
    const installments = schedule?.installments || [];
    const start = (currentPage - 1) * pageSize;
    return installments.slice(start, start + pageSize);
  }, [schedule, currentPage]);

  const totalPages = Math.ceil((schedule?.installments?.length || 0) / pageSize);

  const handleFileDownload = (id, name) => fileApi.download(id, name).catch(() => alert("Download failed"));

  // --- UI ATOMS ---
  const SidebarButton = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`group flex items-center justify-between w-full px-5 py-4 rounded-2xl transition-all duration-500 border ${
        activeTab === id 
          ? "bg-slate-900 text-white shadow-xl translate-x-2 border-slate-800" 
          : "text-slate-500 hover:bg-emerald-50 border-transparent hover:border-emerald-100"
      }`}
    >
      <div className="flex items-center gap-4">
        <Icon size={18} className={activeTab === id ? "text-emerald-400" : "text-slate-400 group-hover:text-emerald-600"} />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
      </div>
      <ChevronRight size={14} className={activeTab === id ? "opacity-100" : "opacity-0"} />
    </button>
  );

  if (loading) return <PortalShell title="Loading...">Synchronizing Workspace...</PortalShell>;

  return (
    <PortalShell title="Customer Portal" subtitle="Unified financial management hub.">
      
      {/* SNAPSHOT HEADER */}
      <section className="mb-10 rounded-[2.5rem] border border-emerald-100 bg-white p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700 mb-2">Institutional Workspace</p>
            <h2 className="text-3xl font-serif text-slate-900">Welcome, {user?.username || profile?.fullName}</h2>
          </div>
          <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-200">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg border border-emerald-500">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Total Balance</p>
              <p className="text-2xl font-black text-slate-900 leading-none">{money(profile?.bankBalance)}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* SIDEBAR NAVIGATION */}
        <aside className="lg:col-span-3 space-y-3 sticky top-28 h-fit">
          <SidebarButton id="profile" label="Profile" icon={User} />
          <SidebarButton id="kyc" label="KYC Hub" icon={ShieldCheck} />
          <SidebarButton id="loans" label="My Loans" icon={Landmark} />
          <SidebarButton id="repayments" label="Payments" icon={ReceiptIndianRupee} />
        </aside>

        {/* CONTENT AREA */}
        <main className="lg:col-span-9">
          <AnimatePresence mode="wait">
            
            {/* 1. PROFILE */}
            {activeTab === "profile" && (
              <motion.div key="profile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="rounded-[2.5rem] bg-white border border-slate-200 p-8 shadow-xl shadow-slate-200/40">
                  <div className="flex justify-between items-center mb-10">
                    <h3 className="text-xl font-bold text-slate-900 tracking-tight">Identity Information</h3>
                    <button onClick={() => setEditing(!editing)} className="text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-900 hover:text-white transition-all shadow-sm">
                      {editing ? "Discard" : "Modify Details"}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InfoBox label="Legal Name" value={profile?.fullName} />
                    <InfoBox label="Contact" value={profile?.phone} />
                    <InfoBox label="Tax ID (PAN)" value={maskPanNumber(profile?.panNumber)} />
                    <InfoBox label="Employment" value={profile?.employmentType} />
                    <InfoBox label="Income" value={money(profile?.monthlyIncome)} />
                    <InfoBox label="CIBIL Score" value={profile?.creditScore} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. KYC HUB */}
            {activeTab === "kyc" && (
              <motion.div key="kyc" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="rounded-[2.5rem] bg-white border border-slate-200 p-8 shadow-xl shadow-slate-200/40">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold text-slate-900">Verification Hub</h3>
                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${KYC_META[myKyc?.status || 'PENDING'].cls}`}>
                       {KYC_META[myKyc?.status || 'PENDING'].icon} {KYC_META[myKyc?.status || 'PENDING'].label}
                    </div>
                  </div>

                  {myKyc && !kycEditing ? (
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InfoBox label="Holder" value={myKyc.fullName} />
                        <InfoBox label="PAN" value={maskPanNumber(myKyc.panNumber)} />
                        <InfoBox label="Aadhaar" value={maskAadhaarNumber(myKyc.aadhaarNumber)} />
                        <InfoBox label="DOB" value={formatDate(myKyc.dob)} />
                      </div>
                      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 flex flex-wrap gap-4">
                        <button onClick={() => handleFileDownload(myKyc.panDocumentFileId, "PAN.pdf")} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 hover:text-emerald-900 transition-colors"><FileText size={16}/> View PAN</button>
                        <button onClick={() => handleFileDownload(myKyc.aadhaarDocumentFileId, "Aadhar.pdf")} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 hover:text-emerald-900 transition-colors"><FileText size={16}/> View Aadhaar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Field label="Full Name"><input className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm focus:border-emerald-500 outline-none transition-colors" placeholder="As per PAN" /></Field>
                        <Field label="DOB"><input type="date" className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm focus:border-emerald-500 outline-none transition-colors" /></Field>
                        <Field label="PAN Card (PDF)"><div className="relative border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center hover:border-emerald-400 transition-colors"><UploadCloud className="text-slate-400 mb-2"/><span className="text-[10px] text-slate-500 font-bold uppercase">Upload PDF</span><input type="file" className="absolute inset-0 opacity-0 cursor-pointer" /></div></Field>
                        <Field label="Aadhaar Card (PDF)"><div className="relative border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center hover:border-emerald-400 transition-colors"><UploadCloud className="text-slate-400 mb-2"/><span className="text-[10px] text-slate-500 font-bold uppercase">Upload PDF</span><input type="file" className="absolute inset-0 opacity-0 cursor-pointer" /></div></Field>
                      </div>
                      <button className="bg-slate-900 text-white px-10 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl border border-slate-800 hover:bg-emerald-700 hover:border-emerald-600 transition-all">Submit Verification</button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 3. LOANS */}
            {activeTab === "loans" && (
              <motion.div key="loans" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="rounded-[2rem] bg-white border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/40">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <th className="p-6">Loan Facility</th>
                        <th className="p-6">Principal</th>
                        <th className="p-6">Status</th>
                        <th className="p-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {myLoans.map(l => (
                        <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-6 font-bold text-slate-900">{l.loanProductName}</td>
                          <td className="p-6 text-sm">{money(l.requestedAmount)}</td>
                          <td className="p-6"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${loanStatusClass(l.status)}`}>{l.status}</span></td>
                          <td className="p-6 text-right"><button onClick={() => { setActiveLoanId(l.id); setActiveTab("repayments"); }} className="text-emerald-700 font-black text-[10px] uppercase tracking-widest hover:text-emerald-900 transition-colors border border-transparent hover:border-emerald-100 px-3 py-1 rounded-lg">Details</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* 4. REPAYMENTS */}
            {activeTab === "repayments" && (
              <motion.div key="repayments" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="rounded-[2.5rem] bg-white border border-slate-200 p-8 shadow-xl shadow-slate-200/40">
                  <h3 className="text-xl font-bold text-slate-900 mb-6">Payment Schedule</h3>
                  <select value={activeLoanId} onChange={(e) => setActiveLoanId(e.target.value)} className="w-full mb-8 rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:border-emerald-500 outline-none transition-colors">
                    <option value="">Select an active facility...</option>
                    {myLoans.map(l => <option key={l.id} value={l.id}>{l.loanProductName} ({money(l.requestedAmount)})</option>)}
                  </select>

                  {schedule?.installments ? (
                    <div className="space-y-4">
                      {paginatedEMI.map((ins, i) => (
                        <div key={i} className="flex flex-col md:flex-row items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-200 gap-4 shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center border border-slate-200 font-bold text-slate-400">{(currentPage - 1) * pageSize + i + 1}</div>
                            <div>
                              <p className="text-sm font-bold text-slate-900">{money(ins.totalAmount)}</p>
                              <p className="text-[10px] text-slate-500 flex items-center gap-1 font-bold uppercase"><Calendar size={12}/> {formatDate(ins.dueDate)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${ins.status === 'PAID' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-200 text-slate-600 border-slate-300'}`}>{ins.status}</span>
                            {ins.status !== 'PAID' && (
                              <button onClick={() => payInstallment(ins)} className="bg-slate-900 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg border border-slate-800 hover:bg-emerald-700 hover:border-emerald-600 transition-all">Pay EMI</button>
                            )}
                          </div>
                        </div>
                      ))}

                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-6 pt-6 border-t border-slate-200">
                          <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-900 hover:text-white transition-all disabled:opacity-30 shadow-sm"
                          >
                            <ChevronLeft size={18} />
                          </button>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Page {currentPage} of {totalPages}</span>
                          <button 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-900 hover:text-white transition-all disabled:opacity-30 shadow-sm"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-300">
                      <ReceiptIndianRupee size={48} className="mx-auto text-slate-300 mb-4"/>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Awaiting selection</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>
    </PortalShell>
  );
}

// --- SHARED ATOMS ---
function InfoBox({ label, value, wide }) {
  return (
    <div className={`${wide ? "md:col-span-2" : ""} p-5 rounded-3xl bg-slate-50 border border-slate-200 shadow-sm`}>
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-slate-900">{value || "Not Set"}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">{label}</label>
      {children}
    </div>
  );
}