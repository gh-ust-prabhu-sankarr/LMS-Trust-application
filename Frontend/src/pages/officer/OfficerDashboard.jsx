import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import PortalShell from "../../components/layout/PortalShell.jsx";
import { customerApi, kycApi, loanApi, unwrap, userApi, fileApi } from "../../api/domainApi.js";
import { 
  ChevronRight, ChevronLeft,
  ClipboardCheck, UserCheck, AlertCircle, 
  FileText, X, ExternalLink, Eye, CheckCircle2
} from "lucide-react";

// --- CONSTANTS ---
const STATUS_TONE = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",
  UNDER_REVIEW: "bg-indigo-50 text-indigo-700 border-indigo-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

const money = (n) => {
  const value = Number(n);
  return Number.isFinite(value)
    ? value.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
    : "INR 0";
};

const toArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const ITEMS_PER_PAGE = 3;
const KYC_STATUSES = ["PENDING", "APPROVED", "REJECTED"];
const LOAN_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "APPROVED"];

const getEntryTime = (item) => {
  const keys = ["submittedAt", "createdAt", "appliedAt", "updatedAt", "createdDate", "createdOn"];
  for (const key of keys) {
    const value = item?.[key];
    if (!value) continue;
    const ts = new Date(value).getTime();
    if (Number.isFinite(ts) && ts > 0) return ts;
  }
  return 0;
};

const sortByNewest = (a, b) => {
  const timeDiff = getEntryTime(b) - getEntryTime(a);
  if (timeDiff !== 0) return timeDiff;
  const aIdNum = Number(a?.id);
  const bIdNum = Number(b?.id);
  if (Number.isFinite(aIdNum) && Number.isFinite(bIdNum)) return bIdNum - aIdNum;
  return String(b?.id || "").localeCompare(String(a?.id || ""));
};

