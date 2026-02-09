// src/pages/dashboard/AdminDashboard.jsx
import { useEffect, useState, useMemo } from "react";
import PortalShell from "../../components/layout/PortalShell.jsx";
import { adminApi, productApi, unwrap } from "../../api/domainApi.js";
import {
  Users, ShieldCheck, Search, ChevronLeft,
  ChevronRight, UserPlus, PackagePlus,
  LayoutGrid, ShieldAlert, Key
} from "lucide-react";

const initialProductForm = {
  name: "",
  description: "",
  minAmount: "",
  maxAmount: "",
  minTenure: "",
  maxTenure: "",
  interestRate: "",
  minCreditScore: ""
};

const initialOfficerForm = { username: "", email: "", password: "" };

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("DIRECTORY");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  // Pagination & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [userPage, setUserPage] = useState(1);
  const itemsPerPage = 4;

  // Forms
  const [productForm, setProductForm] = useState(initialProductForm);
  const [officerForm, setOfficerForm] = useState(initialOfficerForm);
  const [processing, setProcessing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const uRes = await adminApi.getUsers();
      setUsers(unwrap(uRes) || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  // Filtered Users Logic
  const filteredUsers = useMemo(() => {
    return users.filter(u =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const totalUserPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice((userPage - 1) * itemsPerPage, userPage * itemsPerPage);

  const handleToggleUser = async (user) => {
    try {
      await adminApi.toggleUserStatus(user.id, !user.active);
      loadData();
    } catch (err) { alert("Action failed"); }
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
    } catch (err) { alert("Failed to create officer."); }
    finally { setProcessing(false); }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const payload = {
        ...productForm,
        active: true,
        minAmount: parseFloat(productForm.minAmount),
        maxAmount: parseFloat(productForm.maxAmount),
        interestRate: parseFloat(productForm.interestRate),
        minTenure: parseInt(productForm.minTenure),
        maxTenure: parseInt(productForm.maxTenure),
        minCreditScore: parseInt(productForm.minCreditScore)
      };
      await productApi.create(payload);
      setProductForm(initialProductForm);
      alert("Product published successfully.");
    } finally { setProcessing(false); }
  };

  if (loading) return (
    <PortalShell title="Admin">
      <div className="p-20 text-center animate-pulse text-slate-400 font-bold text-xs tracking-widest uppercase">
        Establishing Secure Connection...
      </div>
    </PortalShell>
  );

  return (
    <PortalShell title="Admin Command Center" subtitle="Manage system access and loan instrument deployment.">

      {/* TABS NAVIGATION */}
      <div className="mb-10 flex space-x-1 rounded-2xl bg-slate-200/50 p-1.5 max-w-2xl mx-auto shadow-inner">
        <TabButton active={activeTab === "DIRECTORY"} onClick={() => setActiveTab("DIRECTORY")} icon={<LayoutGrid size={16} />} label="User Registry" />
        <TabButton active={activeTab === "OFFICER"} onClick={() => setActiveTab("OFFICER")} icon={<UserPlus size={16} />} label="Add Officer" />
        <TabButton active={activeTab === "PRODUCT"} onClick={() => setActiveTab("PRODUCT")} icon={<PackagePlus size={16} />} label="Issue Product" />
      </div>

      <div className="max-w-4xl mx-auto">

        {/* TAB 1: USER REGISTRY ONLY */}
        {activeTab === "DIRECTORY" && (
          <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg"><Users size={20} /></div>
                <h3 className="font-bold text-slate-900">System Registry</h3>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text" placeholder="Search accounts..." value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setUserPage(1); }}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
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
                  {paginatedUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs uppercase ${u.role === 'OFFICER' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>{u.username[0]}</div>
                          <div>
                              <div className="text-sm font-bold text-slate-800">{u.username}</div>
                              <div className="text-[10px] text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${u.role === 'OFFICER' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>{u.role}</span>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <button onClick={() => handleToggleUser(u)} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${u.active ? 'border-rose-100 text-rose-500 hover:bg-rose-50' : 'border-emerald-100 text-emerald-600 hover:bg-emerald-50'}`}>
                          {u.active ? 'Suspend' : 'Activate'}
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
                <button disabled={userPage === 1} onClick={() => setUserPage(p => p - 1)} className="p-2 rounded-lg border bg-white disabled:opacity-30 hover:bg-slate-50 transition-all"><ChevronLeft size={16}/></button>
                <button disabled={userPage >= totalUserPages} onClick={() => setUserPage(p => p + 1)} className="p-2 rounded-lg border bg-white disabled:opacity-30 hover:bg-slate-50 transition-all"><ChevronRight size={16}/></button>
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: CREATE OFFICER */}
        {activeTab === "OFFICER" && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm max-w-xl mx-auto">
               <div className="mb-8 flex items-center gap-4">
                  <div className="h-14 w-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600"><ShieldCheck size={32} /></div>
                  <div><h3 className="text-xl font-bold text-slate-900">Provision Staff</h3><p className="text-sm text-slate-500">Assign Credit Officer permissions.</p></div>
               </div>
               <form onSubmit={handleCreateOfficer} className="space-y-5">
                  <Field label="Staff Username" placeholder="officer_01" value={officerForm.username} onChange={v => setOfficerForm(p => ({...p, username: v}))} />
                  <Field label="Official Email" placeholder="staff@trumio.com" type="email" value={officerForm.email} onChange={v => setOfficerForm(p => ({...p, email: v}))} />
                  <Field label="Temporary Password" type="password" value={officerForm.password} onChange={v => setOfficerForm(p => ({...p, password: v}))} />
                  <button disabled={processing} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-amber-600 transition-all">Create Officer Account</button>
               </form>
            </div>
          </div>
        )}

        {/* TAB 3: CREATE PRODUCT (NO PREVIEW CARD) */}
        {activeTab === "PRODUCT" && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <div className="mb-8 flex items-center gap-4">
                <div className="h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600"><PackagePlus size={24} /></div>
                <div><h3 className="text-xl font-bold text-slate-900">Loan Instrument Setup</h3><p className="text-sm text-slate-500">Configure parameters for the loan marketplace.</p></div>
              </div>
              <form onSubmit={handleCreateProduct} className="space-y-6">
                <Field label="Product Name" placeholder="e.g. Small Business Growth Fund" value={productForm.name} onChange={v => setProductForm(p => ({...p, name: v}))} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <Field label="Min Amount (₹)" type="number" value={productForm.minAmount} onChange={v => setProductForm(p => ({...p, minAmount: v}))} />
                   <Field label="Max Amount (₹)" type="number" value={productForm.maxAmount} onChange={v => setProductForm(p => ({...p, maxAmount: v}))} />
                   <Field label="Min Tenure (Months)" type="number" value={productForm.minTenure} onChange={v => setProductForm(p => ({...p, minTenure: v}))} />
                   <Field label="Max Tenure (Months)" type="number" value={productForm.maxTenure} onChange={v => setProductForm(p => ({...p, maxTenure: v}))} />
                   <Field label="Interest Rate (%)" type="number" value={productForm.interestRate} onChange={v => setProductForm(p => ({...p, interestRate: v}))} />
                   <Field label="Min Credit Score" type="number" value={productForm.minCreditScore} onChange={v => setProductForm(p => ({...p, minCreditScore: v}))} />
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Market Description</label>
                  <textarea
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    placeholder="Provide details about the loan purpose and target audience..." rows={4}
                    value={productForm.description} onChange={e => setProductForm(p => ({...p, description: e.target.value}))}
                  />
                </div>

                <button disabled={processing} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-600 transition-all shadow-lg">
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

// SHARED COMPONENTS
function TabButton({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? "bg-white text-indigo-600 shadow-md scale-105" : "text-slate-400 hover:text-slate-600"}`}>
      {icon} {label}
    </button>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <div>
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block">{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
      />
    </div>
  );
}