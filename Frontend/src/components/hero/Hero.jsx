import { ArrowRight, ShieldCheck } from "lucide-react";
 
const Hero = ({ onProtectedAction }) => {
  return (
    <section className="relative min-h-[90vh] w-full overflow-hidden bg-slate-50 flex items-center pt-24">
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#0F172A 1px, transparent 1px), linear-gradient(90deg, #0F172A 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* LEFT SIDE: Content (Kept Original Colors/Styling) */}
        <div className="flex flex-col items-start text-left">
 
          <h1 className="text-5xl lg:text-7xl font-serif font-medium tracking-tight text-[#0F172A] leading-[1.1] mb-8">
            Your Finance. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 font-semibold">
              Centralized.
            </span>
          </h1>
 
          <p className="text-lg text-slate-500 max-w-lg font-light leading-relaxed mb-10 border-l-4 border-slate-900 pl-6">
            A unified lending experience. We provide the capital you need with precision, security, and speed.
          </p>
 
          <button
            onClick={onProtectedAction}
            className="px-8 py-4 bg-[#0F172A] text-white font-bold text-xs uppercase tracking-[0.2em] hover:bg-emerald-800 transition-all shadow-xl rounded-sm flex items-center gap-3"
          >
            Get Started <ArrowRight size={16} />
          </button>
        </div>
 
        {/* RIGHT SIDE: The Static Image (Replacing the Animation Hub) */}
        <div className="relative flex items-center justify-center w-full">
  
          <div className="absolute w-[450px] h-[450px] bg-emerald-100 rounded-full blur-[80px] opacity-40" />
 
          <div className="relative z-20">
            <div className="relative rounded-3xl overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] border-4 border-white bg-white w-full max-w-md">
              <img
                src="https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=1200"
                alt="Banking Dashboard"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
 
      </div>
    </section>
  );
};
 
export default Hero;