export default function OfficerDashboard() {
  const [activeTab, setActiveTab] = useState("kyc"); 
  const [kycStatusFilter, setKycStatusFilter] = useState("PENDING");
  const [kycByStatus, setKycByStatus] = useState({ PENDING: [], APPROVED: [], REJECTED: [] });
  const [loanByStatus, setLoanByStatus] = useState({ SUBMITTED: [], UNDER_REVIEW: [], APPROVED: [] });
  const [customerById, setCustomerById] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  
  // Modal States
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [selectedKyc, setSelectedKyc] = useState(null);
  const [kycPage, setKycPage] = useState(1);
  const [loanPage, setLoanPage] = useState(1);
  const [actionBusy, setActionBusy] = useState(false);
  const [loanActionError, setLoanActionError] = useState("");
  const [loanActionSuccess, setLoanActionSuccess] = useState("");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [approvalComments, setApprovalComments] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const [kycResRaw, loanResRaw, userRes] = await Promise.all([
        Promise.allSettled(KYC_STATUSES.map((s) => kycApi.getByStatus(s))),
        Promise.allSettled(LOAN_STATUSES.map((s) => loanApi.getByStatus(s))),
        userApi.getMe(),
      ]);

      const kycData = {};
      KYC_STATUSES.forEach((status, idx) => {
        const result = kycResRaw[idx];
        kycData[status] = result?.status === "fulfilled" ? toArray(unwrap(result.value)) : [];
      });

      const loanData = {};
      LOAN_STATUSES.forEach((status, idx) => {
        const result = loanResRaw[idx];
        loanData[status] = result?.status === "fulfilled" ? toArray(unwrap(result.value)) : [];
      });

      setKycByStatus(kycData);
      setLoanByStatus(loanData);
      unwrap(userRes);

      const allEntries = [...Object.values(kycData).flat(), ...Object.values(loanData).flat()];
      const uIds = [
        ...new Set(
          allEntries
            .map((item) => item?.customerId || item?.customer?.id)
            .filter(Boolean)
        ),
      ];

      if (uIds.length > 0) {
        const custResults = await Promise.allSettled(uIds.map((id) => customerApi.getById(id)));
        const custMap = {};
        custResults.forEach((res, idx) => {
          if (res.status === "fulfilled") custMap[uIds[idx]] = unwrap(res.value);
        });
        setCustomerById(custMap);
      } else {
        setCustomerById({});
      }
    } catch (err) {
      setLoadError(err?.response?.data?.message || err?.message || "Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);
  useEffect(() => { setKycPage(1); }, [kycStatusFilter]);

  const kycRows = useMemo(
    () => [...(kycByStatus[kycStatusFilter] || [])].sort(sortByNewest),
    [kycByStatus, kycStatusFilter]
  );
  const loanRows = useMemo(
    () => LOAN_STATUSES.flatMap((s) => loanByStatus[s] || []).sort(sortByNewest),
    [loanByStatus]
  );

  const totalKycPages = Math.max(1, Math.ceil(kycRows.length / ITEMS_PER_PAGE));
  const totalLoanPages = Math.max(1, Math.ceil(loanRows.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (kycPage > totalKycPages) setKycPage(totalKycPages);
  }, [kycPage, totalKycPages]);
  useEffect(() => {
    if (loanPage > totalLoanPages) setLoanPage(totalLoanPages);
  }, [loanPage, totalLoanPages]);

  const pagedKycRows = useMemo(
    () => kycRows.slice((kycPage - 1) * ITEMS_PER_PAGE, kycPage * ITEMS_PER_PAGE),
    [kycRows, kycPage]
  );
  const pagedLoanRows = useMemo(
    () => loanRows.slice((loanPage - 1) * ITEMS_PER_PAGE, loanPage * ITEMS_PER_PAGE),
    [loanRows, loanPage]
  );

  const handleKycAction = async (id, action) => {
    try {
      const remarks = `${action.toUpperCase()} processed by Loan Officer Console.`;
      action === "approve" ? await kycApi.approve(id, remarks) : await kycApi.reject(id, remarks);
      setSelectedKyc(null);
      await loadInitialData(); // Refresh lists
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || "Authorization failed");
    }
  };

  const handleOpenLoan = (loan) => {
    setSelectedLoan(loan);
    setLoanActionError("");
    setLoanActionSuccess("");
    setApprovedAmount(String(loan?.requestedAmount || ""));
    setApprovalComments("");
    setRejectionReason("");
  };

  const withLoanAction = async (runner) => {
    if (!selectedLoan?.id) return;
    setActionBusy(true);
    setLoanActionError("");
    setLoanActionSuccess("");
    try {
      await runner();
      setLoanActionSuccess("Action completed successfully.");
      await loadInitialData();
      setSelectedLoan(null);
    } catch (err) {
      setLoanActionError(err?.response?.data?.message || err?.message || "Action failed");
    } finally {
      setActionBusy(false);
    }
  };

  const moveLoanToReview = () => withLoanAction(async () => {
    await loanApi.moveToReview(selectedLoan.id);
  });

  const approveLoan = () => withLoanAction(async () => {
    const amount = Number(approvedAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Enter a valid approved amount");
    }
    // Backend allows approval only from UNDER_REVIEW; auto-transition when current state is SUBMITTED.
    if (selectedLoan.status === "SUBMITTED") {
      await loanApi.moveToReview(selectedLoan.id);
    }
    await loanApi.approve(selectedLoan.id, {
      approvedAmount: amount,
      comments: approvalComments || "Approved by loan officer",
    });
  });

  const rejectLoan = () => withLoanAction(async () => {
    const reason = rejectionReason.trim();
    if (!reason) throw new Error("Enter rejection reason");
    await loanApi.reject(selectedLoan.id, reason);
  });

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
        {Icon ? React.createElement(Icon, { size: 18, className: activeTab === id ? "text-emerald-400" : "text-slate-400 group-hover:text-emerald-600" }) : null}
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
      </div>
      <ChevronRight size={14} className={activeTab === id ? "opacity-100" : "opacity-0"} />
    </button>
  );

  if (isLoading) return <PortalShell title="Loading...">Syncing Ledger...</PortalShell>;

  return (
    <PortalShell>
      
      {/* HEADER SECTION */}
     

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <aside className="lg:col-span-3 space-y-3 sticky top-28 h-fit">
          <SidebarButton id="kyc" label="KYC Approval" icon={UserCheck} />
          <SidebarButton id="loans" label="Loan Approval" icon={ClipboardCheck} />
        </aside>

        <main className="lg:col-span-9">
          {loadError && (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {loadError}
            </div>
          )}
          <AnimatePresence mode="wait">
            
            {/* KYC TAB */}
            {activeTab === "kyc" && (
              <div className="space-y-8">
                <div className="flex gap-2 p-1.5 bg-white border border-slate-200 rounded-2xl w-fit shadow-sm">
                    {KYC_STATUSES.map(s => (
                        <button 
                          key={s} 
                          onClick={() => setKycStatusFilter(s)} 
                          className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${kycStatusFilter === s ? 'bg-slate-900 text-white shadow-md border-slate-800' : 'bg-transparent border-transparent text-slate-400 hover:text-slate-900'}`}
                        >
                            {s} ({kycByStatus[s]?.length || 0})
                        </button>
                    ))}
                </div>

                <div className="rounded-[2.5rem] bg-white border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/40">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <th className="p-6">Applicant</th>
                        <th className="p-6">Date of Birth</th>
                        <th className="p-6">Status</th>
                        <th className="p-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {kycRows.length > 0 ? (
                        pagedKycRows.map((kyc) => (
                          <tr
                            key={kyc.id}
                            className="hover:bg-emerald-50/30 transition-colors group cursor-pointer"
                            onClick={() => setSelectedKyc(kyc)}
                          >
                            <td className="p-6">
                              <p className="font-bold text-slate-900">{kyc.fullName || "Unknown"}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {kyc.id}</p>
                            </td>
                            <td className="p-6 text-sm font-bold text-slate-900">{kyc.dob || "N/A"}</td>
                            <td className="p-6">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${STATUS_TONE[kyc.status]}`}>
                                {kyc.status}
                              </span>
                            </td>
                            <td className="p-6 text-right">
                              <button className="p-3 bg-white border border-slate-200 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-all">
                                <Eye size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="p-20 text-center">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">
                              No {kycStatusFilter} records found
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {kycRows.length > 0 ? (
                    <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Page {kycPage} of {totalKycPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={kycPage === 1}
                          onClick={() => setKycPage((p) => p - 1)}
                          className="p-2 rounded-lg border bg-white disabled:opacity-30 hover:bg-slate-50 transition-all"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        {Array.from({ length: totalKycPages }, (_, idx) => idx + 1).map((p) => (
                          <button
                            key={p}
                            onClick={() => setKycPage(p)}
                            className={`min-w-8 h-8 px-2 rounded-lg border text-xs font-black transition-all ${
                              kycPage === p
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                        <button
                          disabled={kycPage >= totalKycPages}
                          onClick={() => setKycPage((p) => p + 1)}
                          className="p-2 rounded-lg border bg-white disabled:opacity-30 hover:bg-slate-50 transition-all"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* LOANS TAB */}
            {activeTab === "loans" && (
              <div>
                <div className="rounded-[2.5rem] bg-white border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/40">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <th className="p-6">Applicant</th>
                        <th className="p-6">Capital Requested</th>
                        <th className="p-6">Status</th>
                        <th className="p-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loanRows.length > 0 ? (
                        pagedLoanRows.map(loan => (
                          <tr key={loan.id} className="hover:bg-emerald-50/30 transition-colors group cursor-pointer" onClick={() => handleOpenLoan(loan)}>
                            <td className="p-6">
                              <p className="font-bold text-slate-900">{customerById[loan.customerId]?.fullName || "Retrieving Profile..."}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{loan.loanProductName}</p>
                            </td>
                            <td className="p-6 text-sm font-bold text-slate-900">{money(loan.requestedAmount)}</td>
                            <td className="p-6">
                              <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${STATUS_TONE[loan.status]}`}>
                                {loan.status}
                              </span>
                            </td>
                            <td className="p-6 text-right">
                              <button className="p-3 bg-white border border-slate-200 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-all">
                                <Eye size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="p-20 text-center">
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">Pipeline is empty</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  {loanRows.length > 0 ? (
                    <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Page {loanPage} of {totalLoanPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={loanPage === 1}
                          onClick={() => setLoanPage((p) => p - 1)}
                          className="p-2 rounded-lg border bg-white disabled:opacity-30 hover:bg-slate-50 transition-all"
                        >
                          <ChevronLeft size={16} />
                        </button>
                        {Array.from({ length: totalLoanPages }, (_, idx) => idx + 1).map((p) => (
                          <button
                            key={p}
                            onClick={() => setLoanPage(p)}
                            className={`min-w-8 h-8 px-2 rounded-lg border text-xs font-black transition-all ${
                              loanPage === p
                                ? "bg-slate-900 text-white border-slate-900"
                                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                        <button
                          disabled={loanPage >= totalLoanPages}
                          onClick={() => setLoanPage((p) => p + 1)}
                          className="p-2 rounded-lg border bg-white disabled:opacity-30 hover:bg-slate-50 transition-all"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* KYC DETAIL MODAL */}
      <AnimatePresence>
        {selectedKyc && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-[3rem] shadow-2xl max-w-5xl w-full h-[85vh] border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-2xl font-serif text-slate-900">KYC Details</h3>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Application ID: {selectedKyc.id}</p>
                    </div>
                    <button onClick={() => setSelectedKyc(null)} className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-rose-50 shadow-sm transition-all"><X size={20}/></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-4">
                            <ModalInfo label="Full Name" value={selectedKyc.fullName} />
                            <ModalInfo label="Date of Birth" value={selectedKyc.dob} />
                            <ModalInfo label="PAN Number" value={selectedKyc.panNumber} />
                            <ModalInfo label="Aadhaar" value={selectedKyc.aadhaarNumber} />
                        </div>
                        
                        <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 flex items-start gap-4">
                            <AlertCircle className="text-emerald-600 mt-1 shrink-0" size={18}/>
                            <p className="text-xs text-emerald-800 leading-relaxed font-medium">Verify that the documents match the encrypted text data. Cross-reference Tax IDs before authorization.</p>
                        </div>

                        {selectedKyc.status === "PENDING" && (
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => handleKycAction(selectedKyc.id, "approve")} className="py-5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl border border-emerald-500 hover:bg-emerald-700 transition-all">Approve</button>
                                <button onClick={() => handleKycAction(selectedKyc.id, "reject")} className="py-5 bg-white text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-rose-200 hover:bg-rose-50 transition-all">Reject</button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <DocumentAction label="PAN Card Document" fileId={selectedKyc.panDocumentFileId} fileName="PAN_DOC.pdf" />
                        <DocumentAction label="Aadhaar Card Document" fileId={selectedKyc.aadhaarDocumentFileId} fileName="AADHAAR_DOC.pdf" />
                    </div>
                </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* LOAN DETAIL MODAL */}
      <AnimatePresence>
        {selectedLoan && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-[3rem] shadow-2xl max-w-5xl w-full h-[85vh] border border-slate-200 flex flex-col overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-2xl font-serif text-slate-900">Loan Details: {selectedLoan.loanProductName}</h3>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Reference ID: {selectedLoan.id}</p>
                    </div>
                    <button onClick={() => setSelectedLoan(null)} className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-rose-50 shadow-sm transition-all"><X size={20}/></button>
                </div>

                <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 gap-4">
                            <ModalInfo label="Applicant" value={customerById[selectedLoan.customerId]?.fullName || "Unknown"} />
                            <ModalInfo label="Requested Capital" value={money(selectedLoan.requestedAmount)} />
                            <ModalInfo label="Monthly Yield" value={money(customerById[selectedLoan.customerId]?.monthlyIncome)} />
                            <ModalInfo label="CIBIL Index" value={customerById[selectedLoan.customerId]?.creditScore || "N/A"} />
                        </div>

                        <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200">
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Audit Memo</p>
                             <p className="text-sm text-slate-700 leading-relaxed font-medium italic">"System-generated risk assessment: Based on credit index and income statements, applicant shows stable repayment capacity."</p>
                        </div>
                        
                        {loanActionError && (
                          <p className="text-sm font-semibold text-rose-600">{loanActionError}</p>
                        )}
                        {loanActionSuccess && (
                          <p className="text-sm font-semibold text-emerald-700">{loanActionSuccess}</p>
                        )}

                        {selectedLoan.status === "SUBMITTED" && (
                          <div className="flex flex-col gap-3">
                            <button
                              disabled={actionBusy}
                              onClick={moveLoanToReview}
                              className="w-full py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl border border-slate-800 hover:bg-emerald-800 transition-all disabled:opacity-60"
                            >
                              {actionBusy ? "Processing..." : "Move To Review"}
                            </button>
                          </div>
                        )}

                        {["SUBMITTED", "UNDER_REVIEW"].includes(selectedLoan.status) && (
                          <div className="space-y-3">
                            <input
                              type="number"
                              min="1"
                              value={approvedAmount}
                              onChange={(e) => setApprovedAmount(e.target.value)}
                              placeholder="Approved amount"
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                            />
                            <input
                              value={approvalComments}
                              onChange={(e) => setApprovalComments(e.target.value)}
                              placeholder="Approval comments (optional)"
                              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                            />
                            <button
                              disabled={actionBusy}
                              onClick={approveLoan}
                              className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl border border-slate-800 hover:bg-emerald-800 transition-all disabled:opacity-60"
                            >
                              {actionBusy ? "Processing..." : (selectedLoan.status === "SUBMITTED" ? "Move + Approve Loan" : "Approve Loan")}
                            </button>

                            <input
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder="Rejection reason"
                              className="w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm"
                            />
                            <button
                              disabled={actionBusy}
                              onClick={rejectLoan}
                              className="w-full py-4 bg-white text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-rose-200 hover:bg-rose-50 transition-all disabled:opacity-60"
                            >
                              {actionBusy ? "Processing..." : "Reject Loan"}
                            </button>
                          </div>
                        )}

                        {selectedLoan.status === "APPROVED" && (
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-700">
                            Loan is approved. Disbursement is handled by admin.
                          </div>
                        )}

                        <div className="flex flex-col gap-3">
                          <button onClick={() => setSelectedLoan(null)} className="w-full py-5 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] hover:text-rose-600 transition-colors">Close</button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <DocumentAction label="Bank Statements" placeholder />
                        <DocumentAction label="Income Tax Returns" placeholder />
                        <DocumentAction label="Employment Verification" placeholder />
                    </div>
                </div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </PortalShell>
  );
}

// --- MODAL SUB-COMPONENTS ---
function ModalInfo({ label, value }) {
    return (
        <div className="p-5 bg-slate-50 border border-slate-200 rounded-3xl">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{label}</p>
            <p className="text-sm font-bold text-slate-900">{value || "N/A"}</p>
        </div>
    );
}

function DocumentAction({ label, fileId, fileName, placeholder = false }) {
    return (
        <div className="p-6 border border-slate-200 rounded-[2rem] bg-white shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-emerald-400 border border-slate-700"><FileText size={20}/></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">{label}</p>
                </div>
                {!placeholder && fileId && <CheckCircle2 size={18} className="text-emerald-500" />}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
                <button 
                    disabled={placeholder || !fileId}
                    onClick={() => fileApi.download(fileId, fileName)}
                    className="py-3 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-900 hover:text-white transition-all disabled:opacity-30"
                >
                   <ExternalLink size={12}/> Download
                </button>
                <button 
                    disabled={placeholder || !fileId}
                    className="py-3 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 flex items-center justify-center gap-2 hover:border-emerald-400 transition-all disabled:opacity-30"
                >
                   <Eye size={12}/> Verify
                </button>
            </div>
        </div>
    );
}



