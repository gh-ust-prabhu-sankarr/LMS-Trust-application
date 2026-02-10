import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  User,
  GraduationCap,
  Car,
  Briefcase,
  CheckCircle2,
  RefreshCw,
  Lock,
} from "lucide-react";
import { productApi, unwrap } from "../../api/domainApi.js";

const inr = (n) =>
  typeof n === "number"
    ? n.toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      })
    : "-";

const pickMeta = (name = "") => {
  const n = String(name || "").toLowerCase();

  if (n.includes("personal"))
    return {
      icon: <User size={28} />,
      color: "bg-emerald-600",
      subtitle: "Instant Liquidity",
      route: "/loan/personal",
    };
  if (n.includes("education") || n.includes("educational") || n.includes("student"))
    return {
      icon: <GraduationCap size={28} />,
      color: "bg-purple-600",
      subtitle: "Future Investment",
      route: "/loan/education",
    };
  if (n.includes("vehicle") || n.includes("car") || n.includes("auto"))
    return {
      icon: <Car size={28} />,
      color: "bg-amber-500",
      subtitle: "Asset Financing",
      route: "/loan/vehicle",
    };
  if (n.includes("business") || n.includes("msme") || n.includes("working"))
    return {
      icon: <Briefcase size={28} />,
      color: "bg-blue-600",
      subtitle: "Enterprise Scaling",
      route: "/loan/business",
    };

  return {
    icon: <Briefcase size={28} />,
    color: "bg-slate-900",
    subtitle: "Flexible Credit",
    route: "/loan/business",
  };
};

const toSlide = (p) => {
  const meta = pickMeta(p?.name);
  return {
    id: p?.id,
    title: p?.name || "Loan Product",
    subtitle: meta.subtitle,
    desc: p?.description || "Flexible loan product designed for your needs.",
    rate: p?.interestRate != null ? `${p.interestRate}% APR` : "-",
    limit: p?.maxAmount != null ? `${inr(p.maxAmount)} Max` : "-",
    minAmount: p?.minAmount,
    maxAmount: p?.maxAmount,
    minTenure: p?.minTenure,
    maxTenure: p?.maxTenure,
    minCreditScore: p?.minCreditScore,
    icon: meta.icon,
    color: meta.color,
    route: meta.route,
    active: p?.active !== false,
  };
};

// ✅ Only used if backend/server is DOWN (not for 403/401)
const DEMO_PRODUCTS = [
  {
    id: "demo-1",
    name: "Personal Loan",
    description: "Quick personal loans for your immediate financial needs with flexible repayment options.",
    minAmount: 50000,
    maxAmount: 500000,
    minTenure: 12,
    maxTenure: 60,
    interestRate: 10.5,
    minCreditScore: 650,
    active: true,
  },
  {
    id: "demo-2",
    name: "Business Loan",
    description: "Fuel your business growth with flexible funding solutions designed for entrepreneurs.",
    minAmount: 100000,
    maxAmount: 5000000,
    minTenure: 12,
    maxTenure: 84,
    interestRate: 12.0,
    minCreditScore: 700,
    active: true,
  },
  {
    id: "demo-3",
    name: "Education Loan",
    description: "Invest in your future with our comprehensive education financing programs.",
    minAmount: 100000,
    maxAmount: 2000000,
    minTenure: 12,
    maxTenure: 120,
    interestRate: 9.5,
    minCreditScore: 600,
    active: true,
  },
  {
    id: "demo-4",
    name: "Vehicle Loan",
    description: "Drive your dream vehicle with competitive auto financing options.",
    minAmount: 200000,
    maxAmount: 1500000,
    minTenure: 12,
    maxTenure: 72,
    interestRate: 11.0,
    minCreditScore: 650,
    active: true,
  },
];

