import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { GraduationCap, ArrowLeft, ShieldCheck, School, BookOpen, IndianRupee } from "lucide-react";
import Navbar from "../../../components/navbar/Navbar.jsx";
import { usePopup } from "../../../components/ui/PopupProvider.jsx";

const EducationLoanApplication = () => {
  const navigate = useNavigate();
  const { showPopup } = usePopup();
  const { state } = useLocation();

  const {
    amount = 0,
    rate = 0,
    tenure = 0,
    emi = 0,
  } = state || {};

  const [formData, setFormData] = useState({
    instituteName: "",
    courseName: "",
    courseFee: "",
    coApplicantRequired: true,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    showPopup("Application submitted for review.", { type: "success" });
    navigate("/");
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <section className="relative min-h-screen w-full bg-[#F8FAFC] flex items-center justify-center p-6 pt-28">
      <Navbar />
      {/* Refined Background Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: `radial-gradient(#0F172A 1px, transparent 1px)`, backgroundSize: "30px 30px" }}
      />

      <div className="relative z-10 w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* LEFT: Clean Form Section (8 Columns) */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors mb-8 text-sm font-medium"
          >
            <ArrowLeft size={16} /> Back to calculation
          </button>

          <header className="mb-10">
            <h1 className="text-3xl font-serif font-semibold text-slate-900 mb-2">
              Loan Application
            </h1>
            <p className="text-slate-500">Provide your academic and enrollment details below.</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Institute Name</label>
                <div className="relative">
                  <School className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    name="instituteName"
                    required
                    value={formData.instituteName}
                    onChange={handleChange}
                    placeholder="University name"
                    className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-slate-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Course Name</label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    name="courseName"
                    required
                    value={formData.courseName}
                    onChange={handleChange}
                    placeholder="Degree/Program"
                    className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-slate-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Annual Course Fee</label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="number"
                  name="courseFee"
                  required
                  value={formData.courseFee}
                  onChange={handleChange}
                  placeholder="0.00"
                  className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-slate-900 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-slate-100/50 rounded-lg border border-slate-200/60">
              <input
                type="checkbox"
                name="coApplicantRequired"
                id="coapp"
                checked={formData.coApplicantRequired}
                onChange={handleChange}
                className="w-4 h-4 accent-slate-900 rounded cursor-pointer"
              />
              <label htmlFor="coapp" className="text-sm font-medium text-slate-600 cursor-pointer">
                I have a co-applicant (Parent/Guardian) available for this loan.
              </label>
            </div>

            <button
              type="submit"
              className="w-full md:w-fit px-12 py-4 bg-slate-900 text-white font-bold uppercase text-[11px] tracking-[0.2em] rounded-md shadow-lg hover:bg-slate-800 transition-all active:scale-95"
            >
              Submit Application
            </button>
          </form>
        </div>

        {/* RIGHT: Professional Summary Sidebar (4 Columns) */}
        <div className="lg:col-span-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-8 sticky top-12 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center">
                <GraduationCap className="text-purple-600" size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Application Summary</h3>
                <p className="text-[11px] text-emerald-600 font-bold uppercase tracking-tight flex items-center gap-1">
                  <ShieldCheck size={12} /> Pre-approved Estimate
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-end border-b border-slate-50 pb-4">
                <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Loan Amount</span>
                <span className="text-xl font-black text-slate-900">{formatCurrency(amount)}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">EMI</span>
                  <span className="text-sm font-bold text-slate-900">{formatCurrency(emi)}</span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Tenure</span>
                  <span className="text-sm font-bold text-slate-900">{tenure} Years</span>
                </div>
              </div>

              <div className="flex justify-between items-center px-2">
                <span className="text-xs text-slate-500 font-medium">Interest Rate</span>
                <span className="text-xs font-bold text-purple-600">{rate}% Fixed P.A.</span>
              </div>
            </div>

            <div className="mt-10 pt-6 border-t border-slate-100">
               <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                 Our representatives will contact you within 24 business hours to verify your documents and institute details.
               </p>
            </div>
          </div> 
        </div>

      </div>
    </section>
  );
};

export default EducationLoanApplication;
