import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, IndianRupee, ShieldCheck, Upload } from "lucide-react";
import Navbar from "../../../components/navbar/Navbar.jsx";
import { customerApi, fileApi, loanApi, productApi, unwrap } from "../../../api/domainApi.js";
import { DEFAULT_LOANS, mergeLoansWithDefaults } from "../../../utils/loanCatalog.js";

const toCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const toFieldInputType = (type = "text") => {
  if (type === "textarea") return "textarea";
  if (type === "number") return "number";
  if (type === "date") return "date";
  if (type === "email") return "email";
  if (type === "tel") return "tel";
  return "text";
};

export default function LoanApplication() {
  const navigate = useNavigate();
  const { slug = "" } = useParams();
  const { state } = useLocation();

  const [loans, setLoans] = useState(DEFAULT_LOANS);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({});
  const [documents, setDocuments] = useState({});
  const [modal, setModal] = useState({ open: false, title: "Notice", message: "", onClose: null });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await productApi.getAll();
        const data = unwrap(res) || [];
        setLoans(mergeLoansWithDefaults(Array.isArray(data) ? data : [data]));
      } catch {
        setLoans(mergeLoansWithDefaults([]));
      }
    };
    load();
  }, []);

  const activeLoan = useMemo(() => loans.find((loan) => loan.slug === slug) || loans[0], [loans, slug]);
  const applicationFields = activeLoan?.applicationFields || [];
  const requiredDocuments = activeLoan?.requiredDocuments || activeLoan?.documents || [];

  useEffect(() => {
    if (!applicationFields.length) return;
    const initialForm = {};
    for (const field of applicationFields) {
      initialForm[field.key] = "";
    }
    setFormData(initialForm);
    setDocuments({});
  }, [activeLoan?.slug, applicationFields]);

  const {
    amount = activeLoan?.minAmount || 0,
    rate = activeLoan?.interestRate || 0,
    tenure = Math.max(1, Math.round((activeLoan?.minTenure || 12) / 12)),
    emi = 0,
  } = state || {};

  const onFieldChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const onDocumentChange = (docName, file) => {
    setDocuments((prev) => ({ ...prev, [docName]: file || null }));
  };

  const validateDocuments = () => {
    for (const doc of requiredDocuments) {
      if (!documents[doc]) return false;
    }
    return true;
  };

  const showModal = (message, title = "Notice", onClose = null) => {
    setModal({ open: true, title, message, onClose });
  };

  const closeModal = () => {
    const callback = modal.onClose;
    setModal({ open: false, title: "Notice", message: "", onClose: null });
    if (typeof callback === "function") callback();
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!validateDocuments()) {
      showModal("Please upload all required documents.");
      return;
    }
    if (!activeLoan?.id || String(activeLoan.id).startsWith("default-")) {
      showModal("Loan product is not configured in backend yet. Ask admin to create this product first.");
      return;
    }

    setSubmitting(true);
    try {
      const profileRes = await customerApi.getMyProfile();
      const profile = unwrap(profileRes) || profileRes?.data;
      const kycStatus = String(profile?.kycStatus || "").toUpperCase();
      if (kycStatus !== "APPROVED" && kycStatus !== "VERIFIED") {
        showModal("Please verify KYC before applying for a loan.", "KYC Required", () => navigate("/app"));
        return;
      }

      const payload = {
        loanProductId: activeLoan.id,
        requestedAmount: Number(amount),
        tenure: Number(tenure) * 12,
      };

      const createRes = await loanApi.create(payload);
      const createdLoan = unwrap(createRes) || createRes?.data;
      const loanId = createdLoan?.id;
      if (!loanId) {
        throw new Error("Loan creation failed. No loan id returned.");
      }

      await Promise.all(
        requiredDocuments.map((docName) => fileApi.upload(documents[docName], "LOAN_APPLICATION", loanId))
      );

      await loanApi.submit(loanId);
      showModal(
        `${activeLoan?.name || "Loan"} application submitted to loan officer successfully.`,
        "Success",
        () => navigate("/app")
      );
    } catch (err) {
      showModal(err?.response?.data?.message || err?.message || "Loan application failed.", "Application Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="relative min-h-screen w-full bg-[#F8FAFC] flex items-center justify-center p-6 pt-28">
      <Navbar />
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(#0F172A 1px, transparent 1px)", backgroundSize: "30px 30px" }}
      />

      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7 flex flex-col justify-center">
          <button
            onClick={() => navigate(`/loan/${activeLoan?.slug || slug}`)}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors mb-8 text-sm font-medium"
          >
            <ArrowLeft size={16} /> Back to calculator
          </button>

          <header className="mb-10">
            <h1 className="text-3xl font-serif font-semibold text-slate-900 mb-2">{activeLoan?.name} Application</h1>
            <p className="text-slate-500">Fields and documents are configured by admin for this loan type.</p>
          </header>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {applicationFields.map((field) => (
                <DynamicField
                  key={field.key}
                  field={field}
                  value={formData[field.key] || ""}
                  onChange={onFieldChange}
                />
              ))}
            </div>

            <div className="space-y-3">
              <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Required Documents</h3>
              <div className="space-y-3">
                {requiredDocuments.map((docName) => (
                  <label
                    key={docName}
                    className="flex flex-col gap-2 p-4 rounded-lg border border-slate-200 bg-white"
                  >
                    <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Upload size={14} />
                      {docName}
                    </span>
                    <input
                      type="file"
                      required
                      onChange={(e) => onDocumentChange(docName, e.target.files?.[0] || null)}
                      className="text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-slate-700"
                    />
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full md:w-fit px-12 py-4 bg-slate-900 text-white font-bold uppercase text-[11px] tracking-[0.2em] rounded-md shadow-lg hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-70"
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </button>
          </form>
        </div>

        <div className="lg:col-span-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 sticky top-12 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                <IndianRupee className="text-slate-700" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Application Summary</h3>
                <p className="text-[11px] text-emerald-600 font-bold uppercase tracking-tight flex items-center gap-1">
                  <ShieldCheck size={12} /> Estimated Terms
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <SummaryRow label="Loan Amount" value={toCurrency(amount)} />
              <div className="grid grid-cols-2 gap-4">
                <SummaryBox label="EMI" value={toCurrency(emi)} />
                <SummaryBox label="Tenure" value={`${tenure} Years`} />
              </div>
              <div className="flex justify-between items-center px-2">
                <span className="text-xs text-slate-500 font-medium">Estimated Interest Rate</span>
                <span className="text-xs font-bold text-slate-700">{rate}% p.a.</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Final interest rate and EMI are fixed by backend using your credit score.
              </p>
            </div>

            <div className="mt-10 pt-6 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                Our team will connect with you in 24 business hours for verification.
              </p>
            </div>
          </div>
        </div>
      </div>

      {modal.open ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">{modal.title}</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{modal.message}</p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function DynamicField({ field, value, onChange }) {
  const inputType = toFieldInputType(field.type);

  if (inputType === "textarea") {
    return (
      <div className="space-y-2 md:col-span-2">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{field.label}</label>
        <textarea
          name={field.key}
          required={field.required !== false}
          value={value}
          onChange={onChange}
          rows={3}
          className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:border-slate-700 focus:ring-1 focus:ring-slate-700 outline-none transition-all"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{field.label}</label>
      <input
        name={field.key}
        required={field.required !== false}
        type={inputType}
        value={value}
        onChange={onChange}
        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:border-slate-700 focus:ring-1 focus:ring-slate-700 outline-none transition-all"
      />
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between items-end border-b border-slate-50 pb-4">
      <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">{label}</span>
      <span className="text-xl font-black text-slate-900">{value}</span>
    </div>
  );
}

function SummaryBox({ label, value }) {
  return (
    <div className="p-4 bg-slate-50 rounded-xl">
      <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">{label}</span>
      <span className="text-sm font-bold text-slate-900">{value}</span>
    </div>
  );
}


