import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, ChevronDown, FileText, ShieldCheck, Target } from "lucide-react";
import Navbar from "../../components/navbar/Navbar.jsx";
import BackgroundCanvas from "../../components/layout/BackgroundCanvas.jsx";
import { customerApi, loanApi, productApi, unwrap } from "../../api/domainApi.js";
import { DEFAULT_LOANS, mergeLoansWithDefaults } from "../../utils/loanCatalog.js";
import { useAuth } from "../../context/AuthContext.jsx";

const BLOCKING_LOAN_STATUSES = new Set([
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "DISBURSED",
  "ACTIVE",
]);

const THEME_STYLES = {
  emerald: {
    text: "text-emerald-600",
    bg: "bg-emerald-600",
    tintBg: "bg-emerald-50",
    border: "border-emerald-100",
    range: "accent-emerald-600",
    gradient: "from-white to-emerald-50/70",
    shadow: "shadow-emerald-300/40",
    hover: "hover:bg-emerald-700",
  },
  blue: {
    text: "text-blue-600",
    bg: "bg-blue-600",
    tintBg: "bg-blue-50",
    border: "border-blue-100",
    range: "accent-blue-600",
    gradient: "from-white to-blue-50/70",
    shadow: "shadow-blue-300/40",
    hover: "hover:bg-blue-700",
  },
  purple: {
    text: "text-purple-600",
    bg: "bg-purple-600",
    tintBg: "bg-purple-50",
    border: "border-purple-100",
    range: "accent-purple-600",
    gradient: "from-white to-purple-50/70",
    shadow: "shadow-purple-300/40",
    hover: "hover:bg-purple-700",
  },
  orange: {
    text: "text-orange-600",
    bg: "bg-orange-500",
    tintBg: "bg-orange-50",
    border: "border-orange-100",
    range: "accent-orange-500",
    gradient: "from-white to-orange-50/70",
    shadow: "shadow-orange-300/40",
    hover: "hover:bg-orange-600",
  },
  slate: {
    text: "text-slate-700",
    bg: "bg-slate-900",
    tintBg: "bg-slate-100",
    border: "border-slate-200",
    range: "accent-slate-700",
    gradient: "from-white to-slate-50/70",
    shadow: "shadow-slate-300/30",
    hover: "hover:bg-slate-700",
  },
};

const toCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const computeEmi = (amount, annualRatePercent, tenureYears) => {
  const monthlyRate = annualRatePercent / 12 / 100;
  const numberOfMonths = Math.max(1, tenureYears * 12);
  if (monthlyRate <= 0) {
    const emiWithoutInterest = amount / numberOfMonths;
    return {
      emi: emiWithoutInterest,
      totalAmount: amount,
      totalInterest: 0,
    };
  }
  const pow = Math.pow(1 + monthlyRate, numberOfMonths);
  const emi = amount * monthlyRate * (pow / (pow - 1));
  const totalAmount = emi * numberOfMonths;
  const totalInterest = totalAmount - amount;
  return { emi, totalAmount, totalInterest };
};

