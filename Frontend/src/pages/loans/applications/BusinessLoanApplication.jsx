import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Briefcase, ArrowLeft } from "lucide-react";
import Navbar from "../../../components/navbar/Navbar.jsx";

export default function BusinessLoanApplication() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    businessName: "",
    gstNumber: "",
    annualTurnover: "",
    businessVintageYears: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !form.businessName ||
      !form.gstNumber ||
      !form.annualTurnover ||
      !form.businessVintageYears
    ) {
      setError("All fields are required");
      return;
    }

    // 🔹 API call will go here later
    console.log("Business Loan Payload:", form);

    setSuccess(true);

    setTimeout(() => {
      navigate("/dashboard");
    }, 1500);
  };

  return (
    <section className="min-h-screen app-gradient-bg flex items-center justify-center px-6 pt-28">
      <Navbar />
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-slate-200 p-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <Briefcase className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Business Loan Application
            </h1>
            <p className="text-sm text-slate-500">
              Enter your business details
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-700">
            Application submitted successfully
          </div>
        )}

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-4">

          <input
            name="businessName"
            placeholder="Business Name"
            value={form.businessName}
            onChange={onChange}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />

          <input
            name="gstNumber"
            placeholder="GST Number"
            value={form.gstNumber}
            onChange={onChange}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 uppercase focus:outline-none focus:ring-2 focus:ring-blue-600"
          />

          <input
            name="annualTurnover"
            type="number"
            placeholder="Annual Turnover (₹)"
            value={form.annualTurnover}
            onChange={onChange}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />

          <input
            name="businessVintageYears"
            type="number"
            placeholder="Business Vintage (Years)"
            value={form.businessVintageYears}
            onChange={onChange}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />

          <button
            type="submit"
            className="w-full mt-4 bg-[#0F172A] text-white py-3 rounded-xl font-bold uppercase tracking-widest hover:bg-blue-600 transition-all"
          >
            Submit Application
          </button>
        </form>

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="mt-6 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-blue-600 flex items-center gap-2"
        >
          <ArrowLeft size={14} /> Back
        </button>
      </div>
    </section>
  );
}
