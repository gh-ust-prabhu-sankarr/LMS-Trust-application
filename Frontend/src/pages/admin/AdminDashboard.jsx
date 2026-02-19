import { useEffect, useMemo, useState } from "react";
import PortalShell from "../../components/layout/PortalShell.jsx";
import { adminApi, customerApi, loanApi, productApi, unwrap } from "../../api/domainApi.js";
import { parseApplicationFields, slugifyLoanName, upsertLoanPageMeta } from "../../utils/loanCatalog.js";
import { getFriendlyError } from "../../utils/errorMessage.js";
import { usePopup } from "../../components/ui/PopupProvider.jsx";
import { Users, ShieldCheck, Search, ChevronLeft, ChevronRight, UserPlus, PackagePlus, LayoutGrid, ScrollText, Landmark } from "lucide-react";

const initialProductForm = {
  name: "",
  description: "",
  minAmount: "",
  maxAmount: "",
  minTenure: "",
  maxTenure: "",
  interestRate: "",
  minCreditScore: "",
  heroTitle: "",
  heroSubtitle: "",
  badgeText: "",
  ctaText: "",
  imageUrl: "",
  documents: "",
  requiredDocuments: "",
  processSteps: "",
  applicationFields: "",
};

const initialOfficerForm = { username: "", email: "", password: "" };
const initialOfficerErrors = {};
const initialProductErrors = {};
const hasAlphabet = (value = "") => /[A-Za-z]/.test(String(value));
const bankStatusTone = (status) => {
  const normalized = String(status || "NOT_SUBMITTED").toUpperCase();
  if (normalized === "APPROVED") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (normalized === "PENDING") return "bg-amber-50 text-amber-700 border-amber-200";
  if (normalized === "REJECTED") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
};
const maskAccount = (account) => {
  const text = String(account || "");
  if (text.length <= 4) return text || "-";
  return `${"*".repeat(text.length - 4)}${text.slice(-4)}`;
};