export default function LoanDetailsEMI() {
  const MotionDiv = motion.div;
  const MotionCircle = motion.circle;

  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const calcRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState(DEFAULT_LOANS);
  const [amount, setAmount] = useState(0);
  const [rate, setRate] = useState(0);
  const [tenureYears, setTenureYears] = useState(1);
  const [myLoans, setMyLoans] = useState([]);
  const [modal, setModal] = useState({ open: false, title: "Notice", message: "", onClose: null });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await productApi.getAll();
        const data = unwrap(res) || [];
        setLoans(mergeLoansWithDefaults(Array.isArray(data) ? data : [data]));
      } catch {
        setLoans(mergeLoansWithDefaults([]));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Load user's loans to check if they've already applied
  useEffect(() => {
    const loadMyLoans = async () => {
      if (isAuthenticated) {
        try {
          const res = await loanApi.getMyLoans();
          const loans = unwrap(res) || res?.data || [];
          setMyLoans(Array.isArray(loans) ? loans : []);
        } catch {
          setMyLoans([]);
        }
      }
    };
    loadMyLoans();
  }, [isAuthenticated]);

  const activeLoan = useMemo(() => loans.find((loan) => loan.slug === slug) || loans[0], [loans, slug]);
  const theme = THEME_STYLES[activeLoan?.colorTheme] || THEME_STYLES.slate;
  const minTenureYears = Math.max(1, Math.round((activeLoan?.minTenure || 12) / 12));
  const maxTenureYears = Math.max(minTenureYears, Math.round((activeLoan?.maxTenure || 84) / 12));

  useEffect(() => {
    if (!activeLoan) return;
    const defaultAmount = Math.round(((activeLoan.minAmount || 100000) + (activeLoan.maxAmount || 500000)) / 2);
    setAmount(defaultAmount);
    setRate(Number(activeLoan.interestRate || 10));
    setTenureYears(Math.min(Math.max(minTenureYears, 1), maxTenureYears));
  }, [activeLoan, minTenureYears, maxTenureYears]);

  const { emi, totalAmount, totalInterest } = useMemo(
    () => computeEmi(amount, rate, tenureYears),
    [amount, rate, tenureYears]
  );

  const scrollToCalculator = () => {
    calcRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const showModal = (message, title = "Notice", onClose = null) => {
    setModal({ open: true, title, message, onClose });
  };

  const closeModal = () => {
    const callback = modal.onClose;
    setModal({ open: false, title: "Notice", message: "", onClose: null });
    if (typeof callback === "function") callback();
  };

  // Check if user has already applied for this loan type
  const hasAlreadyApplied = useMemo(() => {
    return myLoans.some((loan) => {
      if (loan.loanProductId !== activeLoan?.id) return false;
      const status = String(loan.status || "").toUpperCase();
      return BLOCKING_LOAN_STATUSES.has(status);
    });
  }, [myLoans, activeLoan]);

  const handleProceedToApplication = async () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    if (hasAlreadyApplied) {
      showModal("You have already applied for this loan type. Only one application per loan type is allowed.");
      return;
    }

    try {
      const profileRes = await customerApi.getMyProfile();
      const profile = unwrap(profileRes) || profileRes?.data;
      const kycStatus = String(profile?.kycStatus || "").toUpperCase();
      if (kycStatus !== "APPROVED" && kycStatus !== "VERIFIED") {
        showModal("KYC verification is required before loan application.", "KYC Required", () => navigate("/app"));
        return;
      }
    } catch {
      showModal(
        "Please complete profile and KYC verification before loan application.",
        "KYC Required",
        () => navigate("/app")
      );
      return;
    }

    navigate(`/loan/${activeLoan.slug}/apply`, {
      state: {
        amount,
        rate,
        tenure: tenureYears,
        emi,
        totalAmount,
        loanSlug: activeLoan.slug,
        loanName: activeLoan.name,
        productId: activeLoan.id,
      },
    });
  };

  const progress = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;
  const circumference = 2 * Math.PI * 35;
  const offset = circumference - (progress / 100) * circumference;

  if (!activeLoan && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center app-gradient-bg">
        <p className="text-sm text-slate-600">Loan not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-gradient-bg relative overflow-x-hidden text-slate-900">
      <Navbar />
      <BackgroundCanvas />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24">
        <div className="pt-8">
          <button
            onClick={() => navigate("/")}
            className={`flex items-center gap-2 text-slate-900 ${theme.text} transition-all text-xs font-black uppercase tracking-[0.2em]`}
          >
            <ArrowLeft size={14} strokeWidth={3} /> Back to Hub
          </button>
        </div>

        <section className="pt-16 pb-14 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <MotionDiv
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border ${theme.border} shadow-sm`}
            >
              <ShieldCheck size={14} className={theme.text} />
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
                {activeLoan.badgeText}
              </span>
            </MotionDiv>

            <h1 className="text-5xl md:text-6xl font-serif font-bold text-slate-900 leading-[1.1] tracking-tight">
              {activeLoan.heroTitle}
            </h1>
            <p className="max-w-xl text-slate-600 text-lg font-medium leading-relaxed">{activeLoan.heroSubtitle}</p>

            <button
              onClick={scrollToCalculator}
              className={`px-8 py-4 ${theme.bg} text-white font-black text-xs uppercase tracking-widest rounded-full shadow-lg ${theme.shadow} ${theme.hover} transition-all flex items-center gap-2`}
            >
              Estimate EMI <ChevronDown size={16} />
            </button>
          </div>

          <MotionDiv initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative">
            <div className="relative z-10 w-full aspect-[4/3] rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white">
              <img src={activeLoan.imageUrl} alt={activeLoan.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/35 to-transparent" />
            </div>
          </MotionDiv>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <FileText size={20} className={theme.text} />
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tighter">Required Documents</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(activeLoan.requiredDocuments || activeLoan.documents || []).map((text) => (
                <div
                  key={text}
                  className="flex items-center gap-2 text-[11px] text-slate-600 font-bold bg-slate-50 p-2 rounded-lg border border-slate-100"
                >
                  <CheckCircle2 size={12} className="text-emerald-500" /> {text}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Target size={20} className={theme.text} />
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tighter">Approval Journey</h3>
            </div>
            <div className="flex justify-between relative px-2">
              {(activeLoan.processSteps || []).slice(0, 4).map((step, i) => (
                <div key={`${step}-${i}`} className="flex flex-col items-center z-10">
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center mb-2 shadow-lg">
                    <span className="text-[10px] font-black">{i + 1}</span>
                  </div>
                  <span className="text-[9px] font-black uppercase text-slate-500">{step}</span>
                </div>
              ))}
              <div className="absolute top-5 left-0 right-0 h-[2px] bg-slate-100 -z-0" />
            </div>
          </div>
        </section>

        <section ref={calcRef} className="pb-16 scroll-mt-6">
          <div
            className={`bg-gradient-to-tr ${theme.gradient} border-2 ${theme.border} rounded-[3rem] p-8 lg:p-12 shadow-[0_40px_100px_-20px_rgba(15,23,42,0.08)]`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <header>
                  <h2 className="text-3xl font-serif font-bold text-slate-900 leading-none">{activeLoan.name} EMI Estimator</h2>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
                    Unified calculator for all loan products
                  </p>
                </header>

                {[
                  {
                    label: "Loan Amount",
                    value: amount,
                    set: setAmount,
                    min: activeLoan.minAmount || 50000,
                    max: activeLoan.maxAmount || 5000000,
                    step: 50000,
                    unit: "INR",
                  },
                  {
                    label: "Loan Tenure",
                    value: tenureYears,
                    set: setTenureYears,
                    min: minTenureYears,
                    max: maxTenureYears,
                    step: 1,
                    unit: "Years",
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.label}</label>
                      <span className={`text-sm font-black text-slate-900 tabular-nums bg-white px-3 py-1 rounded-lg border ${theme.border} shadow-sm`}>
                        {item.unit === "INR" ? toCurrency(item.value) : `${item.value} ${item.unit}`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={item.min}
                      max={item.max}
                      step={item.step}
                      value={item.value}
                      onChange={(e) => item.set(Number(e.target.value))}
                      className={`w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer ${theme.range}`}
                    />
                  </div>
                ))}

                <div className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Estimated Interest Rate
                    </span>
                    <span className={`text-sm font-black ${theme.text}`}>{rate}% p.a.</span>
                  </div>

                </div>
              </div>

              <div className={`flex flex-col items-center bg-white rounded-[2.5rem] p-8 border ${theme.border} shadow-[0_20px_50px_rgba(0,0,0,0.04)]`}>
                <div className="relative w-32 h-32 mb-6">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="35" stroke="#F1F5F9" strokeWidth="10" fill="transparent" />
                    <MotionCircle
                      cx="50"
                      cy="50"
                      r="35"
                      stroke="currentColor"
                      className={theme.text}
                      strokeWidth="10"
                      fill="transparent"
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset: offset }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      strokeDasharray={circumference}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-xs font-black uppercase ${theme.text}`}>{activeLoan.slug}</span>
                  </div>
                </div>

                <div className="text-center w-full mb-6">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Monthly EMI</span>
                  <h2 className="text-4xl font-black text-slate-900 mt-1 tabular-nums">{toCurrency(emi)}</h2>
                </div>

                <div className="w-full space-y-2 mb-8">
                  <div className="flex justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Interest</span>
                    <span className="text-xs font-bold text-slate-800">{toCurrency(totalInterest)}</span>
                  </div>
                  <div className={`flex justify-between p-3 ${theme.bg} rounded-xl text-white shadow-xl ${theme.shadow}`}>
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-85">Total Payable</span>
                    <span className="text-xs font-bold">{toCurrency(totalAmount)}</span>
                  </div>
                </div>

                <button
                  onClick={handleProceedToApplication}
                  disabled={hasAlreadyApplied}
                  className={`w-full py-4 ${hasAlreadyApplied ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 ' + theme.hover} text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-xl transition-all active:scale-95 shadow-lg`}
                >
                  {hasAlreadyApplied ? "Already Applied" : (activeLoan.ctaText || "Apply Now")}
                </button>
              </div>
            </div>
          </div>
        </section>
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
    </div>
  );
}
