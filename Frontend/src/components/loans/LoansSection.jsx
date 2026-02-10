import { useEffect, useMemo, useRef, useState } from "react";
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
    return { icon: <User size={28} />, color: "bg-emerald-600", subtitle: "Instant Liquidity", route: "/loan/personal" };
  if (n.includes("education") || n.includes("student"))
    return { icon: <GraduationCap size={28} />, color: "bg-purple-600", subtitle: "Future Investment", route: "/loan/education" };
  if (n.includes("vehicle") || n.includes("car"))
    return { icon: <Car size={28} />, color: "bg-amber-500", subtitle: "Asset Financing", route: "/loan/vehicle" };
  if (n.includes("business") || n.includes("msme") || n.includes("working"))
    return { icon: <Briefcase size={28} />, color: "bg-blue-600", subtitle: "Enterprise Scaling", route: "/loan/business" };
  return { icon: <Briefcase size={28} />, color: "bg-slate-900", subtitle: "Flexible Credit", route: "/loan/business" };
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

const DEMO_PRODUCTS = [
  { id: "demo-1", name: "Personal Loan", description: "Quick personal loans for your immediate needs.", minAmount: 50000, maxAmount: 500000, interestRate: 10.5, active: true },
  { id: "demo-2", name: "Business Loan", description: "Fuel your business growth with flexible funding.", minAmount: 100000, maxAmount: 5000000, interestRate: 12.0, active: true },
  { id: "demo-3", name: "Education Loan", description: "Invest in your future with education programs.", minAmount: 100000, maxAmount: 2000000, interestRate: 9.5, active: true },
  { id: "demo-4", name: "Vehicle Loan", description: "Drive your dream vehicle with auto financing.", minAmount: 200000, maxAmount: 1500000, interestRate: 11.0, active: true },
];

