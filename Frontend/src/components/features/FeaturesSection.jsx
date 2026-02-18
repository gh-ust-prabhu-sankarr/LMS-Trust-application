import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Zap, Shield, Clock, TrendingUp, Users, Award } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Instant Approval",
    description: "Get instant approval with our AI-powered loan assessment system. Quick decisions based on your financial profile.",
    color: "bg-emerald-600"
  },
  {
    icon: Shield,
    title: "Secure & Safe",
    description: "Your data is encrypted and protected with industry-leading security standards. Complete privacy guaranteed.",
    color: "bg-slate-800"
  },
  {
    icon: Clock,
    title: "Fast Disbursement",
    description: "Once approved, funds are disbursed directly to your account within 24 hours. No waiting, no hassle.",
    color: "bg-emerald-700"
  },
  {
    icon: TrendingUp,
    title: "Flexible Terms",
    description: "Choose from flexible repayment plans tailored to your financial situation and budget.",
    color: "bg-slate-700"
  },
  {
    icon: Users,
    title: "Expert Support",
    description: "Our dedicated loan officers are available 24/7 to assist you with any queries or concerns.",
    color: "bg-emerald-800"
  },
  {
    icon: Award,
    title: "Transparent Pricing",
    description: "No hidden charges. All fees and interest rates are clearly mentioned upfront before you apply.",
    color: "bg-slate-900"
  }
];

export default function FeaturesSection() {
  const navigate = useNavigate();

  const scrollToFunding = () => {
    const section = document.getElementById("loan-section");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const scrollReveal = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  return (
    <section className="py-24 bg-[#F1F5F9] relative overflow-hidden">
      {/* --- AESTHETIC BACKGROUND SYSTEM --- */}
      <div className="absolute inset-0 z-0">
        {/* Matte Base */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#F1F5F9] via-[#E2E8F0] to-[#F1F5F9]" />
        
        {/* Soft Aurora Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-200/30 blur-[120px] mix-blend-multiply" />
        <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-200/20 blur-[100px] mix-blend-multiply" />
        
        {/* High-Fidelity Noise Texture */}
        <div 
          className="absolute inset-0 opacity-[0.4] mix-blend-soft-light pointer-events-none" 
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` 
          }}
        />

        {/* Backdrop Blur Overlay */}
        <div className="absolute inset-0 backdrop-blur-[1px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-16 w-full relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={scrollReveal}
          className="mb-20 text-center"
        >
          <span className="text-emerald-800 font-bold tracking-[0.3em] uppercase text-[9px] bg-white/50 backdrop-blur-md px-4 py-1.5 rounded-full border border-emerald-100/50 shadow-sm">
            Why Choose Us
          </span>

          <h2 className="text-4xl md:text-5xl font-serif text-slate-900 mt-6 mb-4 leading-tight">
            Everything You Need for Your <span className="italic text-emerald-800 font-medium">Financial Goals</span>
          </h2>

          <p className="text-slate-600 text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-light">
            Our platform is designed to make borrowing simple, affordable, and stress-free. Experience world-class service with cutting-edge technology.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={containerVariants}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -10 }}
                className="p-8 rounded-[2rem] border border-white/60 bg-white/40 backdrop-blur-xl hover:bg-white/60 hover:shadow-[0_32px_64px_-16px_rgba(0,0,0,0.08)] transition-all duration-500 group"
              >
                <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                  <Icon size={26} className="text-white" strokeWidth={1.5} />
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">{feature.title}</h3>

                <p className="text-slate-600 text-sm leading-relaxed font-light">{feature.description}</p>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={scrollReveal}
          className="mt-24 p-10 lg:p-16 rounded-[2.5rem] bg-white/40 backdrop-blur-2xl border border-white relative overflow-hidden group shadow-2xl shadow-slate-200/50"
        >
          {/* Internal Glow for the CTA Card */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-100/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
          
          <div className="max-w-3xl relative z-10">
            <h3 className="text-3xl md:text-4xl font-serif text-slate-900 mb-6">
              Ready to Achieve Your Dreams?
            </h3>

            <p className="text-slate-700 text-base md:text-lg mb-10 leading-relaxed font-light">
              Join thousands of satisfied customers who have already transformed their lives with our loan products. Whether it's education, personal needs, business expansion, or a new vehicle, we have the perfect loan for you.
            </p>

            <div className="flex flex-col sm:flex-row gap-5">
              <button
                type="button"
                onClick={() => navigate("/loan/personal")}
                className="px-10 py-4 bg-slate-900 text-white font-bold uppercase text-[10px] tracking-[0.2em] rounded-xl hover:bg-emerald-800 transition-all shadow-xl hover:shadow-emerald-200/50 active:scale-95"
              >
                Get Started Now
              </button>

              <button
                type="button"
                onClick={scrollToFunding}
                className="px-10 py-4 border border-slate-300 text-slate-900 font-bold uppercase text-[10px] tracking-[0.2em] rounded-xl hover:bg-white transition-all bg-white/50"
              >
                View All Products
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
