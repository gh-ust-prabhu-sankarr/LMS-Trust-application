import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, IndianRupee, ShieldCheck, Upload, FileText, CheckCircle2, AlertTriangle, XCircle, CloudUpload } from "lucide-react";
import Navbar from "../../../components/navbar/Navbar.jsx";
import BackgroundCanvas from "../../../components/layout/BackgroundCanvas.jsx";
import { customerApi, fileApi, loanApi, productApi, unwrap } from "../../../api/domainApi.js";
import { DEFAULT_LOANS, mergeLoansWithDefaults } from "../../../utils/loanCatalog.js";
import { getFriendlyError } from "../../../utils/errorMessage.js";

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

const computeEstimatedEmi = (amount, annualRatePercent, tenureYears) => {
  const principal = Number(amount);
  const rate = Number(annualRatePercent);
  const years = Number(tenureYears);
  const months = Math.max(1, Math.round(years * 12));
  if (!Number.isFinite(principal) || principal <= 0) return 0;
  if (!Number.isFinite(rate) || rate <= 0) return principal / months;
  const monthlyRate = rate / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * factor) / (factor - 1);
};

const ALLOWED_DOC_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_DOC_SIZE_BYTES = 10 * 1024 * 1024;

const formatFileSize = (bytes) => {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

const getLoanApplicationErrorMessage = (err) => {
  const rawMessage = String(err?.response?.data?.message || err?.message || "").trim();
  const lower = rawMessage.toLowerCase();

  if (
    lower.includes("emi") &&
    lower.includes("40%") &&
    lower.includes("monthly income")
  ) {
    return "Application rejected: your requested loan amount is too high for your current income eligibility. Please reduce the amount or increase tenure and try again.";
  }

  if (lower.includes("monthly income must be available")) {
    return "Please update your income details in profile before applying for a loan.";
  }

  return getFriendlyError(err, "Loan application failed.");
};

const resolveUploadDisplayName = (docName, file) =>
  String(docName || "").trim() || String(file?.name || "").trim() || "Loan Document";

export default function LoanApplication() {
  const navigate = useNavigate();
  const { slug = "" } = useParams();
  const { state } = useLocation();

  const [loans, setLoans] = useState(DEFAULT_LOANS);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({});
  const [documents, setDocuments] = useState({});
  const [documentErrors, setDocumentErrors] = useState({});
  const [dragOverDoc, setDragOverDoc] = useState("");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [tenureYears, setTenureYears] = useState("");
  const [modal, setModal] = useState({ open: false, title: "Notice", message: "", onClose: null });
  const [termsOpen, setTermsOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsAcceptedName, setTermsAcceptedName] = useState("");
  const [termsNameError, setTermsNameError] = useState("");

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
  const applicationFields = useMemo(
    () =>
      (activeLoan?.applicationFields || []).filter((field) => {
        const key = String(field?.key || "").toLowerCase();
        const label = String(field?.label || "").toLowerCase();
        return !key.includes("income") && !label.includes("income");
      }),
    [activeLoan?.applicationFields]
  );
  const requiredDocuments = activeLoan?.requiredDocuments || activeLoan?.documents || [];

  useEffect(() => {
    if (!applicationFields.length) return;
    const initialForm = {};
    for (const field of applicationFields) {
      initialForm[field.key] = "";
    }
    setFormData(initialForm);
    setDocuments({});
    setDocumentErrors({});
    setDragOverDoc("");
  }, [activeLoan?.slug, applicationFields]);

  const { amount: stateAmount = 0, rate = activeLoan?.interestRate || 0, tenure: stateTenure = 0 } = state || {};
  const minTenureYears = Math.max(1, Math.ceil((activeLoan?.minTenure || 12) / 12));
  const maxTenureYears = Math.max(minTenureYears, Math.floor((activeLoan?.maxTenure || 84) / 12));

  useEffect(() => {
    const initialAmount = Number(stateAmount) > 0 ? Number(stateAmount) : Number(activeLoan?.minAmount || 0);
    const initialTenure = Number(stateTenure) > 0 ? Number(stateTenure) : minTenureYears;
    setRequestedAmount(String(Math.round(initialAmount)));
    setTenureYears(String(initialTenure));
  }, [activeLoan?.slug, activeLoan?.minAmount, minTenureYears, stateAmount, stateTenure]);

  const estimatedEmi = useMemo(
    () => computeEstimatedEmi(requestedAmount, rate, tenureYears),
    [requestedAmount, rate, tenureYears]
  );

  const onFieldChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validateAndSetDocument = (docName, file) => {
    if (!file) {
      setDocuments((prev) => ({ ...prev, [docName]: null }));
      setDocumentErrors((prev) => {
        const next = { ...prev };
        delete next[docName];
        return next;
      });
      return;
    }

    if (!ALLOWED_DOC_TYPES.includes(file.type)) {
      setDocuments((prev) => ({ ...prev, [docName]: null }));
      setDocumentErrors((prev) => ({ ...prev, [docName]: "Only PDF, JPEG, and PNG files are allowed." }));
      return;
    }

    if (file.size > MAX_DOC_SIZE_BYTES) {
      setDocuments((prev) => ({ ...prev, [docName]: null }));
      setDocumentErrors((prev) => ({ ...prev, [docName]: "File size exceeds maximum limit of 10MB." }));
      return;
    }

    setDocuments((prev) => ({ ...prev, [docName]: file }));
    setDocumentErrors((prev) => {
      const next = { ...prev };
      delete next[docName];
      return next;
    });
  };

  const validateDocuments = () => {
    for (const doc of requiredDocuments) {
      if (documentErrors[doc]) return false;
    }
    for (const doc of requiredDocuments) {
      if (!documents[doc]) return false;
    }
    return true;
  };

  const uploadedDocumentCount = useMemo(
    () => requiredDocuments.filter((doc) => !!documents[doc]).length,
    [requiredDocuments, documents]
  );

  const showModal = (message, title = "Notice", onClose = null) => {
    setModal({ open: true, title, message, onClose });
  };

  const closeModal = () => {
    const callback = modal.onClose;
    setModal({ open: false, title: "Notice", message: "", onClose: null });
    if (typeof callback === "function") callback();
  };

  const submitLoanApplication = async () => {
    if (!validateDocuments()) {
      if (Object.keys(documentErrors).length > 0) {
        showModal("Please fix document upload errors before submitting.");
      } else {
        showModal("Please upload all required documents.");
      }
      return;
    }
    if (!activeLoan?.id || String(activeLoan.id).startsWith("default-")) {
      showModal("Loan product is not configured in backend yet. Ask admin to create this product first.");
      return;
    }

    const numericAmount = Number(requestedAmount);
    const numericTenureYears = Number(tenureYears);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      showModal("Enter a valid loan amount.");
      return;
    }
    if (numericAmount < Number(activeLoan?.minAmount || 0) || numericAmount > Number(activeLoan?.maxAmount || Number.MAX_SAFE_INTEGER)) {
      showModal(`Loan amount must be between ${toCurrency(activeLoan?.minAmount || 0)} and ${toCurrency(activeLoan?.maxAmount || 0)}.`);
      return;
    }
    if (!Number.isFinite(numericTenureYears) || numericTenureYears < minTenureYears || numericTenureYears > maxTenureYears) {
      showModal(`Tenure must be between ${minTenureYears} and ${maxTenureYears} years.`);
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
        requestedAmount: numericAmount,
        tenure: Math.round(numericTenureYears * 12),
        applicationDetails: Object.fromEntries(
          applicationFields
            .map((field) => [String(field?.label || field?.key || "").trim(), String(formData[field.key] || "").trim()])
            .filter(([label, value]) => label && value)
        ),
      };

      const createRes = await loanApi.create(payload);
      const createdLoan = unwrap(createRes) || createRes?.data;
      const loanId = createdLoan?.id;
      if (!loanId) {
        throw new Error("Loan creation failed. No loan id returned.");
      }

      await Promise.all(
        requiredDocuments.map((docName) => {
          const file = documents[docName];
          const displayName = resolveUploadDisplayName(docName, file);
          return fileApi.upload(file, "LOAN_APPLICATION", loanId, displayName);
        })
      );

      await loanApi.submit(loanId);
      showModal(
        "Application submitted successfully",
        "Success",
        () => navigate("/app")
      );
    } catch (err) {
      showModal(getLoanApplicationErrorMessage(err), "Application Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const openTermsModal = () => {
    setTermsAccepted(false);
    setTermsAcceptedName("");
    setTermsNameError("");
    setTermsOpen(true);
  };

  const closeTermsModal = () => {
    if (submitting) return;
    setTermsOpen(false);
    setTermsAccepted(false);
    setTermsAcceptedName("");
    setTermsNameError("");
  };

  const confirmTermsAndSubmit = async () => {
    if (!termsAccepted) return;
    if (!termsAcceptedName.trim()) {
      setTermsNameError("Please enter your full name.");
      return;
    }
    setTermsNameError("");
    setTermsOpen(false);
    await submitLoanApplication();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    openTermsModal();
  };

  return (
    <section className="relative min-h-screen w-full app-gradient-bg flex items-center justify-center p-6 pt-28 overflow-hidden">
      <Navbar />
      <BackgroundCanvas />

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
            <p className="text-slate-500">Complete all required fields and documents for this loan type.</p>
          </header>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Requested Loan Amount</label>
                <input
                  name="requestedAmount"
                  type="number"
                  min={activeLoan?.minAmount || 0}
                  max={activeLoan?.maxAmount || undefined}
                  required
                  value={requestedAmount}
                  onChange={(e) => setRequestedAmount(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:border-slate-700 focus:ring-1 focus:ring-slate-700 outline-none transition-all"
                />
                <p className="text-[11px] text-slate-400">
                  Allowed: {toCurrency(activeLoan?.minAmount || 0)} to {toCurrency(activeLoan?.maxAmount || 0)}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tenure (Years)</label>
                <input
                  name="tenureYears"
                  type="number"
                  min={minTenureYears}
                  max={maxTenureYears}
                  required
                  value={tenureYears}
                  onChange={(e) => setTenureYears(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:border-slate-700 focus:ring-1 focus:ring-slate-700 outline-none transition-all"
                />
                <p className="text-[11px] text-slate-400">
                  Allowed: {minTenureYears} to {maxTenureYears} years
                </p>
              </div>
            </div>

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
              <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Required Documents</h3>
                    <p className="mt-1 text-xs text-slate-500">Attach all files before submitting your application.</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-slate-600">
                    {uploadedDocumentCount}/{requiredDocuments.length} documents attached
                  </p>
                  {uploadedDocumentCount === requiredDocuments.length ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                      <CheckCircle2 size={14} /> Ready to submit
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                      <AlertTriangle size={14} /> Incomplete
                    </span>
                  )}
                </div>

                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{
                      width: `${requiredDocuments.length ? (uploadedDocumentCount / requiredDocuments.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {requiredDocuments.map((docName, idx) => {
                  const inputId = `loan-doc-${idx}-${String(docName).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
                  return (
                    <div
                      key={docName}
                      className={`rounded-xl border p-3 transition-all ${
                        documentErrors[docName]
                          ? "border-rose-300 bg-rose-50/40"
                          : documents[docName]
                          ? "border-emerald-200 bg-emerald-50/30"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-800">{docName}</span>
                        {documents[docName] ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            <CheckCircle2 size={12} /> Attached
                          </span>
                        ) : null}
                      </div>

                      <label
                        htmlFor={inputId}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragOverDoc(docName);
                        }}
                        onDragLeave={() => setDragOverDoc((prev) => (prev === docName ? "" : prev))}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDragOverDoc("");
                          const droppedFile = e.dataTransfer?.files?.[0] || null;
                          validateAndSetDocument(docName, droppedFile);
                        }}
                        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-3 py-5 text-center transition-all ${
                          dragOverDoc === docName
                            ? "border-cyan-400 bg-cyan-50"
                            : documentErrors[docName]
                            ? "border-rose-300 bg-rose-50"
                            : "border-slate-300 bg-slate-50 hover:border-slate-400"
                        }`}
                      >
                        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-700">
                          <CloudUpload size={18} />
                        </div>
                        <p className="text-xs font-semibold text-slate-800">Drag & drop file here</p>
                        <p className="mt-1 text-[11px] text-slate-500">or click to browse</p>
                        <span className="mt-3 inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-[10px] font-semibold text-white">
                          <Upload size={12} /> Browse File
                        </span>
                        <p className="mt-2 text-[10px] text-slate-500">PDF/JPG/PNG up to 10MB</p>
                      </label>

                      <input
                        id={inputId}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                        onChange={(e) => validateAndSetDocument(docName, e.target.files?.[0] || null)}
                        className="hidden"
                      />

                      {documents[docName] ? (
                        <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                          <div className="min-w-0 flex items-center gap-2 text-xs text-slate-700">
                            <FileText size={14} className="shrink-0" />
                            <span className="truncate font-semibold">{documents[docName].name}</span>
                            <span className="shrink-0 text-slate-500">({formatFileSize(documents[docName].size)})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => validateAndSetDocument(docName, null)}
                            className="ml-3 inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            <XCircle size={12} /> Remove
                          </button>
                        </div>
                      ) : null}

                      {documentErrors[docName] ? (
                        <p className="mt-2 text-xs font-semibold text-rose-600">{documentErrors[docName]}</p>
                      ) : null}
                    </div>
                  );
                })}
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
              <SummaryRow label="Loan Amount" value={toCurrency(requestedAmount)} />
              <div className="grid grid-cols-2 gap-4">
                <SummaryBox label="EMI" value={toCurrency(estimatedEmi)} />
                <SummaryBox label="Tenure" value={`${tenureYears || 0} Years`} />
              </div>
              <div className="flex justify-between items-center px-2">
                <span className="text-xs text-slate-500 font-medium">Estimated Interest Rate</span>
                <span className="text-xs font-bold text-slate-700">{rate}% p.a.</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                EMI calculator is for estimate only. Final terms are decided after verification.
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

      {termsOpen ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900">Loan Terms & Conditions Agreement</h3>
            <p className="mt-1 text-sm text-slate-500">Please review and accept before submitting your loan application.</p>
            <div className="mt-4 max-h-[380px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700 leading-relaxed space-y-3">
              <p>
                By submitting this loan application, I confirm that all personal, financial, and supporting details entered in this form are true, complete, and accurate to the best of my knowledge. I also confirm that all uploaded documents belong to me or to my authorized business entity, and that I am legally permitted to share these records for loan processing, underwriting, compliance, and identity verification purposes.
              </p>
              <p>
                I authorize LMS and its authorized partners, verification agencies, and service providers to validate my KYC information, credit profile, employment or business details, banking history, repayment behavior, and other required records from permitted sources. I understand that this verification process may include checks with internal systems, regulated data providers, and risk control systems, and I provide my consent for such checks throughout the life cycle of this application.
              </p>
              <p>
                I understand that loan approval is subject to lender policy, credit risk evaluation, document validation, and eligibility rules. I acknowledge that submission of this application does not create a guarantee of approval, sanction amount, interest rate, processing timeline, or disbursement. LMS may request additional documents, corrections, or clarifications at any stage before final decision, and any mismatch or unverifiable information may lead to delay, hold, or rejection of the application.
              </p>
              <p>
                I accept that if any information submitted by me is found false, misleading, forged, or materially incomplete, LMS may reject or cancel this application and may take actions required under applicable policy and law. I also consent to receive communication regarding this application, including reminders, verification calls, status updates, and decision notifications via approved channels such as phone, email, SMS, and in-app communication.
              </p>
              <p>
                By entering my name and confirming acceptance below, I provide my digital acknowledgment that I have read, understood, and agreed to these terms and conditions, and I voluntarily proceed with submission of this loan application.
              </p>
            </div>
            <div className="mt-4 space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Full Name (Agreement Signature)</label>
              <input
                type="text"
                value={termsAcceptedName}
                onChange={(e) => {
                  setTermsAcceptedName(e.target.value);
                  if (termsNameError && e.target.value.trim()) setTermsNameError("");
                }}
                placeholder="Enter your full name"
                className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors ${
                  termsNameError ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-emerald-500"
                }`}
              />
              {termsNameError ? <p className="text-xs font-semibold text-rose-600">{termsNameError}</p> : null}
            </div>
            <label className="mt-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-slate-900"
              />
              <span className="text-sm text-slate-700">I agree to the Terms & Conditions.</span>
            </label>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeTermsModal}
                disabled={submitting}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmTermsAndSubmit}
                disabled={submitting || !termsAccepted || !termsAcceptedName.trim()}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Confirm & Submit"}
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