export default function LoanSection({ isAuthenticated, onRequireLogin }) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [index, setIndex] = useState(0);
  const [usingDemo, setUsingDemo] = useState(false);

  const [containerW, setContainerW] = useState(0);
  const [cardW, setCardW] = useState(0);
  const [gapPx, setGapPx] = useState(20);

  const navigate = useNavigate();

  // ✅ refs to measure exact sizes
  const trackRef = useRef(null);
  const cardRef = useRef(null);

  const slides = useMemo(() => {
    const list = (products || []).filter((p) => p?.active !== false);
    return list.map(toSlide);
  }, [products]);

  const activeSlide = slides[index] || null;

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await productApi.getAll();
      const data = unwrap(res) || [];
      setProducts(Array.isArray(data) ? data : [data]);
      setUsingDemo(false);
    } catch (e) {
      setProducts(DEMO_PRODUCTS);
      setUsingDemo(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // keep index safe when slides length changes
  useEffect(() => {
    if (!slides.length) return;
    if (index > slides.length - 1) setIndex(0);
  }, [slides.length, index]);

  // Timer: 6s normal, 12s for last slide (stays longer)
  useEffect(() => {
    if (!slides.length || slides.length === 1) return;
    const isLastSlide = index === slides.length - 1;
    const delay = isLastSlide ? 12000 : 6000;

    const timer = setTimeout(() => {
      setIndex((prev) => (prev >= slides.length - 1 ? 0 : prev + 1));
    }, delay);

    return () => clearTimeout(timer);
  }, [index, slides.length]);

  // ✅ Measure container width, card width, and flex gap (works on resize too)
  useEffect(() => {
    const track = trackRef.current;
    const card = cardRef.current;
    if (!track || !card) return;

    const read = () => {
      const trackRect = track.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();

      setContainerW(trackRect.width);
      setCardW(cardRect.width);

      const style = window.getComputedStyle(track);
      const g = parseFloat(style.columnGap || style.gap || "20");
      if (!Number.isNaN(g)) setGapPx(g);
    };

    read();

    const ro = new ResizeObserver(() => read());
    ro.observe(track);
    ro.observe(card);

    return () => ro.disconnect();
  }, [slides.length]);

  const handlePrev = () => {
    if (!slides.length) return;
    setIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (!slides.length) return;
    setIndex((prev) => (prev >= slides.length - 1 ? 0 : prev + 1));
  };

  // ✅ Perfect centering: centerPad - index*(card+gap)
  const centerPad = Math.max((containerW - cardW) / 2, 0);
  const xOffsetPx = centerPad - index * (cardW + gapPx);

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
        <div className="mb-10 text-center md:text-left">
          <span className="text-emerald-700 font-bold tracking-[0.3em] uppercase text-[9px] bg-emerald-50 px-3 py-1 rounded-sm border border-emerald-100">
            Active Portfolios
          </span>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mt-3">
            <div>
              <h2 className="text-3xl md:text-5xl font-serif text-slate-900">
                Select Your <span className="italic text-emerald-700">Funding.</span>
              </h2>
              {usingDemo ? (
                <p className="text-xs text-slate-500 mt-2">
                  Demo products (server not reachable). Login later to see live products.
                </p>
              ) : null}
            </div>

            <button
              onClick={loadProducts}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-900 hover:text-white transition-all flex items-center gap-2 justify-center"
              type="button"
            >
              <RefreshCw size={12} />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center animate-pulse">
            <p className="text-slate-600 font-medium text-sm">Loading loan products...</p>
          </div>
        ) : !slides.length ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <div className="max-w-md mx-auto">
              <Briefcase size={48} className="mx-auto mb-4 text-slate-300" />
              <div className="font-semibold text-slate-700 mb-2 text-lg">No Products Visible</div>
              <div className="text-sm text-slate-500 mb-6">Admin has not published products yet or backend is blocking access.</div>
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
            <div className="relative w-full overflow-hidden py-4">
              <motion.div
                ref={trackRef}
                className="flex gap-5"
                animate={{ x: xOffsetPx }}
                transition={{ type: "spring", damping: 30, stiffness: 70 }}
              >
                {slides.map((slide, i) => (
                  <motion.div
                    key={slide.id || i}
                    ref={i === 0 ? cardRef : null} // ✅ measure first card (same width for all)
                    onClick={() => setIndex(i)}
                    animate={{
                      scale: i === index ? 1 : 0.85,
                      opacity: i === index ? 1 : 0.3,
                      filter: i === index ? "blur(0px)" : "blur(6px)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    className="relative shrink-0 w-[75%] md:w-[65%] lg:w-[800px] h-[420px] md:h-[320px] bg-white border border-slate-200 rounded-[1.5rem] shadow-xl flex flex-col md:flex-row overflow-hidden cursor-pointer"
                  >
                    <div className={`w-full md:w-[30%] ${slide.color} p-6 md:p-8 flex flex-col justify-between text-white`}>
                      <div>
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center mb-4">
                          {slide.icon}
                        </div>
                        <h3 className="text-xl md:text-2xl font-bold">{slide.title}</h3>
                        <p className="text-white/70 text-[10px] uppercase tracking-widest mt-2">{slide.subtitle}</p>
                      </div>
                      <div className="flex gap-4 pt-4 border-t border-white/20 text-xs">
                        <div>
                          <span className="opacity-60 text-[9px]">Rate</span>
                          <span className="block font-bold">{slide.rate}</span>
                        </div>
                        <div>
                          <span className="opacity-60 text-[9px]">Limit</span>
                          <span className="block font-bold">{slide.limit}</span>
                        </div>
                      </div>
                    </div>

                    <div className="w-full md:w-[70%] p-6 md:p-8 flex flex-col justify-between bg-white">
                      <div>
                        <p className="text-slate-600 text-sm mb-5 leading-relaxed">{slide.desc}</p>
                        <div className="flex flex-wrap gap-3 mb-6">
                          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                            <CheckCircle2 size={12} className="text-emerald-500" />
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Fast Approval</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isAuthenticated) navigate(slide.route);
                          else onRequireLogin?.();
                        }}
                        className="px-6 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 rounded-lg shadow-md flex items-center gap-2 w-fit transition-all"
                        type="button"
                      >
                        {isAuthenticated ? (
                          <>
                            Apply Now <ArrowRight size={12} />
                          </>
                        ) : (
                          <>
                            <Lock size={12} /> Login to Apply
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mt-10">
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
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrev}
                  disabled={slides.length <= 1}
                  className="w-11 h-11 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-900 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  type="button"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={handleNext}
                  disabled={slides.length <= 1}
                  className="w-11 h-11 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-900 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  type="button"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
