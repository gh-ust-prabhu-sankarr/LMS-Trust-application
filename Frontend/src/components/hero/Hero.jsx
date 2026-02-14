import React from 'react';
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  Landmark, 
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
      {/* --- BACKGROUND BLUR LAYER SYSTEM --- */}
      
      {/* 1. Base Grid Texture */}
      <div
        className="absolute inset-0 opacity-[0.09] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#0F172A 1px, transparent 1px), linear-gradient(90deg, #0F172A 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* 2. Deep Blur Orbs (Visual Depth) */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-emerald-400/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-400/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] left-[20%] w-[300px] h-[300px] bg-indigo-400/10 rounded-full blur-[100px] pointer-events-none" />

      {/* 3. Frosted Glass Overlay (Blurs the grid slightly for a premium feel) */}
      <div className="absolute inset-0 backdrop-blur-[1.5px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        
        {/* LEFT SIDE: Content */}
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
        <div className="relative flex items-center justify-center w-full h-[550px] lg:h-[650px]">
          
          <div className="absolute w-[420px] h-[420px] bg-emerald-400/20 rounded-full blur-[90px] animate-pulse" />

          {/* Center Hub Node */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1 }}
            className="relative z-30 w-44 h-44 bg-slate-100/90 backdrop-blur-2xl rounded-full flex flex-col items-center justify-center border border-white/80 shadow-[0_35px_70px_-15px_rgba(0,0,0,0.25)]"
          >
            <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping" />
            <div className="absolute inset-3 rounded-full border border-dashed border-emerald-400/40 animate-[spin_20s_linear_infinite]" />
            
            <div className="p-4 bg-white rounded-2xl mb-2 text-emerald-700 shadow-[0_8px_16px_rgba(0,0,0,0.05)] border border-emerald-100/50">
              <Landmark size={36} />
            </div>
            <span className="text-[#0F172A] font-black text-[11px] tracking-[0.4em] uppercase">LMS HUB</span>
          </motion.div>

          {/* Rotating Orbit Layer */}
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 50, repeat: Infinity, ease: "linear" }} 
            className="absolute w-full h-full flex items-center justify-center z-20"
          >
            {loans.map((loan, index) => {
                const angle = (index * 360) / loans.length;
                return (
                  <div 
                    key={index} 
                    className="absolute flex items-center justify-center" 
                    style={{ transform: `rotate(${angle}deg) translateY(-220px)` }}
                  >
                    <motion.div 
                      animate={{ rotate: -360 }} 
                      transition={{ duration: 50, repeat: Infinity, ease: "linear" }} 
                      className="flex flex-col items-center"
                    >
                        <div style={{ transform: `rotate(${-angle}deg)` }} className="group flex flex-col items-center">
                            <motion.div 
                                whileHover={{ scale: 1.15, y: -8 }}
                                className={`w-18 h-18 bg-slate-100/90 backdrop-blur-xl border border-white/80 flex items-center justify-center rounded-3xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] group-hover:bg-gradient-to-br ${loan.gradient} group-hover:text-white group-hover:border-transparent group-hover:shadow-2xl group-hover:shadow-emerald-500/30 transition-all duration-500 text-slate-600 cursor-pointer p-5`}
                            >
                                {loan.icon}
                            </motion.div>
                            
                            <div className="mt-4 px-4 py-1.5 bg-[#0F172A] rounded-xl opacity-0 group-hover:opacity-100 transition-all shadow-2xl transform translate-y-2 group-hover:translate-y-0">
                                <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em] whitespace-nowrap">{loan.label}</span>
                            </div>
                        </div>
                    </motion.div>
                  </div>
                );
            })}
          </motion.div>

          {/* Decorative Outer Rings */}
          <div className="absolute w-[440px] h-[440px] border border-emerald-500/10 rounded-full" />
          <div className="absolute w-[560px] h-[560px] border border-slate-200/40 rounded-full border-dashed" />
        </div>
      </div>
    </section>
  );
};

export default Hero;