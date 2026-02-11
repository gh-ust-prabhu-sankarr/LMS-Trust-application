import React from 'react';
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  TrendingUp, 
  Landmark, 
  ShieldCheck, 
  PieChart, 
  User, 
  GraduationCap, 
  Car, 
  Briefcase 
} from "lucide-react";

const Hero = ({ onProtectedAction }) => {
  const loans = [
    { icon: <User size={22}/>, label: "Personal", gradient: "from-emerald-400 to-teal-600" },
    { icon: <GraduationCap size={22}/>, label: "Educational", gradient: "from-purple-400 to-indigo-600" },
    { icon: <Car size={22}/>, label: "Vehicle", gradient: "from-amber-400 to-orange-500" },
    { icon: <Briefcase size={22}/>, label: "Business", gradient: "from-blue-400 to-cyan-600" },
  ];

  const handleGetStarted = () => {
    const section = document.getElementById("loan-section");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <section className="relative min-h-[95vh] w-full overflow-hidden bg-slate-50 flex items-center pt-24">
      {/* --- BACKGROUND griddTEXTURE --- */}
      <div
        className="absolute inset-0 opacity-[0.09] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#0F172A 1px, transparent 1px), linear-gradient(90deg, #0F172A 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Decorative Ambient Glows */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none translate-x-1/4 -translate-y-1/4" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none -translate-x-1/4 translate-y-1/4" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* LEFT SIDE: Content (Unchanged Typography) */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col items-start text-left"
        >
         
          <h1 className="text-5xl lg:text-7xl font-serif font-medium tracking-tight text-[#0F172A] leading-[1.1] mb-8">
            Your Finance. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 font-semibold">
              Centralized.
            </span>
          </h1>

          <p className="text-lg text-slate-500 max-w-lg font-light leading-relaxed mb-10 border-l-4 border-slate-900 pl-6">
            A unified lending experience. We provide the capital you need with precision, security, and speed through our specialized lending paths.
          </p>

          <button
            onClick={handleGetStarted}
            className="group px-8 py-4 bg-[#0F172A] text-white font-bold text-xs uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-xl rounded-sm flex items-center gap-3 active:scale-95"
          >
            Get Started <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>

        {/* RIGHT SIDE: The High-Highlight Hub */}
        
      </div>
    </section>
  );
};

export default Hero;
