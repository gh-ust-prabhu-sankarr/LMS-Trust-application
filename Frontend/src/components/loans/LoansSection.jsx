import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, ArrowRight, User, GraduationCap, Car, Briefcase, CheckCircle2, RefreshCw } from "lucide-react";
import { productApi, unwrap } from "../../api/domainApi.js";
import { mergeLoansWithDefaults } from "../../utils/loanCatalog.js";

const inr = (n) =>
  typeof n === "number"
    ? n.toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      })
    : "-";

const iconByKey = (key) => {
  if (key === "personal") return <User size={28} />;
  if (key === "education") return <GraduationCap size={28} />;
  if (key === "vehicle") return <Car size={28} />;
  return <Briefcase size={28} />;
};

const colorByTheme = (theme) => {
  if (theme === "emerald") return "bg-emerald-600";
  if (theme === "blue") return "bg-blue-600";
  if (theme === "purple") return "bg-purple-600";
  if (theme === "orange") return "bg-amber-500";
  return "bg-slate-900";
};

const toSlide = (loan) => ({
  id: loan?.id, 
  title: loan?.name || "Loan Product",
  subtitle: loan?.badgeText || "Flexible Credit",
  desc: loan?.description || "Flexible loan product designed for your needs.",
  rate: loan?.interestRate != null ? `${loan.interestRate}% APR` : "-",
  limit: loan?.maxAmount != null ? `${inr(loan.maxAmount)} Max` : "-",
  minAmount: loan?.minAmount,
  maxAmount: loan?.maxAmount,
  minTenure: loan?.minTenure,
  maxTenure: loan?.maxTenure,
  minCreditScore: loan?.minCreditScore,
  icon: iconByKey(loan?.key),
  color: colorByTheme(loan?.colorTheme),
  route: `/loan/${loan.slug}`,
  active: loan?.active !== false,
});

export default function LoanSection({ isAuthenticated }) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [index, setIndex] = useState(0);
  const [usingFallback, setUsingFallback] = useState(false);
  const navigate = useNavigate();

  const slides = useMemo(() => {
    const list = (products || []).filter((p) => p?.active !== false);
    return list.map(toSlide);
  }, [products]);

  const loadProducts = async () => {
    setLoading(true);
    setUsingFallback(false);
    try {
      const res = await productApi.getAll();
      const data = unwrap(res) || [];
      const list = Array.isArray(data) ? data : [data];
      setProducts(mergeLoansWithDefaults(list));
    } catch {
      setProducts(mergeLoansWithDefaults([]));
      setUsingFallback(true);
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

  const handlePrev = () => {
    if (!slides.length) return;
    setIndex((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (!slides.length) return;
    setIndex((prev) => (prev >= slides.length - 1 ? 0 : prev + 1));
  };

  const handleLearnMore = (slide) => {
    navigate(slide.route);
  };

  const scrollReveal = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
  };

  return (
    <section id="loan-section" className="py-20 bg-gradient-to-b from-white via-slate-50 to-white relative overflow-hidden flex flex-col items-center justify-center">
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#0F172A 1px, transparent 1px), linear-gradient(90deg, #0F172A 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 lg:px-16 w-full relative z-10">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={scrollReveal} className="mb-10 text-center md:text-left">
          

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mt-3">
            <div>
              <h2 className="text-3xl md:text-5xl font-serif text-slate-900">
                Select Your <span className="italic text-emerald-700">Funding.</span>
              </h2>
              {usingFallback ? (
                <p className="text-xs text-slate-500 mt-2">
                  Showing default loans. Admin-added products will appear once products API is reachable.
                </p>
              ) : null}
            </div>

           
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
            <div className="font-semibold text-slate-700 mb-2 text-lg">No loan products visible</div>
          </div>
        ) : (
          <>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={scrollReveal} className="relative w-full overflow-hidden py-4">
              <motion.div className="flex gap-5 justify-center" animate={{ x: 0 }} transition={{ type: "spring", damping: 25, stiffness: 120 }}>
                <AnimatePresence mode="wait">
                  {slides.map((slide, i) => {
                    const isActive = i === index;
                    return isActive ? (
                      <motion.div
                        key={slide.id || i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="relative shrink-0 w-[75%] md:w-[65%] lg:w-[800px] h-[420px] md:h-[320px] bg-white border border-slate-200 rounded-[1.5rem]
                        shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)]
                        flex flex-col md:flex-row overflow-hidden transition-all hover:shadow-2xl"
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
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.5 }}>
                          <p className="text-slate-600 text-sm md:text-base mb-5 max-w-lg leading-relaxed">{slide.desc}</p>

                          <motion.div className="flex flex-wrap gap-3 mb-6" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }} initial="hidden" animate="visible">
                            {[
                              slide.minCreditScore != null ? `Min CIBIL: ${slide.minCreditScore}` : null,
                              slide.minTenure != null && slide.maxTenure != null ? `Tenure: ${slide.minTenure}-${slide.maxTenure} months` : null,
                              slide.minAmount != null && slide.maxAmount != null ? `Amount: ${inr(slide.minAmount)} - ${inr(slide.maxAmount)}` : null,
                            ]
                              .filter(Boolean)
                              .map((tag) => (
                                <motion.div key={tag} variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }} className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                  <CheckCircle2 size={12} className="text-emerald-500" />
                                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{tag}</span>
                                </motion.div>
                              ))}
                          </motion.div>
                        </motion.div>

                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLearnMore(slide);
                          }}
                          className="px-6 py-2.5 bg-slate-900 text-white text-[10px]
                          font-black uppercase tracking-widest hover:bg-emerald-700
                          rounded-lg shadow-md flex items-center gap-2 w-fit transition-all
                          hover:shadow-lg active:scale-95"
                          type="button"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3, duration: 0.5 }}
                          whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)" }}
                          whileTap={{ scale: 0.98 }}
                        >
                          {isAuthenticated ? (
                            <>
                              Apply Now <ArrowRight size={12} />
                            </>
                          ) : (
                            <>
                              <ArrowRight size={12} />
                              Explore Loan
                            </>
                          )}
                        </motion.button>
                      </div>
                    </motion.div>
                    ) : null;
                  })}
                </AnimatePresence>
              </motion.div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={scrollReveal} className="flex items-center justify-end gap-3 mt-10">
              <motion.div className="flex items-center gap-3" initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
                <motion.button
                  onClick={handlePrev}
                  disabled={slides.length <= 1}
                  className="w-11 h-11 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ChevronLeft size={20} strokeWidth={2.5} />
                </motion.button>
                <motion.button
                  onClick={handleNext}
                  disabled={slides.length <= 1}
                  className="w-11 h-11 rounded-full border-2 border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ChevronRight size={20} strokeWidth={2.5} />
                </motion.button>
              </motion.div>
            </motion.div>
          </>
        )}
      </div>
    </section>
  );
}
