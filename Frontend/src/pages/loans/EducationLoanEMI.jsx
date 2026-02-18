import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "../../components/navbar/Navbar.jsx";
import {
  GraduationCap, ArrowLeft, ShieldCheck, Globe, Banknote,
  Clock, CheckCircle2, ChevronDown, FileText, UserCheck,
  Target, Award, Sparkles
} from "lucide-react";
 
const EducationLoanEMI = () => {
  const navigate = useNavigate();
  const calcRef = useRef(null);
 
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
 
 
  const [amount, setAmount] = useState(500000);
  const [rate, setRate] = useState(9.0);
  const [tenure, setTenure] = useState(15);
 
  const moratoriumYears = 5;
  const repaymentYears = Math.max(tenure - moratoriumYears, 1);
 
  
  const annualRate = rate / 100;
  const monthlyRate = annualRate / 12;
  const amountAfterMoratorium = amount * Math.pow(1 + annualRate, moratoriumYears);
  const repaymentMonths = repaymentYears * 12;
 
  const emi = (amountAfterMoratorium * monthlyRate * Math.pow(1 + monthlyRate, repaymentMonths)) /
    (Math.pow(1 + monthlyRate, repaymentMonths) - 1);
 
  const totalAmount = emi * repaymentMonths;
  const totalInterest = totalAmount - amount;
 
  const circumference = 2 * Math.PI * 35;
  const principalPercent = (amount / (amount + totalInterest)) * 100;
  const offset = circumference - (principalPercent / 100) * circumference;
 
  const formatCurrency = (val) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);
 
  const scrollToCalculator = () => {
    calcRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
 
  return (
    <div className="min-h-screen app-gradient-bg relative overflow-x-hidden text-slate-900">
      <Navbar />
     
      
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.4]"
        style={{
          backgroundImage: `linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
 
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24">
       
      
        <div className="pt-8">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-slate-900 hover:text-purple-700 transition-all text-xs font-black uppercase tracking-[0.2em]"
          >
            <ArrowLeft size={14} strokeWidth={3} /> Back to Hub
          </button>
        </div>
 
      
        <section className="pt-16 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
         
    
          <div className="text-left space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm"
            >
              <ShieldCheck size={14} className="text-purple-700" />
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">LMS Trust Certified Portal</span>
            </motion.div>
 
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-slate-900 leading-[1.1] tracking-tight">
              Invest in your <br />
              <span className="text-purple-600 italic">Academic Future.</span>
            </h1>
           
            <p className="max-w-lg text-slate-600 text-lg font-medium leading-relaxed">
              Fuel your dreams with India's most flexible education loans. Covers tuition,
              living expenses, and travel with deferred repayment options.
            </p>
 
            <div className="flex gap-4">
               <button
                onClick={scrollToCalculator}
                className="px-8 py-4 bg-purple-600 text-white font-black text-xs uppercase tracking-widest rounded-full shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all flex items-center gap-2"
              >
                Estimate EMI <ChevronDown size={16} />
              </button>
            </div>
          </div>
 
    
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative z-10 w-full aspect-[4/3] rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white">
              <img
                src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=1000"
                alt="Students stud      {/* Overlay Gradient */}ying"
                className="w-full h-full object-cover"
              />
        
              <div className="absolute inset-0 bg-gradient-to-t from-purple-900/40 to-transparent" />
            </div>
 
         
            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute -top-6 -right-6 z-20 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 hidden md:block"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                  <Sparkles size={20} />
                </div>
               
              </div>
            </motion.div>
 
       
            <motion.div
              animate={{ y: [0, 15, 0] }}
              transition={{ duration: 5, repeat: Infinity, delay: 0.5 }}
              className="absolute -bottom-6 -left-6 z-20 bg-white p-4 rounded-2xl shadow-xl border border-slate-100 hidden md:block"
            >
             
            </motion.div>
          </motion.div>
        </section>
 
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          {[
            { icon: <Globe size={20} />, title: "Global Reach", desc: "India & Overseas Institutions" },
            { icon: <Banknote size={20} />, title: "Max Funding", desc: "Up to ₹1.5 Crore Sanction" },
            { icon: <Clock size={20} />, title: "Quick Sanction", desc: "Approval in 48 Hours" },
          ].map((f, i) => (
            <div key={i} className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">{f.icon}</div>
              <div>
                <h3 className="font-black text-slate-900 text-xs uppercase tracking-tight">{f.title}</h3>
                <p className="text-slate-500 text-[11px] font-bold leading-tight">{f.desc}</p>
              </div>
            </div>
          ))}
        </section>
 
    =
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <FileText size={20} className="text-blue-600"/>
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tighter">Required Paperwork</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {["Admission Letter", "Cost Breakdown", "Academic Records", "KYC Docs", "Income Proof", "Passport"].map((text, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-slate-600 font-bold bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <CheckCircle2 size={12} className="text-emerald-500" /> {text}
                </div>
              ))}
            </div>
          </div>
 
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Target size={20} className="text-orange-600"/>
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tighter">The LMS Process</h3>
            </div>
            <div className="flex justify-between relative px-2">
              {[
                { icon: <Clock size={16}/>, label: "Calculate" },
                { icon: <FileText size={16}/>, label: "Apply" },
                { icon: <UserCheck size={16}/>, label: "Verify" },
                { icon: <Award size={16}/>, label: "Sanction" }
              ].map((step, i) => (
                <div key={i} className="flex flex-col items-center z-10">
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center mb-2 shadow-lg">
                    {step.icon}
                  </div>
                  <span className="text-[9px] font-black uppercase text-slate-500">{step.label}</span>
                </div>
              ))}
              <div className="absolute top-5 left-0 right-0 h-[2px] bg-slate-100 -z-0" />
            </div>
          </div>
        </section>
 
        <section ref={calcRef} className="pb-16 scroll-mt-6">
          <div className="bg-gradient-to-tr from-white to-purple-50/50 border-2 border-purple-100 rounded-[3rem] p-8 lg:p-12 shadow-[0_40px_100px_-20px_rgba(124,58,237,0.12)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-8">
                <header>
                  <h2 className="text-3xl font-serif font-bold text-slate-900 leading-none">EMI Estimator</h2>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Personalized Financial Forecast</p>
                </header>
                {[
                  { label: "Loan Amount", value: amount, set: setAmount, min: 50000, max: 7500000, step: 50000, unit: "₹" },
                  { label: "Interest Rate", value: rate, set: setRate, min: 8, max: 15, step: 0.05, unit: "%" },
                  { label: "Loan Tenure", value: tenure, set: setTenure, min: 6, max: 20, step: 1, unit: "Yrs" },
                ].map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.label}</label>
                      <span className="text-sm font-black text-slate-900 tabular-nums bg-white px-3 py-1 rounded-lg border border-purple-100 shadow-sm">
                        {item.unit === "₹" ? `₹${item.value.toLocaleString("en-IN")}` : `${item.value}${item.unit}`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={item.min} max={item.max} step={item.step}
                      value={item.value}
                      onChange={(e) => item.set(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-purple-600 shadow-sm"
                    />
                  </div>
                ))}
                <div className="bg-white/60 backdrop-blur p-4 rounded-2xl border border-purple-50 flex gap-3 shadow-sm italic text-[10px] text-slate-600 font-bold">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  Calculated with a 5-year grace period. Only simple interest is capitalized during study.
                </div>
              </div>
 
             
              <div className="flex flex-col items-center bg-white rounded-[2.5rem] p-8 border border-purple-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
                <div className="relative w-32 h-32 mb-6">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="35" stroke="#F1F5F9" strokeWidth="10" fill="transparent" />
                    <motion.circle
                      cx="50" cy="50" r="35" stroke="#9333ea" strokeWidth="10" fill="transparent"
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset: offset }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      strokeDasharray={circumference}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                     <GraduationCap className="text-purple-600" size={32} />
                  </div>
                </div>
                <div className="text-center w-full mb-6">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Monthly EMI</span>
                  <h2 className="text-4xl font-black text-slate-900 mt-1 tabular-nums">{formatCurrency(emi)}</h2>
                </div>
                <div className="w-full space-y-2 mb-8">
                  <div className="flex justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <span>Total Interest</span>
                    <span className="text-xs font-bold text-slate-800 tracking-normal capitalize">{formatCurrency(totalInterest)}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-purple-600 rounded-xl text-white shadow-xl shadow-purple-300/40 text-[9px] font-black uppercase tracking-widest">
                    <span className="opacity-80">Total Payable</span>
                    <span className="text-xs font-bold tracking-normal capitalize">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/education-loan/apply", { state: { amount, rate, tenure, emi, totalAmount } })}
                  className="w-full py-4 bg-slate-900 text-white font-black uppercase text-[10px] tracking-[0.3em] rounded-xl hover:bg-purple-700 transition-all active:scale-95 shadow-lg"
                >
                  Proceed to Application
                </button>
              </div>
            </div>
          </div>
        </section>
 
     
        <footer className="py-12 text-center border-t border-slate-200">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">
            &copy; 2026 LMS Trust Global Banking • ISO 27001 Certified
          </p>
        </footer>
      </div>
    </div>
  );
};
 
export default EducationLoanEMI;
