import { motion } from "framer-motion";
import { Zap, Shield, Clock, TrendingUp, Users, Award } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Instant Approval",
    description: "Get instant approval with our AI-powered loan assessment system. Quick decisions based on your financial profile.",
    color: "bg-emerald-500"
  },
  {
    icon: Shield,
    title: "Secure & Safe",
    description: "Your data is encrypted and protected with industry-leading security standards. Complete privacy guaranteed.",
    color: "bg-blue-500"
  },
  {
    icon: Clock,
    title: "Fast Disbursement",
    description: "Once approved, funds are disbursed directly to your account within 24 hours. No waiting, no hassle.",
    color: "bg-purple-500"
  },
  {
    icon: TrendingUp,
    title: "Flexible Terms",
    description: "Choose from flexible repayment plans tailored to your financial situation and budget.",
    color: "bg-orange-500"
  },
  {
    icon: Users,
    title: "Expert Support",
    description: "Our dedicated loan officers are available 24/7 to assist you with any queries or concerns.",
    color: "bg-pink-500"
  },
  {
    icon: Award,
    title: "Transparent Pricing",
    description: "No hidden charges. All fees and interest rates are clearly mentioned upfront before you apply.",
    color: "bg-slate-700"
  }
];

export default function FeaturesSection() {
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
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  return (
    <section className="py-24 bg-[#f8fafc] relative overflow-hidden">
      
      {/* --- ENHANCED GREEN GRADIENT BACKGROUND --- */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Soft emerald wash across the top */}
        <div className="absolute top-0 left-1/4 w-[50%] h-[40%] bg-emerald-100/30 blur-[120px] rounded-full" />
        {/* Deeper teal accent at the bottom right */}
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[50%] bg-teal-50/50 blur-[100px] rounded-full" />
        {/* Subtle radial rings to match the Hero style */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full flex items-center justify-center opacity-30">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-emerald-500/[0.08]"
              style={{
                width: `${(i + 1) * 400}px`,
                height: `${(i + 1) * 400}px`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-20 w-full relative z-10">
        
        {/* Header Section */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={scrollReveal}
          className="mb-20 text-center"
        >
          <span className="text-emerald-700 font-bold tracking-[0.3em] uppercase text-[9px] bg-white px-4 py-1.5 rounded-full border border-emerald-100 shadow-sm">
            Why Choose Us
          </span>

          <h2 className="text-4xl md:text-5xl font-serif text-[#0F172A] mt-6 mb-4 leading-tight">
            Everything You Need for Your <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 font-semibold">
              Financial Goals
            </span>
          </h2>

          <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto leading-relaxed font-light">
            Our platform is designed to make borrowing simple, affordable, and stress-free. Experience world-class service with cutting-edge technology.
          </p>
        </motion.div>

        {/* Features Grid */}
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
                className="group p-8 rounded-3xl border border-white bg-white/60 backdrop-blur-md shadow-[0_15px_40px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_60px_-15px_rgba(16,185,129,0.15)] transition-all duration-500"
              >
                <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg transform group-hover:scale-110 transition-transform duration-500`}>
                  <Icon size={26} className="text-white" strokeWidth={2.5} />
                </div>

                <h3 className="text-xl font-bold text-[#0F172A] mb-3 group-hover:text-emerald-700 transition-colors">
                  {feature.title}
                </h3>

                <p className="text-slate-500 text-sm leading-relaxed font-light">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* CTA Banner with Gradient */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={scrollReveal}
          className="relative mt-24 overflow-hidden rounded-[2.5rem] bg-[#0F172A] p-10 lg:p-16 shadow-2xl"
        >
          {/* Decorative Gradient for CTA */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-emerald-600/20 to-transparent pointer-events-none" />
          
          <div className="relative z-10 max-w-3xl">
            <h3 className="text-3xl md:text-4xl font-serif text-white mb-6">
              Ready to Achieve Your <span className="text-emerald-400 italic">Dreams?</span>
            </h3>

            <p className="text-slate-300 text-base md:text-lg mb-10 leading-relaxed font-light">
              Join thousands of satisfied customers who have already transformed their lives. Whether it's education, business expansion, or personal needs, we have the perfect path for you.
            </p>

            <div className="flex flex-col sm:flex-row gap-5">
              <button
                type="button"
                onClick={scrollToFunding}
                className="px-10 py-4 bg-emerald-500 text-white font-bold uppercase text-[11px] tracking-[0.2em] rounded-xl hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-900/20 active:scale-95"
              >
                Get Started Now
              </button>

              <button
                type="button"
                onClick={scrollToFunding}
                className="px-10 py-4 border border-slate-700 text-white font-bold uppercase text-[11px] tracking-[0.2em] rounded-xl hover:bg-white/5 transition-all"
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