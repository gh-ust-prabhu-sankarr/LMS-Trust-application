import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import PortalShell from "../../components/layout/PortalShell.jsx";
import { adminApi, customerApi, kycApi, loanApi, unwrap, userApi, fileApi } from "../../api/domainApi.js";
import { getFriendlyError } from "../../utils/errorMessage.js";
import { getDocumentLabelFromFileName } from "../../utils/documentLabel.js";
import { usePopup } from "../../components/ui/PopupProvider.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { 
  ChevronRight, ChevronLeft,
  ClipboardCheck, UserCheck, AlertCircle, 
  FileText, X, ExternalLink, Eye, CheckCircle2, Users, Search
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
const TX_ITEMS_PER_PAGE = 6;
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

const formatLoanDocumentLabel = (applicationLabel, fileName, fallback = "Loan Document") => {
  const fromApplication = String(applicationLabel || "").trim();
  const generic = /^loan supporting document$/i.test(fromApplication) || /^doc(ument)?\s*\d*$/i.test(fromApplication);
  if (fromApplication && !generic) return fromApplication;
  return getDocumentLabelFromFileName(fileName, fallback);
};

export default function OfficerDashboard() {
  const { user } = useAuth();
  const { showPopup } = usePopup();
  const [activeTab, setActiveTab] = useState("kyc");
  const [kycStatusFilter, setKycStatusFilter] = useState("PENDING");
  const [kycByStatus, setKycByStatus] = useState({ PENDING: [], APPROVED: [], REJECTED: [] });
  const [loanByStatus, setLoanByStatus] = useState({ SUBMITTED: [], UNDER_REVIEW: [], APPROVED: [] });
  const [customerById, setCustomerById] = useState({});
  const [userById, setUserById] = useState({});
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
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectReasonError, setRejectReasonError] = useState("");
  const [loanDocs, setLoanDocs] = useState([]);
  const [loanDocsLoading, setLoanDocsLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState("");
  const [txPage, setTxPage] = useState(1);
  const [txSearch, setTxSearch] = useState("");

  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const [kycResRaw, loanResRaw, userRes, usersRes] = await Promise.all([
        Promise.allSettled(KYC_STATUSES.map((s) => kycApi.getByStatus(s))),
        Promise.allSettled(LOAN_STATUSES.map((s) => loanApi.getByStatus(s))),
        userApi.getMe(),
        adminApi.getUsers(),
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
      const users = unwrap(usersRes) || [];
      setUserById(Object.fromEntries(users.map((u) => [u.id, u])));

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
      showPopup(`KYC ${action === "approve" ? "approved" : "rejected"} successfully.`, { type: "success" });
    } catch (err) {
      showPopup(getFriendlyError(err, "KYC authorization failed."), { type: "error" });
    }
  };

  const handleOpenLoan = (loan) => {
    setSelectedLoan(loan);
    setLoanDocs([]);
    setLoanActionError("");
    setLoanActionSuccess("");
    setApprovedAmount(String(loan?.requestedAmount || ""));
    setApprovalComments("");
    setRejectModalOpen(false);
    setRejectReason("");
    setRejectReasonError("");
  };

  useEffect(() => {
    if (!selectedLoan?.id) {
      setLoanDocs([]);
      return;
    }

    setLoanDocsLoading(true);
    fileApi
      .listByEntity("LOAN_APPLICATION", selectedLoan.id)
      .then((res) => setLoanDocs(res?.data || []))
      .catch(() => setLoanDocs([]))
      .finally(() => setLoanDocsLoading(false));
  }, [selectedLoan?.id]);

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
      showPopup("Action completed successfully.", { type: "success" });
    } catch (err) {
      const message = getFriendlyError(err, "Action failed");
      setLoanActionError(message);
      showPopup(message, { type: "error" });
    } finally {
      setActionBusy(false);
    }
  };

  const isAlreadyInReviewTransition = (err) => {
    const msg = String(err?.response?.data?.message || err?.message || "").toLowerCase();
    return msg.includes("invalid state transition") || msg.includes("under_review");
  };

  const ensureUnderReview = async (loanId, status) => {
    if (String(status || "").toUpperCase() !== "SUBMITTED") return;
    try {
      await loanApi.moveToReview(loanId);
    } catch (err) {
      if (!isAlreadyInReviewTransition(err)) throw err;
    }
  };

  const approveLoan = () => withLoanAction(async () => {
    const amount = Number(approvedAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Enter a valid approved amount");
    }
    await ensureUnderReview(selectedLoan.id, selectedLoan.status);
    await loanApi.approve(selectedLoan.id, {
      approvedAmount: amount,
      comments: approvalComments || "Approved by loan officer",
    });
  });

  const rejectLoan = (reason) => withLoanAction(async () => {
    await ensureUnderReview(selectedLoan.id, selectedLoan.status);
    await loanApi.reject(selectedLoan.id, reason);
  });

  const openRejectModal = () => {
    setRejectReason("");
    setRejectReasonError("");
    setRejectModalOpen(true);
  };

  const closeRejectModal = () => {
    if (actionBusy) return;
    setRejectModalOpen(false);
    setRejectReasonError("");
  };

  const confirmRejectLoan = async () => {
    const reason = rejectReason.trim();
    if (!reason) {
      setRejectReasonError("Reason is required.");
      return;
    }
    setRejectReasonError("");
    await rejectLoan(reason);
    setRejectModalOpen(false);
    setRejectReason("");
  };

  const parseAuditAmount = (details) => {
    const text = String(details || "");
    const match = text.match(/repayment\s+of\s+([0-9]+(?:\.[0-9]+)?)/i);
    if (!match) return null;
    const n = Number(match[1]);
    return Number.isFinite(n) ? n : null;
  };

  const resolveCustomerEmail = useCallback(
    (customerId, userId) => {
      if (userId && userById[userId]?.email) return userById[userId].email;
      const customer = customerById[customerId];
      if (!customer) return "-";
      return userById[customer.userId]?.email || "-";
    },
    [customerById, userById]
  );

  const loadAllTransactions = useCallback(async () => {
    setTxError("");
    setTxLoading(true);
    try {
      const res = await adminApi.getUsers();
      const users = unwrap(res) || [];
      const customers = users.filter((u) => String(u?.role || "").toUpperCase() === "CUSTOMER");
      const auditResults = await Promise.allSettled(
        customers.map((customer) => adminApi.getAuditByUser(customer.id))
      );
      const rows = auditResults.flatMap((result, idx) => {
        if (result.status !== "fulfilled") return [];
        const customer = customers[idx];
        const audits = unwrap(result.value) || result.value?.data || [];
        const onlineRefs = new Set(
          audits
            .filter((a) => String(a?.action || "").toUpperCase() === "STRIPE_PAYMENT_CONFIRMED")
            .map((a) => String(a?.entityId || ""))
            .filter(Boolean)
        );
        const failedRefs = new Set(
          audits
            .filter((a) => {
              const action = String(a?.action || "").toUpperCase();
              const details = String(a?.details || "").toLowerCase();
              return action.includes("FAILED") || details.includes("failed") || details.includes("cancel");
            })
            .map((a) => String(a?.entityId || ""))
            .filter(Boolean)
        );
        return audits
          .filter((a) => {
            const details = String(a?.details || "").toLowerCase();
            const isRepayment = details.includes("repayment of");
            const isCheckout = details.includes("checkout session");
            return isRepayment && !isCheckout;
          })
          .map((a) => ({
            id: a?.id || `${customer?.id || "u"}-${a?.timestamp || Math.random()}`,
            amount: parseAuditAmount(a?.details),
            details: a?.details || "-",
            transactionRef: a?.entityId || "-",
            timestamp: a?.timestamp || null,
            customerName: customer?.username || customerById[customer?.id]?.fullName || "Customer",
            customerEmail: customer?.email || resolveCustomerEmail(customer?.id),
            method: onlineRefs.has(String(a?.entityId || "")) ? "ONLINE" : "OFFLINE",
            status: failedRefs.has(String(a?.entityId || "")) ? "FAILED" : "SUCCESS",
          }));
      });
      rows.sort((a, b) => {
        const ta = a?.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tb = b?.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tb - ta;
      });
      setTransactions(rows);
      setTxPage(1);
    } catch (err) {
      setTxError(err?.response?.data?.message || err?.message || "Failed to load transactions.");
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  }, [customerById, resolveCustomerEmail]);

  useEffect(() => {
    if (activeTab !== "transactions") return;
    loadAllTransactions();
    setTransactions([]);
    setTxPage(1);
    setTxSearch("");
  }, [activeTab, loadAllTransactions]);
  const filteredTransactions = useMemo(() => {
    const query = txSearch.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (query) {
        const matchesQuery =
          String(tx?.id || "").toLowerCase().includes(query) ||
          String(tx?.transactionRef || "").toLowerCase().includes(query) ||
          String(tx?.customerName || "").toLowerCase().includes(query) ||
          String(tx?.customerEmail || "").toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }
      return true;
    });
  }, [transactions, txSearch]);
  const totalTxPages = Math.max(1, Math.ceil(filteredTransactions.length / TX_ITEMS_PER_PAGE));
  const paginatedTransactions = useMemo(
    () => filteredTransactions.slice((txPage - 1) * TX_ITEMS_PER_PAGE, txPage * TX_ITEMS_PER_PAGE),
    [filteredTransactions, txPage]
  );
  const formatDateTime = (val) => (val ? new Date(val).toLocaleString("en-IN") : "-");

  useEffect(() => {
    setTxPage(1);
  }, [txSearch]);


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
    <PortalShell title="Loan Officer Dashboard" subtitle={`Welcome Loan Officer ${user?.username || ""}`}>
      
      {/* HEADER SECTION */}
     

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <aside className="lg:col-span-3 space-y-3 sticky top-28 h-fit">
          <SidebarButton id="kyc" label="KYC Approval" icon={UserCheck} />
          <SidebarButton id="loans" label="Loan Approval" icon={ClipboardCheck} />
          <SidebarButton id="transactions" label="Transactions" icon={Users} />
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
                        <th className="p-6">Email</th>
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
                            <td className="p-6 text-xs text-slate-600">{resolveCustomerEmail(kyc.customerId, kyc.userId)}</td>
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
                          <td colSpan="5" className="p-20 text-center">
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
                        <th className="p-6">Email</th>
                        <th className="p-6">Reference ID</th>
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
                            <td className="p-6 text-xs text-slate-600">{resolveCustomerEmail(loan.customerId)}</td>
                            <td className="p-6 text-xs font-mono text-slate-600">{loan.id}</td>
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
                          <td colSpan="6" className="p-20 text-center">
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

            {/* TRANSACTIONS TAB */}
            {activeTab === "transactions" && (
              <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                      <Users size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Customer Transactions</h3>
                      <p className="text-xs text-slate-500">Only repayment entries made by customers.</p>
                    </div>
                  </div>
                  <button
                    onClick={loadAllTransactions}
                    disabled={txLoading}
                    className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-300 hover:bg-slate-100 disabled:opacity-60"
                  >
                    {txLoading ? "Refreshing..." : "Refresh"}
                  </button>
                </div>

                {txError && (
                  <p className="px-6 pt-4 text-sm font-semibold text-rose-600">{txError}</p>
                )}

                <div className="px-6 py-3 border-b border-slate-100">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                          type="text"
                          value={txSearch}
                          onChange={(e) => setTxSearch(e.target.value)}
                          placeholder="Search by ref id, name or email..."
                          className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                </div>
                <div>
                    {txLoading ? (
                      <div className="p-6 text-sm text-slate-500">Loading transactions...</div>
                    ) : filteredTransactions.length ? (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead className="bg-slate-50/50 text-[10px] uppercase tracking-widest text-slate-400 font-black border-b border-slate-100">
                              <tr>
                                <th className="px-6 py-4">Customer</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Date & Time</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Reference ID</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Method</th>
                                <th className="px-6 py-4">Transaction Ref</th>
                                <th className="px-6 py-4">Details</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {paginatedTransactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="px-6 py-4 text-sm font-semibold text-slate-800">{tx.customerName || "-"}</td>
                                  <td className="px-6 py-4 text-xs text-slate-600">{tx.customerEmail || "-"}</td>
                                  <td className="px-6 py-4 text-sm text-slate-700">{formatDateTime(tx.timestamp)}</td>
                                  <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                                    {Number(tx?.amount || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="px-6 py-4 text-xs font-mono text-slate-600">{tx.id}</td>
                                  <td className={`px-6 py-4 text-xs font-black ${tx.status === "FAILED" ? "text-rose-600" : "text-emerald-700"}`}>{tx.status}</td>
                                  <td className="px-6 py-4 text-xs font-semibold text-slate-700">{tx.method}</td>
                                  <td className="px-6 py-4 text-xs font-mono text-slate-600">{tx.transactionRef}</td>
                                  <td className="px-6 py-4 text-xs text-slate-600">{tx.details}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {totalTxPages > 1 && (
                          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              Page {txPage} of {totalTxPages}
                            </p>
                            <div className="flex gap-2">
                              <button
                                disabled={txPage === 1}
                                onClick={() => setTxPage((p) => p - 1)}
                                className="p-2 rounded-lg border bg-white disabled:opacity-30 hover:bg-slate-50 transition-all"
                              >
                                <ChevronLeft size={16} />
                              </button>
                              <button
                                disabled={txPage >= totalTxPages}
                                onClick={() => setTxPage((p) => p + 1)}
                                className="p-2 rounded-lg border bg-white disabled:opacity-30 hover:bg-slate-50 transition-all"
                              >
                                <ChevronRight size={16} />
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-10 text-center text-sm text-slate-500">No repayment records found.</div>
                    )}
                </div>
              </section>
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
                        <DocumentAction label="PAN Card Document" fileId={selectedKyc.panDocumentFileId} fileName="PAN_DOC.pdf" onError={showPopup} />
                        <DocumentAction label="Aadhaar Card Document" fileId={selectedKyc.aadhaarDocumentFileId} fileName="AADHAAR_DOC.pdf" onError={showPopup} />
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
                            <ModalInfo label="Email" value={resolveCustomerEmail(selectedLoan.customerId)} />
                            <ModalInfo label="Requested Capital" value={money(selectedLoan.requestedAmount)} />
                            <ModalInfo label="Approved Capital" value={selectedLoan?.approvedAmount ? money(selectedLoan.approvedAmount) : "-"} />
                            <ModalInfo label="Tenure (Months)" value={selectedLoan?.tenure || "-"} />
                            <ModalInfo
                              label="Tenure (Years)"
                              value={selectedLoan?.tenure ? (Number(selectedLoan.tenure) / 12).toFixed(1) : "-"}
                            />
                            <ModalInfo label="Interest Rate" value={selectedLoan?.interestRate ? `${selectedLoan.interestRate}%` : "-"} />
                            <ModalInfo label="EMI" value={selectedLoan?.emi ? money(selectedLoan.emi) : "-"} />
                            <ModalInfo label="Monthly Yield" value={money(customerById[selectedLoan.customerId]?.monthlyIncome)} />
                            <ModalInfo label="CIBIL Index" value={customerById[selectedLoan.customerId]?.creditScore || "N/A"} />
                            <ModalInfo label="Loan Status" value={selectedLoan?.status || "-"} />
                            <ModalInfo label="Submitted At" value={selectedLoan?.submittedAt ? new Date(selectedLoan.submittedAt).toLocaleString("en-IN") : "-"} />
                        </div>

                        <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200">
                             <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Audit Memo</p>
                             <p className="text-sm text-slate-700 leading-relaxed font-medium italic">"System-generated risk assessment: Based on credit index and income statements, applicant shows stable repayment capacity."</p>
                        </div>

                        {!!Object.keys(selectedLoan?.applicationDetails || {}).length && (
                          <div className="p-6 bg-white rounded-[2rem] border border-slate-200">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                              Application Details
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {Object.entries(selectedLoan.applicationDetails).map(([fieldLabel, fieldValue]) => (
                                <div key={fieldLabel} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{fieldLabel}</p>
                                  <p className="mt-1 text-sm font-semibold text-slate-800 break-words">{String(fieldValue || "-")}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {loanActionError && (
                          <p className="text-sm font-semibold text-rose-600">{loanActionError}</p>
                        )}
                        {loanActionSuccess && (
                          <p className="text-sm font-semibold text-emerald-700">{loanActionSuccess}</p>
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
                              {actionBusy ? "Processing..." : "Approve Loan"}
                            </button>
                            <button
                              disabled={actionBusy}
                              onClick={openRejectModal}
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
                        {loanDocsLoading ? (
                          <div className="p-6 border border-slate-200 rounded-[2rem] bg-white text-sm text-slate-500">
                            Loading documents...
                          </div>
                        ) : loanDocs.length ? (
                          loanDocs.map((doc, idx) => (
                            <DocumentAction
                              key={doc.id}
                              label={formatLoanDocumentLabel(selectedLoan?.documents?.[idx] || doc.displayName, doc.fileName, "Loan Document")}
                              fileId={doc.id}
                              fileName={doc.fileName || "document.pdf"}
                              onError={showPopup}
                            />
                          ))
                        ) : (
                          <div className="p-6 border border-slate-200 rounded-[2rem] bg-white text-sm text-slate-500">
                            No loan documents uploaded.
                          </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedLoan && rejectModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[130] flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-8 shadow-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500 mb-2">Reject Loan</p>
              <h3 className="text-xl font-serif text-slate-900 mb-2">Provide Rejection Reason</h3>
              <p className="text-sm text-slate-500 mb-5">
                This reason will be sent with the rejection response for loan ID {selectedLoan.id}.
              </p>

              <textarea
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (rejectReasonError && e.target.value.trim()) setRejectReasonError("");
                }}
                placeholder="Enter reason"
                rows={4}
                className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition-colors ${
                  rejectReasonError
                    ? "border-rose-400 ring-2 ring-rose-100"
                    : "border-slate-300 focus:border-rose-400"
                }`}
              />
              {rejectReasonError ? (
                <p className="mt-2 text-xs font-semibold text-rose-600">{rejectReasonError}</p>
              ) : null}

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={closeRejectModal}
                  className="rounded-xl border border-slate-300 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionBusy}
                  onClick={confirmRejectLoan}
                  className="rounded-xl border border-rose-300 bg-rose-50 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-100 disabled:opacity-60"
                >
                  {actionBusy ? "Processing..." : "Confirm Reject"}
                </button>
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

function DocumentAction({ label, fileId, fileName, placeholder = false, onError }) {
    const handleDownload = () => {
        if (!fileId || placeholder) return;
        fileApi.download(fileId, fileName).catch((err) => {
          onError?.(getFriendlyError(err, "Unable to download document."), { type: "error" });
        });
    };

    const handleVerify = () => {
        if (!fileId || placeholder) return;
        fileApi.openInNewTab(fileId).catch((err) => {
          onError?.(getFriendlyError(err, "Unable to open document."), { type: "error" });
        });
    };

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
                    onClick={handleDownload}
                    className="py-3 bg-slate-50 border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-900 hover:text-white transition-all disabled:opacity-30"
                >
                   <ExternalLink size={12}/> Download
                </button>
                <button 
                    disabled={placeholder || !fileId}
                    onClick={handleVerify}
                    className="py-3 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 flex items-center justify-center gap-2 hover:border-emerald-400 transition-all disabled:opacity-30"
                >
                   <Eye size={12}/> Verify
                </button>
            </div>
        </div>
    );
}