export default function LoanSection({ isAuthenticated, onRequireLogin }) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [index, setIndex] = useState(0);
  const [usingDemo, setUsingDemo] = useState(false);
  const [blocked, setBlocked] = useState(false); // ✅ true when 401/403
  const navigate = useNavigate();

  const slides = useMemo(() => {
    const list = (products || []).filter((p) => p?.active !== false);
    return list.map(toSlide);
  }, [products]);

  const activeSlide = slides[index] || null;

  const loadProducts = async () => {
    setLoading(true);
    setUsingDemo(false);
    setBlocked(false);

    try {
      const res = await productApi.getAll();
      const data = unwrap(res) || [];
      const list = Array.isArray(data) ? data : [data];
      setProducts(list);
    } catch (e) {
      const status = e?.response?.status;

      //  If backend blocks product listing before login -> SHOW MESSAGE (no demo)
      if (status === 401 || status === 403) {
        setProducts([]);
        setBlocked(true);
        return;
      }

      //  Only if server/network error -> show demo products
      setProducts(DEMO_PRODUCTS);
      setUsingDemo(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (!slides.length) return;
    if (index > slides.length - 1) setIndex(0);
  }, [slides.length, index]);

  useEffect(() => {
    if (!slides.length || slides.length === 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev >= slides.length - 1 ? 0 : prev + 1));
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handlePrev = () => {
    if (!slides.length) return;
    setIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (!slides.length) return;
    setIndex((prev) => (prev >= slides.length - 1 ? 0 : prev + 1));
  };

  const handleLearnMore = (slide) => {
    if (!isAuthenticated) {
      onRequireLogin?.();
      return;
    }
    navigate(slide.route);
  };

  const scrollReveal = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
  };

  return (
    <section id="loan-section" className="py-20 bg-slate-50 relative overflow-hidden flex flex-col items-center justify-center">
      <div
        className="absolute inset-0 opacity-[0.09] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#0F172A 1px, transparent 1px), linear-gradient(90deg, #0F172A 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 lg:px-16 w-full relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={scrollReveal}
          className="mb-10 text-center md:text-left"
        >
          <span className="text-emerald-700 font-bold tracking-[0.3em] uppercase text-[9px] bg-emerald-50 px-3 py-1 rounded-sm border border-emerald-100">
            Active Portfolios
          </span>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mt-3">
            <div>
              <h2 className="text-3xl md:text-5xl font-serif text-slate-900">
                Select Your <span className="italic text-emerald-700">Funding.</span>
              </h2>
              {usingDemo ? (
                <p className="text-xs text-slate-500 mt-2">Demo products (server not reachable). Login later to see live products.</p>
              ) : null}
              {blocked ? (
                <p className="text-xs text-rose-600 mt-2">
                  Products API is blocked (401/403). Backend must allow <b>GET /api/products</b> as <b>permitAll</b>.
                </p>
              ) : null}
            </div>

            <button
              onClick={loadProducts}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-900 hover:text-white transition-all flex items-center gap-2 justify-center"
              type="button"
            >
              <RefreshCw size={12} />
              Refresh Products
            </button>
          </div>
        </motion.div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <div className="animate-pulse">
              <div className="w-16 h-16 bg-slate-100 rounded-full mx-auto mb-4"></div>
              <div className="h-4 bg-slate-100 rounded w-48 mx-auto mb-2"></div>
              <div className="h-3 bg-slate-100 rounded w-32 mx-auto"></div>
            </div>
            <p className="text-slate-600 font-medium mt-4 text-sm">Loading loan products...</p>
          </div>
        ) : !slides.length ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <div className="max-w-md mx-auto">
              <Briefcase size={48} className="mx-auto mb-4 text-slate-300" />
              <div className="font-semibold text-slate-700 mb-2 text-lg">No Products Visible</div>
              <div className="text-sm text-slate-500 mb-6">
                If Admin already created products but you still see this, backend is blocking public access.
                <br />
                 Allow <b>GET /api/products</b> in SecurityConfig (permitAll).
              </div>
              <button
                onClick={loadProducts}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-900 hover:text-white transition-all inline-flex items-center gap-2"
                type="button"
              >
                <RefreshCw size={12} />
                Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={scrollReveal}
              className="relative w-full overflow-hidden py-4"
            >
              <motion.div
                className="flex gap-5"
                animate={{ x: `calc(12.5% - ${index * 75}% - ${index * 20}px)` }}
                transition={{ type: "spring", damping: 25, stiffness: 120 }}
              >
                {slides.map((slide, i) => {
                  const isActive = i === index;
                  return (
                    <motion.div
                      key={slide.id || i}
                      onClick={() => setIndex(i)}
                      animate={{
                        scale: isActive ? 1 : 0.85,
                        opacity: isActive ? 1 : 0.3,
                        filter: isActive ? "blur(0px)" : "blur(6px)",
                      }}
                      whileTap={{ scale: 0.98 }}
                      className="relative shrink-0 w-[75%] md:w-[65%] lg:w-[800px] h-[420px] md:h-[320px] bg-white border border-slate-200 rounded-[1.5rem]
                      shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]
                      flex flex-col md:flex-row overflow-hidden cursor-pointer transition-all"
                    >
                      <div className={`w-full md:w-[30%] ${slide.color} p-6 md:p-8 flex flex-col justify-between text-white`}>
                        <div>
                          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-4 shadow-lg">
                            {slide.icon}
                          </div>
                          <h3 className="text-xl md:text-2xl font-bold leading-tight">{slide.title}</h3>
                          <p className="text-white/70 text-[10px] uppercase tracking-widest mt-2">{slide.subtitle}</p>
                        </div>

                        <div className="flex gap-4 pt-4 border-t border-white/20 text-xs">
                          <div>
                            <span className="opacity-60 uppercase text-[9px] tracking-wider">Rate</span>
                            <span className="block font-bold text-sm mt-0.5">{slide.rate}</span>
                          </div>
                          <div>
                            <span className="opacity-60 uppercase text-[9px] tracking-wider">Limit</span>
                            <span className="block font-bold text-sm mt-0.5">{slide.limit}</span>
                          </div>
                        </div>
                      </div>

                      <div className="w-full md:w-[70%] p-6 md:p-8 flex flex-col justify-between bg-white">
                        <div>
                          <p className="text-slate-600 text-sm md:text-base mb-5 max-w-lg leading-relaxed">{slide.desc}</p>

                          <div className="flex flex-wrap gap-3 mb-6">
                            {[
                              slide.minCreditScore != null ? `Min CIBIL: ${slide.minCreditScore}` : null,
                              slide.minTenure != null && slide.maxTenure != null ? `Tenure: ${slide.minTenure}-${slide.maxTenure} months` : null,
                              slide.minAmount != null && slide.maxAmount != null ? `Amount: ${inr(slide.minAmount)} - ${inr(slide.maxAmount)}` : null,
                            ]
                              .filter(Boolean)
                              .map((tag) => (
                                <div
                                  key={tag}
                                  className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100"
                                >
                                  <CheckCircle2 size={12} className="text-emerald-500" />
                                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{tag}</span>
                                </div>
                              ))}
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLearnMore(slide);
                          }}
                          className="px-6 py-2.5 bg-slate-900 text-white text-[10px]
                          font-black uppercase tracking-widest hover:bg-emerald-700
                          rounded-lg shadow-md flex items-center gap-2 w-fit transition-all
                          hover:shadow-lg active:scale-95"
                          type="button"
                        >
                          {isAuthenticated ? (
                            <>
                              Apply Now <ArrowRight size={12} />
                            </>
                          ) : (
                            <>
                              <Lock size={12} />
                              Login to Apply
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={scrollReveal}
              className="flex flex-col md:flex-row items-center justify-between gap-6 mt-10"
            >
              <div className="w-full max-w-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Progress</span>
                  <span className="text-[10px] font-bold text-slate-600">
                    {index + 1} / {slides.length}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${activeSlide?.color || "bg-slate-900"}`}
                    animate={{ width: `${((index + 1) / slides.length) * 100}%` }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrev}
                  disabled={slides.length <= 1}
                  className="w-11 h-11 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                  type="button"
                >
                  <ChevronLeft size={20} strokeWidth={2.5} />
                </button>
                <button
                  onClick={handleNext}
                  disabled={slides.length <= 1}
                  className="w-11 h-11 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                  type="button"
                >
                  <ChevronRight size={20} strokeWidth={2.5} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </section>
  );
}
