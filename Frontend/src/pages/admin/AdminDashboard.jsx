import { useEffect, useMemo, useState } from "react";
import PortalShell from "../../components/layout/PortalShell.jsx";
import { adminApi, productApi, unwrap } from "../../api/domainApi.js";
import { parseApplicationFields, slugifyLoanName, upsertLoanPageMeta } from "../../utils/loanCatalog.js";
import { Users, ShieldCheck, Search, ChevronLeft, ChevronRight, UserPlus, PackagePlus, LayoutGrid, ScrollText } from "lucide-react";

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

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("DIRECTORY");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [productForm, setProductForm] = useState(initialProductForm);
  const [officerForm, setOfficerForm] = useState(initialOfficerForm);
  const [processing, setProcessing] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [txCustomerPage, setTxCustomerPage] = useState(1);
  const [txPage, setTxPage] = useState(1);
  const [txSearch, setTxSearch] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilters, setAuditFilters] = useState({ userId: "", entityType: "", limit: 50 });
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [auditPage, setAuditPage] = useState(1);

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

  const loadTransactionsForCustomer = async (customer) => {
    if (!customer?.id) return;
    setTxLoading(true);
    setTxError("");
    try {
      const res = await adminApi.getAuditByUser(customer.id);
      const audits = unwrap(res) || res?.data || [];
      const rows = audits
        .filter((a) => {
          const details = String(a?.details || "").toLowerCase();
          const isRepayment = details.includes("repayment of");
          const isCheckoutEvent = details.includes("checkout session");
          return isRepayment && !isCheckoutEvent;
        })
        .map((a) => ({
          id: `${customer?.id || "u"}-${a?.id || a?.timestamp || Math.random()}`,
          amount: parseAuditAmount(a?.details),
          details: a?.details || "-",
          transactionRef: "-",
          timestamp: a?.timestamp || null,
        }));

      rows.sort((a, b) => {
        const ta = a?.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tb = b?.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tb - ta;
      });

      setSelectedCustomer(customer);
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
      entityType: params.entityType || undefined,
      limit: Number(params.limit) || 50,
    };

    setAuditFilters((prev) => ({ ...prev, ...params, limit: cleanParams.limit }));
    setAuditLoading(true);
    setAuditError("");
    try {
      const res = await adminApi.getAuditLogs(cleanParams);
      const logs = unwrap(res) || res?.data || [];
      setAuditLogs(logs);
      setAuditPage(1);
    } catch (err) {
      setAuditError(err?.response?.data?.message || err?.message || "Failed to fetch audit logs.");
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "TRANSACTIONS") return;
    setTxError("");
    setTransactions([]);
    setSelectedCustomer(null);
    setTxPage(1);
    setTxCustomerPage(1);
    setTxSearch("");
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "AUDIT") return;
    loadAuditLogs();
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
  const customerUsers = useMemo(
    () => users.filter((u) => String(u?.role || "").toUpperCase() === "CUSTOMER"),
    [users]
  );
  const filteredTxCustomers = useMemo(() => {
    const q = txSearch.trim().toLowerCase();
    if (!q) return customerUsers;
    return customerUsers.filter((u) =>
      String(u?.username || "").toLowerCase().includes(q) ||
      String(u?.email || "").toLowerCase().includes(q)
    );
  }, [customerUsers, txSearch]);
  const totalCustomerPages = Math.ceil(filteredTxCustomers.length / txItemsPerPage);
  const paginatedCustomers = filteredTxCustomers.slice((txCustomerPage - 1) * txItemsPerPage, txCustomerPage * txItemsPerPage);
  const totalTxPages = Math.ceil((transactions.length || 0) / txItemsPerPage);
  const paginatedTransactions = useMemo(() => {
    const start = (txPage - 1) * txItemsPerPage;
    return transactions.slice(start, start + txItemsPerPage);
  }, [transactions, txPage]);
  const totalAuditPages = Math.ceil((auditLogs.length || 0) / auditItemsPerPage);
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
    setTxCustomerPage(1);
  }, [txSearch]);

  const handleToggleUser = async (user) => {
    if (String(user?.role || "").toUpperCase() === "ADMIN") {
      alert("Admin accounts cannot be suspended.");
      return;
    }
    try {
      await adminApi.toggleUserStatus(user.id, !user.active);
      loadData();
    } catch {
      alert("Action failed");
    }
  };

  const handleCreateOfficer = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await adminApi.createOfficer(officerForm);
      setOfficerForm(initialOfficerForm);
      setActiveTab("DIRECTORY");
      loadData();
      alert("Staff account created.");
    } catch {
      alert("Failed to create officer.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
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
      alert("Product published successfully.");
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
      <div className="mb-10 flex space-x-1 rounded-2xl bg-slate-200/50 p-1.5 max-w-2xl mx-auto shadow-inner">
        <TabButton active={activeTab === "DIRECTORY"} onClick={() => setActiveTab("DIRECTORY")} icon={<LayoutGrid size={16} />} label="User Registry" />
        <TabButton active={activeTab === "TRANSACTIONS"} onClick={() => setActiveTab("TRANSACTIONS")} icon={<Users size={16} />} label="Transactions" />
        <TabButton active={activeTab === "AUDIT"} onClick={() => setActiveTab("AUDIT")} icon={<ScrollText size={16} />} label="Audit Logs" />
        <TabButton active={activeTab === "OFFICER"} onClick={() => setActiveTab("OFFICER")} icon={<UserPlus size={16} />} label="Add Officer" />
        <TabButton active={activeTab === "PRODUCT"} onClick={() => setActiveTab("PRODUCT")} icon={<PackagePlus size={16} />} label="Issue Product" />
      </div>

      <div className="max-w-4xl mx-auto">
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
                  placeholder="Search accounts..."
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
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Entity Type</label>
                <input
                  value={auditFilters.entityType}
                  onChange={(e) => setAuditFilters((p) => ({ ...p, entityType: e.target.value.toUpperCase() }))}
                  placeholder="LOAN_APPLICATION, FILE, etc."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
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
                    onClick={() => loadAuditLogs({ userId: "", entityType: "", limit: 50 })}
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
                <Field label="Staff Username" placeholder="officer_01" value={officerForm.username} onChange={(v) => setOfficerForm((p) => ({ ...p, username: v }))} />
                <Field label="Official Email" placeholder="staff@trumio.com" type="email" value={officerForm.email} onChange={(v) => setOfficerForm((p) => ({ ...p, email: v }))} />
                <Field label="Temporary Password" type="password" value={officerForm.password} onChange={(v) => setOfficerForm((p) => ({ ...p, password: v }))} />
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
                onClick={() => selectedCustomer && loadTransactionsForCustomer(selectedCustomer)}
                disabled={txLoading || !selectedCustomer}
                className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-300 hover:bg-slate-100 disabled:opacity-60"
              >
                {txLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {txError && (
              <p className="px-6 pt-4 text-sm font-semibold text-rose-600">{txError}</p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
              <div className="lg:col-span-4 border-r border-slate-100">
                <div className="px-6 py-4 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Customers
                </div>
                <div className="px-6 py-3 border-b border-slate-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                      type="text"
                      value={txSearch}
                      onChange={(e) => setTxSearch(e.target.value)}
                      placeholder="Search customer..."
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
                <div className="divide-y divide-slate-100">
                  {paginatedCustomers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => loadTransactionsForCustomer(u)}
                      className={`w-full text-left px-6 py-4 transition-colors ${
                        selectedCustomer?.id === u.id ? "bg-emerald-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-sm font-bold text-slate-800">{u.username}</div>
                      <div className="text-[10px] text-slate-400">{u.email}</div>
                    </button>
                  ))}
                  {!paginatedCustomers.length && (
                    <div className="px-6 py-8 text-sm text-slate-500">No matching customers.</div>
                  )}
                </div>
                {totalCustomerPages > 1 && (
                  <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Page {txCustomerPage} of {totalCustomerPages}
                    </p>
                    <div className="flex gap-2">
                      <button
                        disabled={txCustomerPage === 1}
                        onClick={() => setTxCustomerPage((p) => p - 1)}
                        className="p-2 rounded-lg border bg-white disabled:opacity-30 hover:bg-slate-50 transition-all"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        disabled={txCustomerPage >= totalCustomerPages}
                        onClick={() => setTxCustomerPage((p) => p + 1)}
                        className="p-2 rounded-lg border bg-white disabled:opacity-30 hover:bg-slate-50 transition-all"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:col-span-8">
                {!selectedCustomer ? (
                  <div className="p-10 text-center text-sm text-slate-500">Select a customer to view transactions.</div>
                ) : txLoading ? (
                  <div className="p-6 text-sm text-slate-500">Loading transactions...</div>
                ) : transactions.length ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-[10px] uppercase tracking-widest text-slate-400 font-black border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-4">Date & Time</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Transaction Ref</th>
                            <th className="px-6 py-4">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedTransactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 text-sm text-slate-700">{formatDateTime(tx.timestamp)}</td>
                              <td className="px-6 py-4 text-sm font-semibold text-slate-800">{money(tx.amount)}</td>
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
                  <div className="p-10 text-center text-sm text-slate-500">No repayment records found for this customer.</div>
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
                <Field label="Product Name" placeholder="e.g. Small Business Growth Fund" value={productForm.name} onChange={(v) => setProductForm((p) => ({ ...p, name: v }))} />
                <Field label="Hero Title" placeholder="Scale your next growth phase." value={productForm.heroTitle} onChange={(v) => setProductForm((p) => ({ ...p, heroTitle: v }))} />
                <Field label="Hero Subtitle" placeholder="Page subtitle shown on EMI screen" value={productForm.heroSubtitle} onChange={(v) => setProductForm((p) => ({ ...p, heroSubtitle: v }))} />
                <Field label="Badge Text" placeholder="e.g. Enterprise Finance" value={productForm.badgeText} onChange={(v) => setProductForm((p) => ({ ...p, badgeText: v }))} />
                <Field label="CTA Text" placeholder="e.g. Apply for Growth Loan" value={productForm.ctaText} onChange={(v) => setProductForm((p) => ({ ...p, ctaText: v }))} />
                <Field label="Hero Image URL" placeholder="https://..." value={productForm.imageUrl} onChange={(v) => setProductForm((p) => ({ ...p, imageUrl: v }))} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field label="Min Amount (INR)" type="number" value={productForm.minAmount} onChange={(v) => setProductForm((p) => ({ ...p, minAmount: v }))} />
                  <Field label="Max Amount (INR)" type="number" value={productForm.maxAmount} onChange={(v) => setProductForm((p) => ({ ...p, maxAmount: v }))} />
                  <Field label="Min Tenure (Months)" type="number" value={productForm.minTenure} onChange={(v) => setProductForm((p) => ({ ...p, minTenure: v }))} />
                  <Field label="Max Tenure (Months)" type="number" value={productForm.maxTenure} onChange={(v) => setProductForm((p) => ({ ...p, maxTenure: v }))} />
                  <Field label="Interest Rate (%)" type="number" value={productForm.interestRate} onChange={(v) => setProductForm((p) => ({ ...p, interestRate: v }))} />
                  <Field label="Min Credit Score" type="number" value={productForm.minCreditScore} onChange={(v) => setProductForm((p) => ({ ...p, minCreditScore: v }))} />
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
    </PortalShell>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? "bg-white text-emerald-700 shadow-md scale-105" : "text-slate-400 hover:text-slate-600"}`}>
      {icon} {label}
    </button>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", multiline = false, rows = 3 }) {
  return (
    <div>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
        />
      )}
    </div>
  );
}
