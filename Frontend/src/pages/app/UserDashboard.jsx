import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PortalShell from "../../components/layout/PortalShell.jsx";
import { customerApi, kycApi, loanApi, repaymentApi } from "../../api/domainApi.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useEmiSchedule } from "../../hooks/useEmiSchedule.jsx";
import { getFriendlyError } from "../../utils/errorMessage.js";
import { usePopup } from "../../components/ui/PopupProvider.jsx";
import { maskAadhaarNumber, maskPanNumber } from "../../utils/masking.js";
import { 
  User, ShieldCheck, Landmark, ReceiptIndianRupee, ChevronRight, 
  ArrowRight, FileText, Calendar, CheckCircle2, ChevronDown,
  AlertCircle, ChevronLeft, UploadCloud
} from "lucide-react";

// --- UTILITIES ---
const money = (n) => {
  const value = Number(n);
  return Number.isFinite(value)
    ? value.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
    : "-";
};

const annualFromMonthly = (monthly) => {
  const value = Number(monthly);
  return Number.isFinite(value) ? value * 12 : "";
};

const monthlyFromAnnual = (annual) => {
  const value = Number(annual);
  return Number.isFinite(value) ? value / 12 : NaN;
};
const legalFullNameRx = /^(?=.*[A-Za-z])[A-Za-z. ]+$/;
const addressAllowedRx = /^[A-Za-z0-9\s,/#-]+$/;
const sanitizeLegalName = (value = "") => value.replace(/[^A-Za-z.\s]/g, "");
const EMPLOYMENT_OPTIONS = [
  { value: "SALARIED", label: "Salaried" },
  { value: "SELF_EMPLOYED", label: "Self Employed" },
  { value: "BUSINESS_OWNER", label: "Business Owner" },
  { value: "BUSINESS", label: "Business" },
  { value: "STUDENT", label: "Student" },
  { value: "UNEMPLOYED", label: "Unemployed" },
  { value: "RETIRED", label: "Retired" },
];
const EMPLOYMENT_LABEL_BY_VALUE = Object.fromEntries(EMPLOYMENT_OPTIONS.map((opt) => [opt.value, opt.label]));
const EMPLOYMENT_ALIAS = {
  SELFEMPLOYED: "SELF_EMPLOYED",
  SELF_EMPLOYED: "SELF_EMPLOYED",
  BUSINESSOWNER: "BUSINESS_OWNER",
  BUSINESS_OWNER: "BUSINESS_OWNER",
  BUSINESSMAN: "BUSINESS_OWNER",
  BUSINESSWOMAN: "BUSINESS_OWNER",
};
const normalizeEmploymentType = (value = "") => {
  const normalized = String(value || "").trim().toUpperCase().replace(/\s+/g, "_");
  if (!normalized) return "";
  return EMPLOYMENT_ALIAS[normalized] || normalized;
};
const getEmploymentLabel = (value = "") => {
  const normalized = normalizeEmploymentType(value);
  return EMPLOYMENT_LABEL_BY_VALUE[normalized] || normalized.replaceAll("_", " ");
};
const loanDropdownLabel = (loan) => {
  const name = loan?.loanProductName || "Loan";
  const amount = money(loan?.requestedAmount);
  return `${name} - ${amount}`;
};
const isEducationLoan = (loan) =>
  String(loan?.loanProductName || "").toLowerCase().includes("education");
const normalizeName = (value = "") =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
const normalizeBankStatus = (value = "") => String(value || "NOT_SUBMITTED").toUpperCase();
const maskAccount = (value = "") => {
  const text = String(value || "");
  if (text.length <= 4) return text || "-";
  return `${"*".repeat(Math.max(0, text.length - 4))}${text.slice(-4)}`;
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

const txStatusMeta = (tx) => {
  const rawStatus =
    tx?.txStatus ||
    tx?.status ||
    tx?.paymentStatus ||
    tx?.transactionStatus ||
    tx?.stripeStatus ||
    "";
  const s = String(rawStatus || "").toUpperCase();
  if (["PAID", "SUCCESS", "COMPLETED", "SETTLED"].includes(s)) {
    return { label: "SUCCESS", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" };
  }
  if (["FAILED", "FAILURE", "CANCELLED", "CANCELED"].includes(s)) {
    return { label: "FAILED", cls: "bg-rose-50 text-rose-800 border-rose-200" };
  }
  if (s === "PENDING" || s === "PROCESSING") {
    return { label: "PENDING", cls: "bg-amber-50 text-amber-800 border-amber-200" };
  }

  const hasAmount = Number(tx?.amount || 0) > 0;
  const hasPaymentDate = !!tx?.paymentDate;
  if (hasAmount && hasPaymentDate) {
    return { label: "SUCCESS", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" };
  }

  return { label: "PENDING", cls: "bg-amber-50 text-amber-800 border-amber-200" };
};

const isPendingStatus = (tx) => {
  const rawStatus =
    tx?.txStatus ||
    tx?.status ||
    tx?.paymentStatus ||
    tx?.transactionStatus ||
    tx?.stripeStatus ||
    "";
  const s = String(rawStatus || "").toUpperCase();
  return s === "PENDING" || s === "PROCESSING" || s === "";
};

export default function UserDashboard() {
  const { user } = useAuth();
  const { showPopup } = usePopup();
  const registeredName = String(user?.username || "").trim();
  const registeredPhone = String(user?.phone || "").trim();
  
  // --- UI & DATA STATE ---
  const [activeTab, setActiveTab] = useState("profile"); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    phone: "",
    address: "",
    employmentType: "",
    annualIncome: "",
  });
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileFieldErrors, setProfileFieldErrors] = useState({});
  const [profileSuccess, setProfileSuccess] = useState("");
  const [myLoans, setMyLoans] = useState([]);
  const [myTransactions, setMyTransactions] = useState([]);
  const [txPage, setTxPage] = useState(1);
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState("");
  const [activeLoanId, setActiveLoanId] = useState("");
  const { schedule, actionBusy, actionError, payInstallment, payCustomAmount } = useEmiSchedule(activeLoanId);
  const [bulkAmount, setBulkAmount] = useState("");
  const [bulkInstallmentCount, setBulkInstallmentCount] = useState(null);
  const [myKyc, setMyKyc] = useState(null);
  const [agreementLoan, setAgreementLoan] = useState(null);
  const [agreementName, setAgreementName] = useState("");
  const [agreementBusy, setAgreementBusy] = useState(false);
  const [agreementError, setAgreementError] = useState("");
  const [bankDetailsLoan, setBankDetailsLoan] = useState(null);
  const [bankDetailsForm, setBankDetailsForm] = useState({
    beneficiaryType: "SELF",
    institutionName: "",
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    branchName: "",
  });
  const [bankDetailsBusy, setBankDetailsBusy] = useState(false);
  const [bankDetailsError, setBankDetailsError] = useState("");
  const [bankDetailsFieldErrors, setBankDetailsFieldErrors] = useState({});

  // --- PAGINATION STATE ---
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // --- FORM STATES ---
  const [editing, setEditing] = useState(false);
  const [kycEditing, setKycEditing] = useState(false);
  const [panFile, setPanFile] = useState(null);
  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [kycForm, setKycForm] = useState({ fullName: "", dob: "", panNumber: "", aadhaarNumber: "" });
  const [kycBusy, setKycBusy] = useState(false);
  const [kycError, setKycError] = useState("");
  const [kycSuccess, setKycSuccess] = useState("");
  const [kycFieldErrors, setKycFieldErrors] = useState({});

  const formatDate = (val) => val ? new Date(val).toLocaleDateString("en-IN") : "-";

  const loadBase = async () => {
    setLoading(true);
    try {
      const [pRes, lRes] = await Promise.all([customerApi.getMyProfile(), loanApi.getMyLoans()]);
      const p = pRes.data;
      setProfile({
        ...(p || {}),
        fullName: p?.fullName || registeredName || "",
        phone: p?.phone || registeredPhone || "",
      });
      setProfileForm({
        fullName: p?.fullName || registeredName || "",
        phone: p?.phone || registeredPhone || "",
        address: p?.address || "",
        employmentType: normalizeEmploymentType(p?.employmentType),
        annualIncome: annualFromMonthly(p?.monthlyIncome),
      });
      const loans = lRes.data || [];
      setMyLoans(loans);
      const kRes = await kycApi.getMyKyc().catch(() => null);
      if (kRes?.data) setMyKyc(kRes.data);
    } catch (e) { setError("Failed to synchronize workspace."); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadBase(); }, []);
  useEffect(() => { setCurrentPage(1); }, [activeLoanId]);
  useEffect(() => { setTxPage(1); }, [myTransactions]);

  const loadMyTransactions = async () => {
    if (!myLoans.length) {
      setMyTransactions([]);
      setTxError("");
      return;
    }

    setTxLoading(true);
    setTxError("");
    try {
      const settled = await Promise.allSettled(
        myLoans.map((loan) => repaymentApi.getByLoan(loan.id))
      );

      const mapped = settled.flatMap((result, index) => {
        if (result.status !== "fulfilled") return [];
        const loan = myLoans[index];
        const rows = result.value?.data || [];
        return rows.map((r) => ({
          ...r,
          txRef: r?.id || "-",
          txDetails: `Repayment of ${Number(r?.amount || 0)}`,
          txStatus: r?.status || r?.paymentStatus || r?.transactionStatus || r?.stripeStatus || "",
          loanProductName: loan?.loanProductName || "Loan",
          requestedAmount: loan?.requestedAmount,
        }));
      });

      mapped.sort((a, b) => {
        const ta = a?.paymentDate ? new Date(a.paymentDate).getTime() : 0;
        const tb = b?.paymentDate ? new Date(b.paymentDate).getTime() : 0;
        return tb - ta;
      });

      const failures = settled.filter((item) => item.status === "rejected").length;
      if (failures === settled.length) {
        setTxError("Failed to fetch transactions.");
      }

      setMyTransactions(mapped);
    } catch (e) {
      setTxError(e?.response?.data?.message || e?.message || "Failed to fetch transactions.");
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "transactions") return;
    loadMyTransactions();
  }, [activeTab, myLoans]);

  // Auto-fail pending transactions after 3 minutes (client-side display only)
  useEffect(() => {
    const PENDING_FAIL_MS = 3 * 60 * 1000;
    const timers = [];
    myTransactions.forEach((tx) => {
      if (!isPendingStatus(tx)) return;
      const ref = tx?.txRef || tx?.id || tx?.transactionId || Math.random().toString(36).slice(2);
      const baseRaw = tx?.createdAt || tx?.paymentDate || tx?.timestamp || null;
      const baseTs = baseRaw ? new Date(baseRaw).getTime() : NaN;
      const elapsed = Number.isFinite(baseTs) && baseTs > 0 ? Date.now() - baseTs : 0;
      const delay = Math.max(0, PENDING_FAIL_MS - Math.max(0, elapsed));
      const timer = setTimeout(() => {
        setMyTransactions((prev) =>
          prev.map((item) => {
            const same =
              (item?.txRef && item.txRef === ref) ||
              (item?.id && item.id === ref) ||
              (item?.transactionId && item.transactionId === ref);
            if (same && isPendingStatus(item)) {
              return { ...item, txStatus: "FAILED" };
            }
            return item;
          })
        );
      }, delay);
      timers.push(timer);
    });
    return () => timers.forEach(clearTimeout);
  }, [myTransactions]);

  useEffect(() => {
    if (!myKyc) {
      setKycForm({
        fullName: profile?.fullName || "",
        dob: "",
        panNumber: "",
        aadhaarNumber: "",
      });
      return;
    }
    setKycForm({
      fullName: myKyc?.fullName || "",
      dob: myKyc?.dob ? String(myKyc.dob).slice(0, 10) : "",
      panNumber: myKyc?.panNumber || "",
      aadhaarNumber: myKyc?.aadhaarNumber || "",
    });
  }, [myKyc, profile]);

  const handleProfileField = (key, value) => {
    setProfileForm((prev) => ({ ...prev, [key]: value }));
    setProfileFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const resetProfileEdit = () => {
    setProfileForm({
      fullName: profile?.fullName || registeredName || "",
      phone: profile?.phone || registeredPhone || "",
      address: profile?.address || "",
      employmentType: normalizeEmploymentType(profile?.employmentType),
      annualIncome: annualFromMonthly(profile?.monthlyIncome),
    });
    setProfileError("");
    setProfileFieldErrors({});
    setProfileSuccess("");
    setEditing(false);
  };

  const validateProfile = (payload) => {
    const errors = {};
    if (!payload.fullName) {
      errors.fullName = "Legal name is required.";
    } else if (!legalFullNameRx.test(payload.fullName)) {
      errors.fullName = "Legal name must contain alphabets, spaces or dots only.";
    }

    if (!payload.phone) {
      errors.phone = "Phone is required.";
    } else if (!/^[6-9][0-9]{9}$/.test(payload.phone)) {
      errors.phone = "Phone must be a valid 10-digit mobile number.";
    }

    if (!payload.employmentType) {
      errors.employmentType = "Select your employment type.";
    }

    if (!Number.isFinite(payload.monthlyIncome) || payload.monthlyIncome <= 0) {
      errors.annualIncome = "Annual income must be greater than 0.";
    }

    if (!payload.address) {
      errors.address = "Address is required.";
    } else if (payload.address.length < 5) {
      errors.address = "Address is too short.";
    } else if (!addressAllowedRx.test(payload.address)) {
      errors.address = "Address can include letters, numbers, spaces, commas, hyphens, / and #.";
    } else if (!/[A-Za-z]/.test(payload.address)) {
      errors.address = "Address must include letters and cannot be only numbers/symbols.";
    }

    return errors;
  };

  useEffect(() => {
    if (!profile) return;
    setProfileForm((prev) => ({
      ...prev,
      fullName: prev.fullName || profile?.fullName || registeredName || "",
      phone: prev.phone || profile?.phone || registeredPhone || "",
    }));
  }, [profile, registeredName, registeredPhone]);

  const saveProfile = async () => {
    setProfileError("");
    setProfileFieldErrors({});
    setProfileSuccess("");

    const payload = {
      fullName: profileForm.fullName.trim(),
      phone: profileForm.phone.trim(),
      address: profileForm.address.trim(),
      employmentType: normalizeEmploymentType(profileForm.employmentType),
      monthlyIncome: monthlyFromAnnual(profileForm.annualIncome),
    };

    const errors = validateProfile(payload);
    if (Object.keys(errors).length) {
      setProfileFieldErrors(errors);
      const firstError = Object.values(errors)[0] || "Please fix highlighted fields.";
      setProfileError(firstError);
      showPopup(firstError, { type: "error" });
      return;
    }

    setProfileBusy(true);
    try {
      const res = await customerApi.updateMyProfile(payload);
      const updated = res?.data?.data || profile;
      setProfile(updated);
      setProfileForm({
        fullName: updated?.fullName || "",
        phone: updated?.phone || "",
        address: updated?.address || "",
        employmentType: normalizeEmploymentType(updated?.employmentType),
        annualIncome: annualFromMonthly(updated?.monthlyIncome),
      });
      setProfileSuccess("Profile updated successfully.");
      setEditing(false);
    } catch (e) {
      const fieldMap = e?.response?.data;
      if (fieldMap && typeof fieldMap === "object" && !Array.isArray(fieldMap) && !fieldMap.message) {
        const mapped = { ...fieldMap };
        if (mapped.monthlyIncome && !mapped.annualIncome) {
          mapped.annualIncome = mapped.monthlyIncome;
        }
        setProfileFieldErrors(mapped);
      }
      const message = e?.response?.data?.message || e?.message || "Failed to update profile";
      setProfileError(message);
      showPopup(message, { type: "error" });
    } finally {
      setProfileBusy(false);
    }
  };

  const paginatedEMI = useMemo(() => {
    const installments = schedule?.installments || [];
    const start = (currentPage - 1) * pageSize;
    return installments.slice(start, start + pageSize);
  }, [schedule, currentPage]);

  const txPageSize = 6;
  const paginatedTransactions = useMemo(() => {
    const start = (txPage - 1) * txPageSize;
    return myTransactions.slice(start, start + txPageSize);
  }, [myTransactions, txPage]);
  const txTotalPages = Math.ceil((myTransactions.length || 0) / txPageSize);

  const totalPages = Math.ceil((schedule?.installments?.length || 0) / pageSize);
  const activeLoans = useMemo(
    () =>
      myLoans.filter((loan) =>
        ["DISBURSED", "ACTIVE", "CLOSED"].includes(String(loan?.status || "").toUpperCase())
      ),
    [myLoans]
  );
  const bankDetailsEligibleLoans = useMemo(
    () =>
      myLoans.filter((loan) => {
        const loanStatus = String(loan?.status || "").toUpperCase();
        return ["APPROVED", "DISBURSED", "ACTIVE", "CLOSED"].includes(loanStatus) && !!loan?.agreementAccepted;
      }),
    [myLoans]
  );
  const canAcceptAgreement = (loan) =>
    String(loan?.status || "").toUpperCase() === "APPROVED" &&
    !loan?.agreementAccepted &&
    !!loan?.approvedAt;
  const isScheduleFullyPaid = useMemo(() => {
    const items = schedule?.installments || [];
    if (!items.length) return false;
    return items.every((ins) => String(ins?.status || "").toUpperCase() === "PAID");
  }, [schedule]);
  const pendingAmount = (ins) => {
    const total = Number(ins?.totalAmount || 0);
    const paid = Number(ins?.paidAmount || 0);
    return Math.max(0, total - paid);
  };
  const unpaidInstallments = useMemo(
    () => (schedule?.installments || []).filter((ins) => String(ins?.status || "").toUpperCase() !== "PAID"),
    [schedule]
  );
  const nextPayableInstallment = unpaidInstallments[0] || null;
  const advanceCapCount = 4;
  const advanceEligibleInstallments = useMemo(
    () => unpaidInstallments.slice(0, advanceCapCount),
    [unpaidInstallments]
  );
  const maxAdvanceAmount = useMemo(
    () => advanceEligibleInstallments.reduce((sum, ins) => sum + pendingAmount(ins), 0),
    [advanceEligibleInstallments]
  );

  useEffect(() => {
    if (!activeLoanId || !isScheduleFullyPaid) return;

    // Reflect closure immediately in UI, then sync from backend.
    setMyLoans((prev) =>
      prev.map((loan) => (loan.id === activeLoanId ? { ...loan, status: "CLOSED" } : loan))
    );

    loanApi
      .getMyLoans()
      .then((res) => setMyLoans(res?.data || []))
      .catch(() => {});
  }, [activeLoanId, isScheduleFullyPaid]);

  useEffect(() => {
    if (!activeLoanId) return;
    const exists = activeLoans.some((loan) => loan.id === activeLoanId);
    if (!exists) setActiveLoanId("");
  }, [activeLoanId, activeLoans]);

  const handleKycField = (key, value) => setKycForm((prev) => ({ ...prev, [key]: value }));
  const PAN_RX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  const AADHAAR_RX = /^[0-9]{12}$/;

  const openAgreementModal = (loan) => {
    setAgreementLoan(loan);
    setAgreementName(profile?.fullName || user?.username || "");
    setAgreementError("");
  };

  const seedBankDetailsForm = (loan) => {
    const eduLoan = isEducationLoan(loan);
    setBankDetailsForm({
      beneficiaryType: loan?.bankBeneficiaryType || (eduLoan ? "INSTITUTION" : "SELF"),
      institutionName: loan?.institutionName || "",
      accountHolderName: loan?.bankAccountHolderName || profile?.fullName || user?.username || "",
      bankName: loan?.bankName || "",
      accountNumber: loan?.bankAccountNumber || "",
      ifscCode: loan?.bankIfscCode || "",
      branchName: loan?.bankBranchName || "",
    });
    setBankDetailsError("");
    setBankDetailsFieldErrors({});
  };

  const openBankDetailsModal = (loan) => {
    setBankDetailsLoan(loan);
    seedBankDetailsForm(loan);
  };

  const closeBankDetailsModal = (force = false) => {
    if (bankDetailsBusy && !force) return;
    setBankDetailsLoan(null);
    setBankDetailsError("");
    setBankDetailsFieldErrors({});
  };

  const closeAgreementModal = (force = false) => {
    if (agreementBusy && !force) return;
    setAgreementLoan(null);
    setAgreementName("");
    setAgreementError("");
  };

  const submitAgreementAcceptance = async () => {
    if (!agreementLoan?.id) return;
    const signer = agreementName.trim();
    if (!signer) {
      setAgreementError("Please type your full name to accept.");
      return;
    }
    const legalName = String(profile?.fullName || profileForm?.fullName || registeredName || "").trim();
    if (!legalName) {
      setAgreementError("Legal name is missing in profile. Please update profile first.");
      return;
    }
    if (normalizeName(signer) !== normalizeName(legalName)) {
      setAgreementError("Signature name must match your legal name exactly.");
      return;
    }

    setAgreementBusy(true);
    setAgreementError("");
    try {
      await loanApi.acceptAgreement(agreementLoan.id, { acceptedName: signer });
      const freshLoans = await loanApi.getMyLoans();
      const latest = freshLoans?.data || [];
      setMyLoans(latest);
      const acceptedLoan = latest.find((loan) => loan.id === agreementLoan.id);
      closeAgreementModal(true);
      if (acceptedLoan) openBankDetailsModal(acceptedLoan);
    } catch (e) {
      setAgreementError(e?.response?.data?.message || e?.message || "Agreement acceptance failed.");
    } finally {
      setAgreementBusy(false);
    }
  };

  const handleBankField = (field, value) => {
    setBankDetailsForm((prev) => ({ ...prev, [field]: value }));
    setBankDetailsFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateBankDetails = (payload) => {
    const errors = {};
    if (!payload.beneficiaryType) errors.beneficiaryType = "Beneficiary type is required.";
    if (payload.beneficiaryType === "INSTITUTION" && !payload.institutionName.trim()) {
      errors.institutionName = "Institution name is required.";
    }
    if (!payload.accountHolderName.trim()) errors.accountHolderName = "Account holder name is required.";
    if (!payload.bankName.trim()) errors.bankName = "Bank name is required.";
    if (!/^[0-9]{9,18}$/.test(payload.accountNumber)) errors.accountNumber = "Account number must be 9-18 digits.";
    if (!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(payload.ifscCode)) errors.ifscCode = "Enter a valid IFSC code.";
    if (!payload.branchName.trim()) errors.branchName = "Branch name is required.";
    return errors;
  };

  const submitBankDetails = async () => {
    if (!bankDetailsLoan?.id) return;
    setBankDetailsError("");
    setBankDetailsFieldErrors({});

    const payload = {
      beneficiaryType: isEducationLoan(bankDetailsLoan) ? "INSTITUTION" : bankDetailsForm.beneficiaryType,
      institutionName: bankDetailsForm.institutionName.trim(),
      accountHolderName: bankDetailsForm.accountHolderName.trim(),
      bankName: bankDetailsForm.bankName.trim(),
      accountNumber: bankDetailsForm.accountNumber.trim(),
      ifscCode: bankDetailsForm.ifscCode.trim().toUpperCase(),
      branchName: bankDetailsForm.branchName.trim(),
    };
    const errors = validateBankDetails(payload);
    if (Object.keys(errors).length) {
      setBankDetailsFieldErrors(errors);
      const first = Object.values(errors)[0] || "Please fix highlighted fields.";
      setBankDetailsError(first);
      showPopup(first, { type: "error" });
      return;
    }

    setBankDetailsBusy(true);
    try {
      await loanApi.submitBankDetails(bankDetailsLoan.id, payload);
      const freshLoans = await loanApi.getMyLoans();
      setMyLoans(freshLoans?.data || []);
      closeBankDetailsModal(true);
      setActiveTab("bankDetails");
      showPopup("Bank details submitted for admin verification.", { type: "success" });
    } catch (e) {
      const message = getFriendlyError(e, "Failed to submit bank details.");
      setBankDetailsError(message);
      showPopup(message, { type: "error" });
    } finally {
      setBankDetailsBusy(false);
    }
  };

  const KYC_MAX_ATTEMPTS = 2;
  const KYC_COOLDOWN_MONTHS = 3;
  const attemptsUsed = Number(myKyc?.submissionCount || 0);
  const lastSubmittedAt = myKyc?.submittedAt ? new Date(myKyc.submittedAt) : null;
  const nextEligibleAt = lastSubmittedAt ? new Date(lastSubmittedAt) : null;
  if (nextEligibleAt) nextEligibleAt.setMonth(nextEligibleAt.getMonth() + KYC_COOLDOWN_MONTHS);
  const kycLocked = attemptsUsed >= KYC_MAX_ATTEMPTS && nextEligibleAt && new Date() < nextEligibleAt;

  const resetKycEditing = () => {
    setKycEditing(false);
    setKycError("");
    setKycSuccess("");
    setKycFieldErrors({});
    setPanFile(null);
    setAadhaarFile(null);
    if (myKyc) {
      setKycForm({
        fullName: myKyc?.fullName || "",
        dob: myKyc?.dob ? String(myKyc.dob).slice(0, 10) : "",
        panNumber: myKyc?.panNumber || "",
        aadhaarNumber: myKyc?.aadhaarNumber || "",
      });
    }
  };

  const submitKyc = async () => {
    setKycError("");
    setKycSuccess("");
    setKycFieldErrors({});

    const payload = {
      fullName: kycForm.fullName.trim(),
      dob: kycForm.dob,
      panNumber: kycForm.panNumber.trim().toUpperCase(),
      aadhaarNumber: kycForm.aadhaarNumber.trim(),
    };

    const errors = {};
    if (!payload.fullName) errors.fullName = "Full name is required.";
    if (!payload.dob) errors.dob = "DOB is required.";
    if (!payload.panNumber) errors.panNumber = "PAN is required.";
    else if (!PAN_RX.test(payload.panNumber)) errors.panNumber = "PAN format must be ABCDE1234F.";
    if (!payload.aadhaarNumber) errors.aadhaarNumber = "Aadhaar is required.";
    else if (!AADHAAR_RX.test(payload.aadhaarNumber)) errors.aadhaarNumber = "Aadhaar must be exactly 12 digits.";

    if (Object.keys(errors).length) {
      setKycFieldErrors(errors);
      const firstError = Object.values(errors)[0];
      setKycError(firstError);
      showPopup(firstError, { type: "error" });
      return;
    }
    if (!panFile || !aadhaarFile) {
      const fileError = "Upload both PAN and Aadhaar documents.";
      setKycError(fileError);
      showPopup(fileError, { type: "error" });
      return;
    }
    if (kycLocked) {
      const lockError = `KYC updates are locked until ${formatDate(nextEligibleAt)}.`;
      setKycError(lockError);
      showPopup(lockError, { type: "error" });
      return;
    }

    setKycBusy(true);
    try {
      const res = await kycApi.submit(payload, panFile, aadhaarFile);
      const updated = res?.data?.data || null;
      if (updated) setMyKyc(updated);
      setKycSuccess("KYC submitted successfully.");
      setKycEditing(false);
      setPanFile(null);
      setAadhaarFile(null);
    } catch (e) {
      const message = getFriendlyError(e, "KYC submission failed");
      setKycError(message);
      showPopup(message, { type: "error" });
    } finally {
      setKycBusy(false);
    }
  };

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
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700 mb-2"></p>
            <h2 className="text-3xl font-serif text-slate-900">Welcome, {user?.username || profile?.fullName}</h2>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* SIDEBAR NAVIGATION */}
        <aside className="lg:col-span-3 space-y-3 sticky top-28 h-fit">
          <SidebarButton id="profile" label="Profile" icon={User} />
          <SidebarButton id="kyc" label="KYC Hub" icon={ShieldCheck} />
          <SidebarButton id="loans" label="My Loans" icon={Landmark} />
          <SidebarButton id="bankDetails" label="Bank Details" icon={Landmark} />
          <SidebarButton id="transactions" label="Transactions" icon={FileText} />
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
                    <div className="flex items-center gap-3">
                      {editing && (
                        <button
                          onClick={saveProfile}
                          disabled={profileBusy}
                          className="text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-60"
                        >
                          {profileBusy ? "Saving..." : "Save"}
                        </button>
                      )}
                      <button
                        onClick={() => (editing ? resetProfileEdit() : setEditing(true))}
                        className="text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                      >
                        {editing ? "Discard" : "Modify Details"}
                      </button>
                    </div>
                  </div>
                  {profileError && <p className="mb-4 text-sm font-semibold text-rose-600">{profileError}</p>}
                  {profileSuccess && <p className="mb-4 text-sm font-semibold text-emerald-700">{profileSuccess}</p>}

                  {editing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Field label="Legal Name" error={profileFieldErrors.fullName}>
                        <input value={profileForm.fullName} onChange={(e) => handleProfileField("fullName", sanitizeLegalName(e.target.value))} className={`w-full rounded-xl border bg-slate-50 p-3 text-sm outline-none transition-colors ${profileFieldErrors.fullName ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-emerald-500"}`} />
                      </Field>
                      <Field label="Contact" error={profileFieldErrors.phone}>
                        <input value={profileForm.phone} onChange={(e) => handleProfileField("phone", e.target.value.replace(/[^0-9]/g, "").slice(0, 10))} className={`w-full rounded-xl border bg-slate-50 p-3 text-sm outline-none transition-colors ${profileFieldErrors.phone ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-emerald-500"}`} />
                      </Field>
                      <Field label="Employment" error={profileFieldErrors.employmentType}>
                        <EmploymentDropdown
                          value={normalizeEmploymentType(profileForm.employmentType)}
                          options={EMPLOYMENT_OPTIONS}
                          error={profileFieldErrors.employmentType}
                          onChange={(nextValue) => handleProfileField("employmentType", normalizeEmploymentType(nextValue))}
                        />
                      </Field>
                      <Field label="Annual Income" error={profileFieldErrors.annualIncome}>
                        <input type="number" min="1" value={profileForm.annualIncome} onChange={(e) => handleProfileField("annualIncome", e.target.value)} className={`w-full rounded-xl border bg-slate-50 p-3 text-sm outline-none transition-colors ${profileFieldErrors.annualIncome ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-emerald-500"}`} />
                      </Field>
                      <Field label="Address" error={profileFieldErrors.address}>
                        <input value={profileForm.address} onChange={(e) => handleProfileField("address", e.target.value)} className={`w-full rounded-xl border bg-slate-50 p-3 text-sm outline-none transition-colors ${profileFieldErrors.address ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-emerald-500"}`} />
                      </Field>
                      <InfoBox label="CIBIL Score" value={profile?.creditScore} />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <InfoBox label="Legal Name" value={profile?.fullName || profileForm?.fullName || registeredName || ""} />
                      <InfoBox label="Contact" value={profile?.phone || profileForm?.phone || registeredPhone || ""} />
                      <InfoBox label="Employment" value={getEmploymentLabel(profile?.employmentType || "")} />
                      <InfoBox label="Annual Income" value={money(annualFromMonthly(profile?.monthlyIncome))} />
                      <InfoBox label="Address" value={profile?.address} />
                      <InfoBox label="CIBIL Score" value={profile?.creditScore} />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 2. KYC HUB */}
            {activeTab === "kyc" && (
              <motion.div key="kyc" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="rounded-[2.5rem] bg-white border border-slate-200 p-8 shadow-xl shadow-slate-200/40">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold text-slate-900">Verification Hub</h3>
                    <div className="flex items-center gap-3">
                      {myKyc && (
                        <button
                          disabled={kycLocked}
                          onClick={() => setKycEditing((v) => !v)}
                          className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-900 hover:text-white transition-all disabled:opacity-50"
                        >
                          {kycEditing ? "Cancel Edit" : "Modify KYC"}
                        </button>
                      )}
                      <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${myKyc ? KYC_META[myKyc?.status || 'PENDING'].cls : "bg-slate-100 text-slate-700 border-slate-200"}`}>
                        {myKyc ? KYC_META[myKyc?.status || "PENDING"].icon : <AlertCircle size={14} />} {myKyc ? KYC_META[myKyc?.status || "PENDING"].label : "NOT SUBMITTED"}
                      </div>
                    </div>
                  </div>

                  <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <InfoBox label="Submission State" value={myKyc ? "Submitted" : "Not Submitted"} />
                    <InfoBox label="Attempts Used" value={`${attemptsUsed}/${KYC_MAX_ATTEMPTS}`} />
                    <InfoBox label="Next Eligible Update" value={kycLocked ? formatDate(nextEligibleAt) : "Available"} />
                  </div>
                  {kycLocked && (
                    <p className="mb-4 text-sm font-semibold text-amber-700">
                      You reached the maximum KYC update attempts. You can modify again after {formatDate(nextEligibleAt)}.
                    </p>
                  )}
                  {kycError && <p className="mb-4 text-sm font-semibold text-rose-600">{kycError}</p>}
                  {kycSuccess && <p className="mb-4 text-sm font-semibold text-emerald-700">{kycSuccess}</p>}

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
                      <Field label="Full Name" error={kycFieldErrors.fullName}>
                        <input
                          value={kycForm.fullName}
                          onChange={(e) => handleKycField("fullName", e.target.value)}
                          className={`w-full rounded-xl border bg-slate-50 p-3 text-sm outline-none transition-colors ${kycFieldErrors.fullName ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-emerald-500"}`}
                          placeholder="As per PAN"
                        />
                      </Field>
                      <Field label="DOB" error={kycFieldErrors.dob}>
                        <input
                          type="date"
                          value={kycForm.dob}
                          onChange={(e) => handleKycField("dob", e.target.value)}
                          className={`w-full rounded-xl border bg-slate-50 p-3 text-sm outline-none transition-colors ${kycFieldErrors.dob ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-emerald-500"}`}
                        />
                      </Field>
                      <Field label="PAN Number" error={kycFieldErrors.panNumber}>
                        <input
                          value={kycForm.panNumber}
                          onChange={(e) => {
                            handleKycField("panNumber", e.target.value.toUpperCase());
                            setKycFieldErrors((prev) => ({ ...prev, panNumber: "" }));
                          }}
                          className={`w-full rounded-xl border bg-slate-50 p-3 text-sm outline-none transition-colors ${kycFieldErrors.panNumber ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-emerald-500"}`}
                          placeholder="ABCDE1234F"
                        />
                      </Field>
                      <Field label="Aadhaar Number" error={kycFieldErrors.aadhaarNumber}>
                        <input
                          value={kycForm.aadhaarNumber}
                          onChange={(e) => {
                            handleKycField("aadhaarNumber", e.target.value.replace(/[^0-9]/g, "").slice(0, 12));
                            setKycFieldErrors((prev) => ({ ...prev, aadhaarNumber: "" }));
                          }}
                          className={`w-full rounded-xl border bg-slate-50 p-3 text-sm outline-none transition-colors ${kycFieldErrors.aadhaarNumber ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-emerald-500"}`}
                          placeholder="12 digit Aadhaar"
                        />
                      </Field>
                        <Field label="PAN Card (PDF)">
                          <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center hover:border-emerald-400 transition-colors">
                            <UploadCloud className="text-slate-400 mb-2"/>
                            <span className="text-[10px] text-slate-500 font-bold uppercase">{panFile?.name || "Upload PDF"}</span>
                            <input
                              type="file"
                              accept=".pdf"
                              onChange={(e) => setPanFile(e.target.files?.[0] || null)}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                          </div>
                        </Field>
                        <Field label="Aadhaar Card (PDF)">
                          <div className="relative border-2 border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center hover:border-emerald-400 transition-colors">
                            <UploadCloud className="text-slate-400 mb-2"/>
                            <span className="text-[10px] text-slate-500 font-bold uppercase">{aadhaarFile?.name || "Upload PDF"}</span>
                            <input
                              type="file"
                              accept=".pdf"
                              onChange={(e) => setAadhaarFile(e.target.files?.[0] || null)}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                          </div>
                        </Field>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          disabled={kycBusy || kycLocked}
                          onClick={submitKyc}
                          className="bg-slate-900 text-white px-10 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl border border-slate-800 hover:bg-emerald-700 hover:border-emerald-600 transition-all disabled:opacity-60"
                        >
                          {kycBusy ? "Submitting..." : "Submit Verification"}
                        </button>
                        {kycEditing && (
                          <button
                            onClick={resetKycEditing}
                            className="px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-300 hover:bg-slate-100 transition-all"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 3. LOANS */}
            {activeTab === "loans" && (
              <motion.div key="loans" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                {myLoans.length ? (
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
                            <td className="p-6 text-right">
                              {String(l?.status || "").toUpperCase() === "APPROVED" && !l?.agreementAccepted ? (
                                canAcceptAgreement(l) ? (
                                  <button
                                    onClick={() => openAgreementModal(l)}
                                    className="text-emerald-700 font-black text-[10px] uppercase tracking-widest hover:text-emerald-900 transition-colors border border-emerald-200 hover:border-emerald-300 px-3 py-1 rounded-lg"
                                  >
                                    Accept Agreement
                                  </button>
                                ) : (
                                  <button
                                    disabled
                                    title="Agreement is not generated yet."
                                    className="cursor-not-allowed text-slate-400 font-black text-[10px] uppercase tracking-widest border border-slate-200 px-3 py-1 rounded-lg"
                                  >
                                    Accept Agreement
                                  </button>
                                )
                              ) : String(l?.status || "").toUpperCase() === "APPROVED" ? (
                                normalizeBankStatus(l?.bankDetailsStatus) === "APPROVED" ? (
                                  <span className="inline-flex rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700">
                                    Awaiting Disbursement
                                  </span>
                                ) : normalizeBankStatus(l?.bankDetailsStatus) === "PENDING" ? (
                                  <span className="inline-flex rounded-lg border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700">
                                    Submitted For Verification
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => openBankDetailsModal(l)}
                                    className="text-emerald-700 font-black text-[10px] uppercase tracking-widest hover:text-emerald-900 transition-colors border border-emerald-200 hover:border-emerald-300 px-3 py-1 rounded-lg"
                                  >
                                    {normalizeBankStatus(l?.bankDetailsStatus) === "REJECTED" ? "Update Bank Details" : "Submit Bank Details"}
                                  </button>
                                )
                              ) : (
                                <button onClick={() => { setActiveLoanId(l.id); setActiveTab("repayments"); }} className="text-emerald-700 font-black text-[10px] uppercase tracking-widest hover:text-emerald-900 transition-colors border border-transparent hover:border-emerald-100 px-3 py-1 rounded-lg">Details</button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-[2rem] border border-slate-200 bg-white p-14 text-center shadow-xl shadow-slate-200/30">
                    <Landmark size={42} className="mx-auto mb-4 text-slate-300" />
                    <h4 className="text-lg font-bold text-slate-700">No data available</h4>
                    <p className="mt-1 text-sm text-slate-500">You have not applied for any loans yet.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* 4. BANK DETAILS */}
            {activeTab === "bankDetails" && (
              <motion.div key="bank-details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="rounded-[2rem] bg-white border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/40">
                  <div className="p-6 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900">Disbursement Bank Details</h3>
                    <p className="text-xs text-slate-500">Submit and track bank account verification for approved loans.</p>
                  </div>
                  {bankDetailsEligibleLoans.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-[10px] uppercase tracking-widest text-slate-400 font-black border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-4">Loan</th>
                            <th className="px-6 py-4">Account</th>
                            <th className="px-6 py-4">IFSC</th>
                            <th className="px-6 py-4">Bank Status</th>
                            <th className="px-6 py-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {bankDetailsEligibleLoans.map((loan) => {
                            const bankStatus = normalizeBankStatus(loan?.bankDetailsStatus);
                            const tone =
                              bankStatus === "APPROVED"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : bankStatus === "REJECTED"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : bankStatus === "PENDING"
                                    ? "bg-amber-50 text-amber-800 border-amber-200"
                                    : "bg-slate-100 text-slate-700 border-slate-200";
                            return (
                              <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4 text-sm font-semibold text-slate-800">{loan.loanProductName || "Loan"}</td>
                                <td className="px-6 py-4 text-xs text-slate-600">{maskAccount(loan?.bankAccountNumber)}</td>
                                <td className="px-6 py-4 text-xs font-mono text-slate-600">{loan?.bankIfscCode || "-"}</td>
                                <td className="px-6 py-4">
                                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${tone}`}>{bankStatus.replaceAll("_", " ")}</span>
                                  {bankStatus === "REJECTED" && loan?.bankDetailsRejectionReason ? (
                                    <p className="mt-1 text-xs font-semibold text-rose-600">{loan.bankDetailsRejectionReason}</p>
                                  ) : null}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  {bankStatus === "APPROVED" ? (
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Verified by Admin</span>
                                  ) : bankStatus === "PENDING" ? (
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Submitted For Verification</span>
                                  ) : (
                                    <button
                                      onClick={() => openBankDetailsModal(loan)}
                                      className="rounded-lg border border-emerald-200 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 hover:border-emerald-300 hover:text-emerald-900"
                                    >
                                      {bankStatus === "REJECTED" ? "Update Details" : "Submit Details"}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-10 text-center text-sm text-slate-500">
                      No loans available for bank details.
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 5. TRANSACTIONS */}
            {activeTab === "transactions" && (
              <motion.div key="transactions" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="rounded-[2rem] bg-white border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/40">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-bold text-slate-900">Customer Transactions</h3>
                      <p className="text-xs text-slate-500">Only repayment entries made by you.</p>
                    </div>
                    <button
                      onClick={loadMyTransactions}
                      disabled={txLoading}
                      className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-300 hover:bg-slate-100 disabled:opacity-60"
                    >
                      {txLoading ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>

                  {txError && (
                    <p className="px-6 pt-4 text-sm font-semibold text-rose-600">{txError}</p>
                  )}

                  {txLoading ? (
                    <div className="p-6 text-sm text-slate-500">Loading transactions...</div>
                  ) : myTransactions.length ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50/50 text-[10px] uppercase tracking-widest text-slate-400 font-black border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-4">Date & Time</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Transaction Ref</th>
                            <th className="px-6 py-4">Details</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedTransactions.map((tx, idx) => (
                            <tr key={`${tx?.id || tx?.transactionId || "tx"}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 text-sm text-slate-700">{tx?.paymentDate ? new Date(tx.paymentDate).toLocaleString("en-IN") : "-"}</td>
                              <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                                {Number(tx?.amount || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${txStatusMeta(tx).cls}`}>
                                  {txStatusMeta(tx).label}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs font-mono text-slate-600">{tx?.txRef || "-"}</td>
                              <td className="px-6 py-4 text-xs text-slate-600">{tx?.txDetails || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-10 text-center text-sm text-slate-500">No repayment records found.</div>
                  )}

                  {!!myTransactions.length && txTotalPages > 1 && (
                    <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Page {txPage} of {txTotalPages}
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
                          disabled={txPage >= txTotalPages}
                          onClick={() => setTxPage((p) => p + 1)}
                          className="p-2 rounded-lg border bg-white disabled:opacity-30 hover:bg-slate-50 transition-all"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 6. REPAYMENTS */}
            {activeTab === "repayments" && (
              <motion.div key="repayments" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="rounded-[2.5rem] bg-white border border-slate-200 p-8 shadow-xl shadow-slate-200/40">
                  <h3 className="text-xl font-bold text-slate-900 mb-6">Payment Schedule</h3>
                  <div className="mb-8 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-emerald-50 p-4 shadow-sm">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Select Loan</p>
                    <LoanDropdown
                      value={activeLoanId}
                      loans={activeLoans}
                      onChange={setActiveLoanId}
                      disabled={!activeLoans.length}
                    />
                    {!activeLoans.length && (
                      <p className="mt-2 text-xs font-semibold text-slate-500">
                        EMI schedule will appear after admin disburses your approved loan.
                      </p>
                    )}
                  </div>

                  {activeLoanId && (
                    <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
                        Pay Multiple EMIs (Up To 4 Months)
                      </p>
                      <p className="mb-3 text-xs font-semibold text-slate-600">
                        You can pay up to the next {Math.min(advanceCapCount, unpaidInstallments.length)} EMIs in advance.
                        Max now: {money(maxAdvanceAmount)}
                      </p>
                      <div className="mb-3 flex flex-wrap gap-2">
                        {advanceEligibleInstallments.map((_, idx) => {
                          const count = idx + 1;
                          const suggestedAmount = advanceEligibleInstallments
                            .slice(0, count)
                            .reduce((sum, item) => sum + pendingAmount(item), 0);
                          return (
                            <button
                              key={count}
                              type="button"
                              onClick={() => {
                                setBulkAmount(String(suggestedAmount.toFixed(2)));
                                setBulkInstallmentCount(count);
                              }}
                              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-100"
                            >
                              {count} Month
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex flex-col gap-3 md:flex-row">
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={bulkAmount}
                          onChange={(e) => {
                            setBulkAmount(e.target.value);
                            setBulkInstallmentCount(null);
                          }}
                          placeholder="Enter amount (e.g. 120000)"
                          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 outline-none transition-colors"
                        />
                        <button
                          disabled={actionBusy}
                          onClick={async () => {
                            const amount = Number(bulkAmount || 0);
                            if (!Number.isFinite(amount) || amount <= 0) return;
                            if (amount > maxAdvanceAmount) return;
                            const ok = await payCustomAmount(amount, bulkInstallmentCount);
                            if (ok) {
                              setBulkAmount("");
                              setBulkInstallmentCount(null);
                            }
                          }}
                          className="rounded-xl border border-slate-800 bg-slate-900 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:border-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
                        >
                          Pay Custom Amount
                        </button>
                      </div>
                      {actionError && (
                        <p className="mt-2 text-xs font-semibold text-rose-600">{actionError}</p>
                      )}
                      {!!bulkAmount && Number(bulkAmount) > maxAdvanceAmount && (
                        <p className="mt-2 text-xs font-semibold text-rose-600">
                          Custom amount cannot exceed {money(maxAdvanceAmount)} (next 4 EMIs cap).
                        </p>
                      )}
                    </div>
                  )}

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
                            {nextPayableInstallment && ins.installmentNumber === nextPayableInstallment.installmentNumber && (
                              <button
                                disabled={actionBusy}
                                onClick={() => payInstallment(ins)}
                                className="bg-slate-900 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg border border-slate-800 hover:bg-emerald-700 hover:border-emerald-600 transition-all disabled:opacity-60"
                              >
                                {actionBusy ? "Processing..." : "Pay EMI"}
                              </button>
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

      {bankDetailsLoan && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-700 mb-2">Bank Details</p>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Disbursement Account Details</h3>
            <p className="text-sm text-slate-600 mb-5">
              Fill your bank details. Admin will verify these details and disburse the approved loan amount.
            </p>
            <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Loan: <span className="font-semibold">{bankDetailsLoan?.loanProductName || "-"}</span>
            </div>
            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Beneficiary Type" error={bankDetailsFieldErrors.beneficiaryType}>
                <select
                  value={bankDetailsForm.beneficiaryType}
                  onChange={(e) => handleBankField("beneficiaryType", e.target.value)}
                  disabled={isEducationLoan(bankDetailsLoan)}
                  className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none ${bankDetailsFieldErrors.beneficiaryType ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-emerald-500"} disabled:bg-slate-100 disabled:text-slate-500`}
                >
                  <option value="SELF">Self</option>
                  <option value="INSTITUTION">Institution</option>
                </select>
              </Field>
              {bankDetailsForm.beneficiaryType === "INSTITUTION" && (
                <Field label="Institution Name" error={bankDetailsFieldErrors.institutionName}>
                  <input
                    type="text"
                    value={bankDetailsForm.institutionName}
                    onChange={(e) => handleBankField("institutionName", e.target.value)}
                    className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none ${bankDetailsFieldErrors.institutionName ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-emerald-500"}`}
                  />
                </Field>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label={bankDetailsForm.beneficiaryType === "INSTITUTION" ? "Institution Account Holder Name" : "Account Holder Name"} error={bankDetailsFieldErrors.accountHolderName}>
                <input
                  type="text"
                  value={bankDetailsForm.accountHolderName}
                  onChange={(e) => handleBankField("accountHolderName", e.target.value)}
                  className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none ${bankDetailsFieldErrors.accountHolderName ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-emerald-500"}`}
                />
              </Field>
              <Field label="Bank Name" error={bankDetailsFieldErrors.bankName}>
                <input
                  type="text"
                  value={bankDetailsForm.bankName}
                  onChange={(e) => handleBankField("bankName", e.target.value)}
                  className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none ${bankDetailsFieldErrors.bankName ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-emerald-500"}`}
                />
              </Field>
              <Field label="Account Number" error={bankDetailsFieldErrors.accountNumber}>
                <input
                  type="text"
                  value={bankDetailsForm.accountNumber}
                  onChange={(e) => handleBankField("accountNumber", e.target.value.replace(/[^0-9]/g, ""))}
                  className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none ${bankDetailsFieldErrors.accountNumber ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-emerald-500"}`}
                />
              </Field>
              <Field label="IFSC Code" error={bankDetailsFieldErrors.ifscCode}>
                <input
                  type="text"
                  value={bankDetailsForm.ifscCode}
                  onChange={(e) => handleBankField("ifscCode", e.target.value.toUpperCase())}
                  className={`w-full rounded-xl border bg-white px-4 py-3 text-sm uppercase outline-none ${bankDetailsFieldErrors.ifscCode ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-emerald-500"}`}
                />
              </Field>
              <div className="md:col-span-2">
                <Field label="Branch Name" error={bankDetailsFieldErrors.branchName}>
                  <input
                    type="text"
                    value={bankDetailsForm.branchName}
                    onChange={(e) => handleBankField("branchName", e.target.value)}
                    className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none ${bankDetailsFieldErrors.branchName ? "border-rose-400 focus:border-rose-500" : "border-slate-300 focus:border-emerald-500"}`}
                  />
                </Field>
              </div>
            </div>
            {bankDetailsError && (
              <p className="mt-3 text-sm font-semibold text-rose-600">{bankDetailsError}</p>
            )}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={closeBankDetailsModal}
                disabled={bankDetailsBusy}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={submitBankDetails}
                disabled={bankDetailsBusy}
                className="rounded-xl border border-slate-800 bg-slate-900 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-700 hover:border-emerald-600 disabled:opacity-60"
              >
                {bankDetailsBusy ? "Submitting..." : "Submit Bank Details"}
              </button>
            </div>
          </div>
        </div>
      )}

      {agreementLoan && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-700 mb-2">Loan Agreement</p>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Accept Loan Terms</h3>
            <p className="text-sm text-slate-600 mb-5">
              Your loan is approved. Please confirm your agreement by typing your full name.
            </p>
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Loan: <span className="font-semibold">{agreementLoan?.loanProductName || "-"}</span>
            </div>
            <input
              type="text"
              value={agreementName}
              onChange={(e) => setAgreementName(e.target.value)}
              placeholder="Type your full name"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500"
            />
            {agreementError && (
              <p className="mt-3 text-sm font-semibold text-rose-600">{agreementError}</p>
            )}
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={closeAgreementModal}
                disabled={agreementBusy}
                className="rounded-xl border border-slate-300 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={submitAgreementAcceptance}
                disabled={agreementBusy}
                className="rounded-xl border border-slate-800 bg-slate-900 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-emerald-700 hover:border-emerald-600 disabled:opacity-60"
              >
                {agreementBusy ? "Accepting..." : "Accept Agreement"}
              </button>
            </div>
          </div>
        </div>
      )}
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

function Field({ label, children, error }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">{label}</label>
      {children}
      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
    </div>
  );
}

function EmploymentDropdown({ value, options, onChange, error }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const activeLabel = options.find((opt) => opt.value === value)?.label || "Select Employment";

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full rounded-2xl border bg-gradient-to-r from-slate-50 to-emerald-50/30 px-4 py-3 text-left text-sm font-semibold text-slate-700 outline-none transition-colors ${
          error ? "border-rose-400" : "border-slate-300 hover:border-emerald-400"
        }`}
      >
        <span>{activeLabel}</span>
        <ChevronDown
          size={16}
          className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-500 hover:bg-slate-50"
          >
            Select Employment
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full px-4 py-3 text-left text-sm font-semibold transition-colors ${
                value === opt.value
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LoanDropdown({ value, loans, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selectedLoan = loans.find((loan) => loan.id === value) || null;
  const activeLabel = selectedLoan ? loanDropdownLabel(selectedLoan) : "Select active loan...";

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 outline-none transition-all hover:border-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      >
        <span>{activeLabel}</span>
        <ChevronDown
          size={16}
          className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && !disabled ? (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-500 hover:bg-slate-50"
          >
            Select active loan...
          </button>
          {loans.map((loan) => (
            <button
              key={loan.id}
              type="button"
              onClick={() => {
                onChange(loan.id);
                setOpen(false);
              }}
              className={`w-full px-4 py-3 text-left text-sm font-semibold transition-colors ${
                value === loan.id
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {loanDropdownLabel(loan)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
