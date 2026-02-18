import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../context/AuthContext.jsx";
import Navbar from "../../components/navbar/Navbar.jsx";
import {
  Car, ArrowLeft, ShieldCheck, Globe, Banknote,
  Clock, CheckCircle2, ChevronDown, FileText, UserCheck,
  Target, Award, Sparkles
} from "lucide-react";
 
const VehicleLoanEMI = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const calcRef = useRef(null);
 
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
 
  // ---------------- STATE ----------------
  const [amount, setAmount] = useState(800000);
  const [rate, setRate] = useState(9.5);
  const [tenure, setTenure] = useState(5);
 
  // ---------------- CALCULATION ----------------
  const monthlyRate = rate / 12 / 100;
  const numberOfMonths = tenure * 12;
 
  const emi = amount * monthlyRate * (Math.pow(1 + monthlyRate, numberOfMonths) /
    (Math.pow(1 + monthlyRate, numberOfMonths) - 1));
 
  const totalAmount = emi * numberOfMonths;
  const totalInterest = totalAmount - amount;
 
  const circumference = 2 * Math.PI * 35;
  const principalPercent = (amount / totalAmount) * 100;
  const offset = circumference - (principalPercent / 100) * circumference;
 
  const formatCurrency = (val) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val);
 
  const scrollToCalculator = () => {
    calcRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
 
  return (
    <div className="min-h-screen app-gradient-bg relative overflow-x-hidden text-slate-900 font-sans">
      <Navbar />
     
      {/* GRID BACKGROUND */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.4]"
        style={{
          backgroundImage: `linear-gradient(#cbd5e1 1px, transparent 1px), linear-gradient(90deg, #cbd5e1 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
 
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24">
       
        {/* NAVIGATION */}
        <div className="pt-8">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-slate-900 hover:text-orange-600 transition-all text-xs font-black uppercase tracking-[0.2em]"
          >
            <ArrowLeft size={14} strokeWidth={3} /> Back to Hub
          </button>
        </div>
 
        {/* --- HERO SECTION --- */}
        <section className="pt-16 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
         
          {/* LEFT CONTENT */}
          <div className="text-left space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm"
            >
              <ShieldCheck size={14} className="text-orange-600" />
              <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">LMS Trust Auto Finance</span>
            </motion.div>
 
            <h1 className="text-5xl md:text-7xl font-serif font-bold text-slate-900 leading-[1.1] tracking-tight">
              Drive Home your <br />
              <span className="text-orange-600 italic">Dream Machine.</span>
            </h1>
           
            <p className="max-w-lg text-slate-600 text-lg font-medium leading-relaxed">
              Competitive rates for luxury, electric, and commercial vehicles.
              Tailored repayment plans with up to 100% on-road financing.
            </p>
 
            <div className="flex gap-4">
               <button
                onClick={scrollToCalculator}
                className="px-8 py-4 bg-orange-600 text-white font-black text-xs uppercase tracking-widest rounded-full shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all flex items-center gap-2"
              >
                Estimate Loan <ChevronDown size={16} />
              </button>
            </div>
          </div>
 
          {/* RIGHT IMAGE CONTAINER */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="relative z-10 w-full aspect-[4/3] rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white">
              <img
                src="https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=1000"
                alt="Luxury Car"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-orange-900/40 to-transparent" />
            </div>
 
           
           
          </motion.div>
        </section>
 
        {/* --- INFO CARDS --- */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-16">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <FileText size={20} className="text-orange-600"/>
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tighter">Documentation</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {["Identity Proof", "Address Proof", "Last 6 Months Bank Statement", "Proforma Invoice", "Salary Slips / ITR", "Photograph"].map((text, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] text-slate-600 font-bold bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <CheckCircle2 size={12} className="text-emerald-500" /> {text}
                </div>
              ))}
            </div>
          </div>
 
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Target size={20} className="text-amber-600"/>
              <h3 className="text-lg font-bold text-slate-900 uppercase tracking-tighter">Financing Journey</h3>
            </div>
            <div className="flex justify-between relative px-2">
              {[
                { icon: <Clock size={16}/>, label: "Calculate" },
                { icon: <FileText size={16}/>, label: "Submit" },
                { icon: <UserCheck size={16}/>, label: "Valuation" },
                { icon: <Award size={16}/>, label: "Delivery" }
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
 
        {/* --- CALCULATOR SECTION --- */}
        <section ref={calcRef} className="pb-16 scroll-mt-6">
          <div className="bg-gradient-to-tr from-white to-orange-50/50 border-2 border-orange-100 rounded-[3rem] p-8 lg:p-12 shadow-[0_40px_100px_-20px_rgba(249,115,22,0.12)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
             
              <div className="space-y-8">
                <header>
                  <h2 className="text-3xl font-serif font-bold text-slate-900 leading-none">Vehicle EMI Estimator</h2>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Adjust sliders to fit your budget</p>
                </header>
 
                {[
                  { label: "Loan Amount", value: amount, set: setAmount, min: 50000, max: 7500000, step: 50000, unit: "₹" },
                  { label: "Interest Rate", value: rate, set: setRate, min: 6, max: 18, step: 0.05, unit: "%" },
                  { label: "Loan Tenure", value: tenure, set: setTenure, min: 1, max: 7, step: 1, unit: "Yrs" },
                ].map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.label}</label>
                      <span className="text-sm font-black text-slate-900 tabular-nums bg-white px-3 py-1 rounded-lg border border-orange-100 shadow-sm">
                        {item.unit === "₹" ? `₹${item.value.toLocaleString("en-IN")}` : `${item.value}${item.unit}`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={item.min} max={item.max} step={item.step}
                      value={item.value}
                      onChange={(e) => item.set(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-orange-500 shadow-sm"
                    />
                  </div>
                ))}
              </div>
 
              {/* Result Area */}
              <div className="flex flex-col items-center bg-white rounded-[2.5rem] p-8 border border-orange-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
                <div className="relative w-32 h-32 mb-6">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="35" stroke="#F1F5F9" strokeWidth="10" fill="transparent" />
                    <motion.circle
                      cx="50" cy="50" r="35" stroke="#f97316" strokeWidth="10" fill="transparent"
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset: offset }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      strokeDasharray={circumference}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                     <Car className="text-orange-600" size={32} />
                  </div>
                </div>
 
                <div className="text-center w-full mb-6">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Monthly Installment</span>
                  <h2 className="text-4xl font-black text-slate-900 mt-1 tabular-nums">{formatCurrency(emi)}</h2>
                </div>
 
                <div className="w-full space-y-2 mb-8">
                  <div className="flex justify-between p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">Total Interest</span>
                    <span className="text-xs font-bold text-slate-800 tracking-normal">{formatCurrency(totalInterest)}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-orange-500 rounded-xl text-white shadow-xl shadow-orange-300/40">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-80">Total Payable</span>
                    <span className="text-xs font-bold tracking-normal">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
 
                <button
                  onClick={() => navigate(isAuthenticated ? "/app" : "/login")}
                  className="w-full py-4 bg-slate-900 text-white font-black uppercase text-[10px] tracking-[0.3em] rounded-xl hover:bg-orange-600 transition-all active:scale-95 shadow-lg"
                >
                  Proceed to Application
                </button>
              </div>
            </div>
          </div>
        </section>
 
        {/* FOOTER */}
        <footer className="py-12 text-center border-t border-slate-200">
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.4em]">
            &copy; 2026 LMS Trust Global Banking • ISO 27001 Certified
          </p>
        </footer>
      </div>
    </div>
  );
};
 
export default VehicleLoanEMI;
 