export default function AdminDashboard() {
  const { showPopup } = usePopup();
  const [activeTab, setActiveTab] = useState("DIRECTORY");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [productForm, setProductForm] = useState(initialProductForm);
  const [officerForm, setOfficerForm] = useState(initialOfficerForm);
  const [officerErrors, setOfficerErrors] = useState(initialOfficerErrors);
  const [productErrors, setProductErrors] = useState(initialProductErrors);
  const [processing, setProcessing] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [txPage, setTxPage] = useState(1);
  const [txSearch, setTxSearch] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilters, setAuditFilters] = useState({ userId: "", action: "", limit: 50 });
  const [auditActionOptions, setAuditActionOptions] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [auditPage, setAuditPage] = useState(1);
  const [disbursementLoading, setDisbursementLoading] = useState(false);
  const [disbursementError, setDisbursementError] = useState("");
  const [approvedLoans, setApprovedLoans] = useState([]);
  const [selectedDisbursementLoan, setSelectedDisbursementLoan] = useState(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [disbursementActionBusy, setDisbursementActionBusy] = useState(false);

  const itemsPerPage = 4;
  const txItemsPerPage = 6;
  const auditItemsPerPage = 8;

  const loadData = async () => {
    setLoading(true);
    try {
      const uRes = await adminApi.getUsers();
      setUsers(unwrap(uRes) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const userById = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users]
  );

  const parseAuditAmount = (details) => {
    const text = String(details || "");
    const match = text.match(/repayment\s+of\s+([0-9]+(?:\.[0-9]+)?)/i);
    if (!match) return null;
    const n = Number(match[1]);
    return Number.isFinite(n) ? n : null;
  };

  const loadAllTransactions = async () => {
    setTxLoading(true);
    setTxError("");
    try {
      const userRes = await adminApi.getUsers();
      const allUsers = unwrap(userRes) || [];
      const customers = allUsers.filter((u) => String(u?.role || "").toUpperCase() === "CUSTOMER");
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
            const isCheckoutEvent = details.includes("checkout session");
            return isRepayment && !isCheckoutEvent;
          })
          .map((a) => ({
            id: a?.id || `${customer?.id || "u"}-${a?.timestamp || Math.random()}`,
            amount: parseAuditAmount(a?.details),
            details: a?.details || "-",
            transactionRef: a?.entityId || "-",
            timestamp: a?.timestamp || null,
            customerName: customer?.username || "-",
            customerEmail: customer?.email || "-",
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
      setTxError(err?.response?.data?.message || err?.message || "Failed to fetch transaction data.");
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  };

  const loadAuditLogs = async (overrides = {}) => {
    const params = { ...auditFilters, ...overrides };
    const cleanParams = {
      userId: params.userId || undefined,
      limit: Number(params.limit) || 50,
    };

    setAuditFilters((prev) => ({ ...prev, ...params, limit: cleanParams.limit }));
    setAuditLoading(true);
    setAuditError("");
    try {
      const res = await adminApi.getAuditLogs(cleanParams);
      const logs = unwrap(res) || res?.data || [];
      const actionFilter = String(params.action || "").trim().toUpperCase();
      const filtered = actionFilter
        ? logs.filter((log) => String(log?.action || "").toUpperCase() === actionFilter)
        : logs;
      setAuditLogs(filtered);
      setAuditPage(1);
    } catch (err) {
      setAuditError(err?.response?.data?.message || err?.message || "Failed to fetch audit logs.");
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  };

  const loadApprovedLoansForDisbursement = async () => {
    setDisbursementLoading(true);
    setDisbursementError("");
    try {
      const res = await loanApi.getByStatus("APPROVED");
      const loans = unwrap(res) || res?.data || [];
      const customerResults = await Promise.allSettled(
        loans.map((loan) => customerApi.getById(loan.customerId))
      );
      const customerNameById = {};
      customerResults.forEach((result, idx) => {
        if (result.status !== "fulfilled") return;
        const loan = loans[idx];
        const customer = unwrap(result.value) || result.value?.data || {};
        customerNameById[loan.id] = customer?.fullName || "Unknown";
      });
      setApprovedLoans(
        loans.map((loan) => ({
          ...loan,
          customerName: customerNameById[loan.id] || "Unknown",
        }))
      );
    } catch (err) {
      setDisbursementError(getFriendlyError(err, "Failed to load approved loans."));
      setApprovedLoans([]);
    } finally {
      setDisbursementLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "TRANSACTIONS") return;
    loadAllTransactions();
    setTxError("");
    setTxPage(1);
    setTxSearch("");
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "AUDIT") return;
    loadAuditActionOptions();
    loadAuditLogs();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "DISBURSEMENTS") return;
    loadApprovedLoansForDisbursement();
  }, [activeTab]);

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (u) =>
          u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [users, searchTerm]
  );

  const totalUserPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((userPage - 1) * itemsPerPage, userPage * itemsPerPage);
  const filteredTransactions = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((tx) =>
      String(tx?.id || "").toLowerCase().includes(q) ||
      String(tx?.transactionRef || "").toLowerCase().includes(q) ||
      String(tx?.customerName || "").toLowerCase().includes(q) ||
      String(tx?.customerEmail || "").toLowerCase().includes(q)
    );
  }, [transactions, txSearch]);
  const totalTxPages = Math.max(1, Math.ceil((filteredTransactions.length || 0) / txItemsPerPage));
  const paginatedTransactions = useMemo(() => {
    const start = (txPage - 1) * txItemsPerPage;
    return filteredTransactions.slice(start, start + txItemsPerPage);
  }, [filteredTransactions, txPage]);
  const totalAuditPages = Math.max(1, Math.ceil((auditLogs.length || 0) / auditItemsPerPage));
  const paginatedAuditLogs = useMemo(() => {
    const start = (auditPage - 1) * auditItemsPerPage;
    return auditLogs.slice(start, start + auditItemsPerPage);
  }, [auditLogs, auditPage, auditItemsPerPage]);
  const formatDateTime = (val) => (val ? new Date(val).toLocaleString("en-IN") : "-");
  const money = (n) => {
    const value = Number(n);
    return Number.isFinite(value)
      ? value.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })
      : "-";
  };

  const displayRole = (role) => {
    const upper = String(role || "").toUpperCase();
    if (upper === "CREDIT_OFFICER") return "LOAN_OFFICER";
    return upper || "-";
  };

  useEffect(() => {
    setTxPage(1);
  }, [txSearch]);

  const handleToggleUser = async (user) => {
    if (String(user?.role || "").toUpperCase() === "ADMIN") {
      showPopup("Admin accounts cannot be suspended.", { type: "error", title: "Not Allowed" });
      return;
    }
    try {
      await adminApi.toggleUserStatus(user.id, !user.active);
      await loadData();
      showPopup("User status updated successfully.", { type: "success" });
    } catch (err) {
      showPopup(getFriendlyError(err, "Action failed."), { type: "error" });
    }
  };

  const openDisbursementModal = (loan) => {
    setSelectedDisbursementLoan(loan);
    setDecisionReason("");
  };

  const closeDisbursementModal = () => {
    if (disbursementActionBusy) return;
    setSelectedDisbursementLoan(null);
    setDecisionReason("");
  };

  const refreshLoansAfterAction = async (preferredLoanId = null) => {
    await loadApprovedLoansForDisbursement();
    if (!preferredLoanId) {
      setSelectedDisbursementLoan(null);
      return;
    }
    try {
      const loanRes = await loanApi.getById(preferredLoanId);
      const loan = unwrap(loanRes) || loanRes?.data;
      const customerRes = await customerApi.getById(loan.customerId);
      const customer = unwrap(customerRes) || customerRes?.data || {};
      setSelectedDisbursementLoan({ ...loan, customerName: customer?.fullName || "Unknown" });
    } catch {
      setSelectedDisbursementLoan(null);
    }
  };

  const verifyBankDetails = async (status) => {
    if (!selectedDisbursementLoan?.id) return;
    if (status === "REJECTED" && !decisionReason.trim()) {
      showPopup("Rejection reason is required.", { type: "error" });
      return;
    }

    setDisbursementActionBusy(true);
    try {
      await loanApi.verifyBankDetails(selectedDisbursementLoan.id, {
        status,
        reason: decisionReason.trim() || null,
      });
      showPopup(`Bank details ${status.toLowerCase()} successfully.`, { type: "success" });
      setDecisionReason("");
      await refreshLoansAfterAction(selectedDisbursementLoan.id);
    } catch (err) {
      showPopup(getFriendlyError(err, "Bank details action failed."), { type: "error" });
    } finally {
      setDisbursementActionBusy(false);
    }
  };

  const disburseLoan = async () => {
    if (!selectedDisbursementLoan?.id) return;
    setDisbursementActionBusy(true);
    try {
      await loanApi.disburse(selectedDisbursementLoan.id);
      showPopup("Loan disbursed successfully.", { type: "success" });
      await refreshLoansAfterAction();
    } catch (err) {
      showPopup(getFriendlyError(err, "Disbursement failed."), { type: "error" });
    } finally {
      setDisbursementActionBusy(false);
    }
  };

  const loadAuditActionOptions = async () => {
    try {
      const res = await adminApi.getAuditLogs({ limit: 200 });
      const logs = unwrap(res) || res?.data || [];
      const options = [
        ...new Set(
          logs
            .map((log) => String(log?.action || "").trim().toUpperCase())
            .filter(Boolean)
        ),
      ].sort();
      setAuditActionOptions(options);
    } catch {
      setAuditActionOptions([]);
    }
  };

  const handleCreateOfficer = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!officerForm.username.trim()) nextErrors.username = "Username is required.";
    if (!officerForm.email.trim()) nextErrors.email = "Email is required.";
    if (!officerForm.password) nextErrors.password = "Password is required.";
    if (officerForm.password && officerForm.password.length < 8) nextErrors.password = "Password must be at least 8 characters.";
    setOfficerErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setProcessing(true);
    try {
      await adminApi.createOfficer(officerForm);
      setOfficerForm(initialOfficerForm);
      setOfficerErrors(initialOfficerErrors);
      setActiveTab("DIRECTORY");
      await loadData();
      showPopup("Staff account created.", { type: "success" });
    } catch (err) {
      const fieldMap = err?.response?.data;
      if (fieldMap && typeof fieldMap === "object" && !Array.isArray(fieldMap) && !fieldMap.message) {
        setOfficerErrors(fieldMap);
      }
      showPopup(getFriendlyError(err, "Failed to create officer."), { type: "error" });
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!hasAlphabet(productForm.name)) nextErrors.name = "Product name must contain alphabets.";
    if (!hasAlphabet(productForm.heroTitle)) nextErrors.heroTitle = "Hero title must contain alphabets.";
    const minTenure = parseInt(productForm.minTenure, 10);
    const maxTenure = parseInt(productForm.maxTenure, 10);
    const minCredit = parseInt(productForm.minCreditScore, 10);
    if (Number.isFinite(minTenure) && Number.isFinite(maxTenure) && minTenure > maxTenure) {
      nextErrors.minTenure = "Min tenure cannot be greater than max tenure.";
      nextErrors.maxTenure = "Max tenure must be greater than or equal to min tenure.";
    }
    if (Number.isFinite(minCredit) && minCredit < 650) {
      nextErrors.minCreditScore = "Min credit score must be 650 or above.";
    }
    setProductErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setProcessing(true);
    try {
      const payload = {
        name: productForm.name,
        description: productForm.description,
        active: true,
        minAmount: parseFloat(productForm.minAmount),
        maxAmount: parseFloat(productForm.maxAmount),
        interestRate: parseFloat(productForm.interestRate),
        minTenure: parseInt(productForm.minTenure, 10),
        maxTenure: parseInt(productForm.maxTenure, 10),
        minCreditScore: parseInt(productForm.minCreditScore, 10),
      };

      const splitLines = (text = "") =>
        text
          .split(/\r?\n/)
          .map((t) => t.trim())
          .filter(Boolean);

      const createRes = await productApi.create(payload);
      const created = unwrap(createRes) || {};
      if (created?.id) {
        upsertLoanPageMeta(created.id, {
          slug: slugifyLoanName(productForm.name),
          heroTitle: productForm.heroTitle.trim(),
          heroSubtitle: productForm.heroSubtitle.trim(),
          badgeText: productForm.badgeText.trim(),
          ctaText: productForm.ctaText.trim(),
          imageUrl: productForm.imageUrl.trim(),
          documents: splitLines(productForm.documents),
          requiredDocuments: splitLines(productForm.requiredDocuments),
          processSteps: splitLines(productForm.processSteps),
          applicationFields: parseApplicationFields(productForm.applicationFields),
        });
      }

      setProductForm(initialProductForm);
      setProductErrors(initialProductErrors);
      showPopup("Product published successfully.", { type: "success" });
    } catch (err) {
      const fieldMap = err?.response?.data;
      if (fieldMap && typeof fieldMap === "object" && !Array.isArray(fieldMap) && !fieldMap.message) {
        setProductErrors(fieldMap);
      }
      showPopup(getFriendlyError(err, "Failed to publish product."), { type: "error" });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <PortalShell title="Admin">
        <div className="p-20 text-center animate-pulse text-slate-400 font-bold text-xs tracking-widest uppercase">
          Establishing Secure Connection...
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell title="Admin Command Center" subtitle="Manage system access and loan instrument deployment.">
      <div className="mb-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1 rounded-2xl bg-slate-200/50 p-1.5 max-w-6xl mx-auto shadow-inner">
        <TabButton active={activeTab === "DIRECTORY"} onClick={() => setActiveTab("DIRECTORY")} icon={<LayoutGrid size={16} />} label="User Registry" />
        <TabButton active={activeTab === "DISBURSEMENTS"} onClick={() => setActiveTab("DISBURSEMENTS")} icon={<Landmark size={16} />} label="Disbursements" />
        <TabButton active={activeTab === "TRANSACTIONS"} onClick={() => setActiveTab("TRANSACTIONS")} icon={<Users size={16} />} label="Transactions" />
        <TabButton active={activeTab === "AUDIT"} onClick={() => setActiveTab("AUDIT")} icon={<ScrollText size={16} />} label="Audit Logs" />
        <TabButton active={activeTab === "OFFICER"} onClick={() => setActiveTab("OFFICER")} icon={<UserPlus size={16} />} label="Add Officer" />
        <TabButton active={activeTab === "PRODUCT"} onClick={() => setActiveTab("PRODUCT")} icon={<PackagePlus size={16} />} label="Issue Product" />
      </div>

      <div className={`${activeTab === "TRANSACTIONS" ? "max-w-6xl" : "max-w-4xl"} mx-auto`}>
        {activeTab === "DIRECTORY" && (
          <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <Users size={20} />
                </div>
                <h3 className="font-bold text-slate-900">System Registry</h3>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search account by email"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setUserPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[10px] uppercase tracking-widest text-slate-400 font-black border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-4">Identity</th>
                    <th className="px-8 py-4 text-center">System Role</th>
                    <th className="px-8 py-4 text-right">Access Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs uppercase bg-emerald-100 text-emerald-700">
                            {u.username[0]}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-800">{u.username}</div>
                            <div className="text-[10px] text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded uppercase bg-emerald-50 text-emerald-700">
                          {displayRole(u.role)}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <button
                          onClick={() => handleToggleUser(u)}
                          disabled={String(u.role || "").toUpperCase() === "ADMIN"}
                          title={String(u.role || "").toUpperCase() === "ADMIN" ? "Admin accounts cannot be suspended." : ""}
                          className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                            String(u.role || "").toUpperCase() === "ADMIN"
                              ? "border-slate-200 text-slate-400"
                              : u.active
                                ? "border-slate-300 text-slate-700 hover:bg-slate-100"
                                : "border-emerald-100 text-emerald-600 hover:bg-emerald-50"
                          }`}
                        >
                          {String(u.role || "").toUpperCase() === "ADMIN" ? "Protected" : u.active ? "Suspend" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Page {userPage} of {totalUserPages || 1}</p>
              <div className="flex gap-2">
                <button disabled={userPage === 1} onClick={() => setUserPage((p) => p - 1)} className="p-2 rounded-lg border bg-white disabled:opacity-30 hover:bg-slate-50 transition-all">
                  <ChevronLeft size={16} />
                </button>
                <button disabled={userPage >= totalUserPages} onClick={() => setUserPage((p) => p + 1)} className="p-2 rounded-lg border bg-white disabled:opacity-30 hover:bg-slate-50 transition-all">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </section>
        )}

        {activeTab === "DISBURSEMENTS" && (
          <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <Landmark size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Loan Disbursements</h3>
                  <p className="text-xs text-slate-500">Verify customer bank details and disburse approved loans.</p>
                </div>
              </div>
              <button
                onClick={loadApprovedLoansForDisbursement}
                disabled={disbursementLoading}
                className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-300 hover:bg-slate-100 disabled:opacity-60"
              >
                {disbursementLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {disbursementError && (
              <p className="px-6 pt-4 text-sm font-semibold text-rose-600">{disbursementError}</p>
            )}

            {disbursementLoading ? (
              <div className="p-8 text-sm text-slate-500">Loading approved loans...</div>
            ) : approvedLoans.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 text-[10px] uppercase tracking-widest text-slate-400 font-black border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Applicant</th>
                      <th className="px-6 py-4">Loan</th>
                      <th className="px-6 py-4">Amount</th>
                      <th className="px-6 py-4">Agreement</th>
                      <th className="px-6 py-4">Bank Details</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {approvedLoans.map((loan) => (
                      <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold text-slate-800">{loan.customerName || "Unknown"}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{loan.loanProductName || "-"}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{money(loan.requestedAmount)}</td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                          {loan?.agreementAccepted ? `Accepted by ${loan?.agreementAcceptedName || "-"}` : "Pending customer signature"}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${bankStatusTone(loan?.bankDetailsStatus)}`}>
                            {String(loan?.bankDetailsStatus || "NOT_SUBMITTED").replaceAll("_", " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => openDisbursementModal(loan)}
                            className="rounded-lg border border-emerald-200 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 hover:border-emerald-300 hover:text-emerald-900"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-10 text-center text-sm text-slate-500">No approved loans available for disbursement.</div>
            )}
          </section>
        )}

        {activeTab === "AUDIT" && (
          <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-emerald-300 shadow-lg">
                  <ScrollText size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">System Audit Trail</h3>
                  <p className="text-xs text-slate-500">Inspect recent actions performed by any user.</p>
                </div>
              </div>
              <button
                onClick={() => loadAuditLogs()}
                disabled={auditLoading}
                className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-300 hover:bg-slate-100 disabled:opacity-60"
              >
                {auditLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {auditError && (
              <p className="px-6 pt-4 text-sm font-semibold text-rose-600">{auditError}</p>
            )}

            <div className="p-6 border-b border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">User</label>
                <select
                  value={auditFilters.userId}
                  onChange={(e) => setAuditFilters((p) => ({ ...p, userId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Any user</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Action Type</label>
                <select
                  value={auditFilters.action}
                  onChange={(e) => setAuditFilters((p) => ({ ...p, action: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Any action</option>
                  {auditActionOptions.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Limit</label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={auditFilters.limit}
                  onChange={(e) => setAuditFilters((p) => ({ ...p, limit: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="md:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => loadAuditLogs()}
                    disabled={auditLoading}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all disabled:opacity-60"
                  >
                    Apply Filters
                  </button>
                  <button
                    onClick={() => loadAuditLogs({ userId: "", action: "", limit: 50 })}
                    disabled={auditLoading}
                    className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-60"
                  >
                    Clear
                  </button>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Showing {auditLogs.length} entr{auditLogs.length === 1 ? "y" : "ies"}
                </p>
              </div>
            </div>

            {auditLoading ? (
              <div className="p-8 text-center text-sm text-slate-500">Loading audit trail...</div>
            ) : paginatedAuditLogs.length ? (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50/50 text-[10px] uppercase tracking-widest text-slate-400 font-black border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4">Timestamp</th>
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Action</th>
                        <th className="px-6 py-4">Entity</th>
                        <th className="px-6 py-4">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedAuditLogs.map((log) => {
                        const user = userById[log.userId] || {};
                        return (
                          <tr key={log.id || log.timestamp || Math.random()} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 text-sm text-slate-700">{formatDateTime(log.timestamp)}</td>
                            <td className="px-6 py-4">
                              <div className="text-sm font-bold text-slate-800">{user.username || log.userId || "Unknown"}</div>
                              <div className="text-[10px] text-slate-400">{user.email || "No email"}</div>
                            </td>
                            <td className="px-6 py-4 text-xs font-semibold text-slate-700">{log.action || "-"}</td>
                            <td className="px-6 py-4 text-xs text-slate-600">
                              <div className="font-semibold text-slate-800">{log.entityType || "-"}</div>
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-600 max-w-[280px]">{log.details || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalAuditPages > 1 && (
                  <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Page {auditPage} of {totalAuditPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        disabled={auditPage === 1}
                        onClick={() => setAuditPage((p) => p - 1)}
                        className="p-2 rounded-lg border bg-white disabled:opacity-30 hover:bg-slate-50 transition-all"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        disabled={auditPage >= totalAuditPages}
                        onClick={() => setAuditPage((p) => p + 1)}
                        className="p-2 rounded-lg border bg-white disabled:opacity-30 hover:bg-slate-50 transition-all"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-10 text-center text-sm text-slate-500">No audit events match the selected filters.</div>
            )}
          </section>
        )}

        {activeTab === "OFFICER" && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm max-w-xl mx-auto">
              <div className="mb-8 flex items-center gap-4">
                <div className="h-14 w-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                  <ShieldCheck size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Provision Staff</h3>
                  <p className="text-sm text-slate-500">Assign Loan Officer permissions.</p>
                </div>
              </div>
              <form onSubmit={handleCreateOfficer} className="space-y-5">
                <Field label="Staff Username" placeholder="officer_01" value={officerForm.username} error={officerErrors.username} onChange={(v) => { setOfficerErrors((p) => ({ ...p, username: "" })); setOfficerForm((p) => ({ ...p, username: v })); }} />
                <Field label="Official Email" placeholder="staff@trumio.com" type="email" value={officerForm.email} error={officerErrors.email} onChange={(v) => { setOfficerErrors((p) => ({ ...p, email: "" })); setOfficerForm((p) => ({ ...p, email: v })); }} />
                <Field label="Password" type="password" value={officerForm.password} error={officerErrors.password} onChange={(v) => { setOfficerErrors((p) => ({ ...p, password: "" })); setOfficerForm((p) => ({ ...p, password: v })); }} />
                <button disabled={processing} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 transition-all">
                  Create Officer Account
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === "TRANSACTIONS" && (
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

            <div>
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
                              <td className="px-6 py-4 text-sm text-slate-700">{tx.customerName || "-"}</td>
                              <td className="px-6 py-4 text-xs text-slate-600">{tx.customerEmail || "-"}</td>
                              <td className="px-6 py-4 text-sm text-slate-700">{formatDateTime(tx.timestamp)}</td>
                              <td className="px-6 py-4 text-sm font-semibold text-slate-800">{money(tx.amount)}</td>
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
            </div>
          </section>
        )}

        {activeTab === "PRODUCT" && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <div className="mb-8 flex items-center gap-4">
                <div className="h-12 w-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                  <PackagePlus size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Loan Instrument Setup</h3>
                  <p className="text-sm text-slate-500">Configure parameters and page content for each loan product.</p>
                </div>
              </div>

              <form onSubmit={handleCreateProduct} className="space-y-6">
                <Field label="Product Name" placeholder="e.g. Small Business Growth Fund" value={productForm.name} error={productErrors.name} onChange={(v) => { setProductErrors((p) => ({ ...p, name: "" })); setProductForm((p) => ({ ...p, name: v })); }} />
                <Field label="Hero Title" placeholder="Scale your next growth phase." value={productForm.heroTitle} error={productErrors.heroTitle} onChange={(v) => { setProductErrors((p) => ({ ...p, heroTitle: "" })); setProductForm((p) => ({ ...p, heroTitle: v })); }} />
                <Field label="Hero Subtitle" placeholder="Page subtitle shown on EMI screen" value={productForm.heroSubtitle} onChange={(v) => setProductForm((p) => ({ ...p, heroSubtitle: v }))} />
                <Field label="Badge Text" placeholder="e.g. Enterprise Finance" value={productForm.badgeText} onChange={(v) => setProductForm((p) => ({ ...p, badgeText: v }))} />
                <Field label="CTA Text" placeholder="e.g. Apply for Growth Loan" value={productForm.ctaText} onChange={(v) => setProductForm((p) => ({ ...p, ctaText: v }))} />
                <Field label="Hero Image URL" placeholder="https://..." value={productForm.imageUrl} onChange={(v) => setProductForm((p) => ({ ...p, imageUrl: v }))} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field label="Min Amount (INR)" type="number" value={productForm.minAmount} onChange={(v) => setProductForm((p) => ({ ...p, minAmount: v }))} />
                  <Field label="Max Amount (INR)" type="number" value={productForm.maxAmount} onChange={(v) => setProductForm((p) => ({ ...p, maxAmount: v }))} />
                  <Field label="Min Tenure (Months)" type="number" value={productForm.minTenure} error={productErrors.minTenure} onChange={(v) => { setProductErrors((p) => ({ ...p, minTenure: "" })); setProductForm((p) => ({ ...p, minTenure: v })); }} />
                  <Field label="Max Tenure (Months)" type="number" value={productForm.maxTenure} error={productErrors.maxTenure} onChange={(v) => { setProductErrors((p) => ({ ...p, maxTenure: "" })); setProductForm((p) => ({ ...p, maxTenure: v })); }} />
                  <Field label="Interest Rate (%)" type="number" value={productForm.interestRate} onChange={(v) => setProductForm((p) => ({ ...p, interestRate: v }))} />
                  <Field label="Min Credit Score" type="number" value={productForm.minCreditScore} error={productErrors.minCreditScore} onChange={(v) => { setProductErrors((p) => ({ ...p, minCreditScore: "" })); setProductForm((p) => ({ ...p, minCreditScore: v })); }} />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Market Description</label>
                  <textarea
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    placeholder="Provide details about the loan purpose and target audience..."
                    rows={4}
                    value={productForm.description}
                    onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>

                <Field
                  label="Documents"
                  placeholder={"PAN\nAddress Proof\nBank Statement\nIncome Proof"}
                  value={productForm.documents}
                  onChange={(v) => setProductForm((p) => ({ ...p, documents: v }))}
                  multiline
                  rows={4}
                />
                <Field
                  label="Required Documents"
                  placeholder={"PAN\nAddress Proof\nBank Statement"}
                  value={productForm.requiredDocuments}
                  onChange={(v) => setProductForm((p) => ({ ...p, requiredDocuments: v }))}
                  multiline
                  rows={3}
                />
                <Field
                  label="Process Steps"
                  placeholder={"Calculate\nApply\nVerify\nDisburse"}
                  value={productForm.processSteps}
                  onChange={(v) => setProductForm((p) => ({ ...p, processSteps: v }))}
                  multiline
                  rows={3}
                />
                <Field
                  label="Application Fields"
                  placeholder="Business Name:text:required, GST Number:text:required, Annual Turnover:number:required"
                  value={productForm.applicationFields}
                  onChange={(v) => setProductForm((p) => ({ ...p, applicationFields: v }))}
                />

                <button disabled={processing} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-600 transition-all shadow-lg">
                  {processing ? "Deploying..." : "Publish to Marketplace"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {selectedDisbursementLoan && (
        <div className="fixed inset-0 z-[120] flex items-start sm:items-center justify-center overflow-y-auto bg-slate-900/50 p-4">
          <div className="my-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[2rem] border border-slate-200 bg-white p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Loan Disbursement Review</h3>
            <p className="text-sm text-slate-500 mb-6">Verify bank details, then disburse the loan amount.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <InfoRow label="Applicant" value={selectedDisbursementLoan?.customerName || "-"} />
              <InfoRow label="Loan" value={selectedDisbursementLoan?.loanProductName || "-"} />
              <InfoRow label="Requested Capital" value={money(selectedDisbursementLoan?.requestedAmount)} />
              <InfoRow label="Agreement Status" value={selectedDisbursementLoan?.agreementAccepted ? "Accepted" : "Pending"} />
              <InfoRow label="Approved By (Officer ID)" value={selectedDisbursementLoan?.reviewedBy || "-"} />
              <InfoRow label="Approved By (Officer Name)" value={userById[selectedDisbursementLoan?.reviewedBy || ""]?.username || "-"} />
              <InfoRow label="Beneficiary Type" value={String(selectedDisbursementLoan?.bankBeneficiaryType || "SELF").replaceAll("_", " ")} />
              <InfoRow label="Institution Name" value={selectedDisbursementLoan?.institutionName || "-"} />
              <InfoRow label="Account Holder" value={selectedDisbursementLoan?.bankAccountHolderName || "-"} />
              <InfoRow label="Bank Name" value={selectedDisbursementLoan?.bankName || "-"} />
              <InfoRow label="Account Number" value={maskAccount(selectedDisbursementLoan?.bankAccountNumber)} />
              <InfoRow label="IFSC" value={selectedDisbursementLoan?.bankIfscCode || "-"} />
              <InfoRow label="Branch" value={selectedDisbursementLoan?.bankBranchName || "-"} />
              <InfoRow
                label="Bank Details Status"
                value={String(selectedDisbursementLoan?.bankDetailsStatus || "NOT_SUBMITTED").replaceAll("_", " ")}
              />
            </div>

            <div className="mb-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">
                Reason (required for reject)
              </label>
              <textarea
                rows={3}
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                placeholder="Enter reason when rejecting bank details"
              />
            </div>

            {selectedDisbursementLoan?.bankDetailsRejectionReason ? (
              <p className="mb-4 text-xs font-semibold text-rose-600">
                Last rejection: {selectedDisbursementLoan.bankDetailsRejectionReason}
              </p>
            ) : null}

            <div className="flex flex-wrap justify-end gap-3">
              <button
                onClick={closeDisbursementModal}
                disabled={disbursementActionBusy}
                className="rounded-xl border border-slate-300 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                Close
              </button>
              <button
                onClick={() => verifyBankDetails("REJECTED")}
                disabled={disbursementActionBusy}
                className="rounded-xl border border-rose-300 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-700 hover:bg-rose-50 disabled:opacity-60"
              >
                Reject Bank Details
              </button>
              <button
                onClick={() => verifyBankDetails("APPROVED")}
                disabled={disbursementActionBusy || !selectedDisbursementLoan?.agreementAccepted}
                className="rounded-xl border border-emerald-300 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
              >
                Approve Bank Details
              </button>
              <button
                onClick={disburseLoan}
                disabled={
                  disbursementActionBusy ||
                  !selectedDisbursementLoan?.agreementAccepted ||
                  String(selectedDisbursementLoan?.bankDetailsStatus || "").toUpperCase() !== "APPROVED"
                }
                className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-700 hover:border-emerald-600 disabled:opacity-60"
              >
                Disburse Loan
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalShell>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-center gap-2 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${active ? "bg-white text-emerald-700 shadow-md scale-[1.02]" : "text-slate-400 hover:text-slate-600"}`}>
      {icon} {label}
    </button>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", multiline = false, rows = 3, error }) {
  return (
    <div>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`w-full rounded-xl border bg-slate-50/50 px-4 py-2.5 text-sm outline-none transition-all ${error ? "border-rose-400 focus:ring-2 focus:ring-rose-200" : "border-slate-200 focus:ring-2 focus:ring-emerald-500/20"}`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl border bg-slate-50/50 px-4 py-2.5 text-sm outline-none transition-all ${error ? "border-rose-400 focus:ring-2 focus:ring-rose-200" : "border-slate-200 focus:ring-2 focus:ring-emerald-500/20"}`}
        />
      )}
      {error ? <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value || "-"}</p>
    </div>
  );
}
