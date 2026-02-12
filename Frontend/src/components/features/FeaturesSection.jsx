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
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#0F172A 1px, transparent 1px), linear-gradient(90deg, #0F172A 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 lg:px-16 w-full relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={scrollReveal}
          className="mb-16 text-center"
        >
          <span className="text-emerald-700 font-bold tracking-[0.3em] uppercase text-[9px] bg-emerald-50 px-3 py-1 rounded-sm border border-emerald-100">
            Why Choose Us
          </span>

          <h2 className="text-4xl md:text-5xl font-serif text-slate-900 mt-4 mb-4">
            Everything You Need for Your <span className="italic text-emerald-700">Financial Goals</span>
          </h2>

          <p className="text-slate-600 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
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
                className="p-8 rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white hover:shadow-lg transition-all duration-300 hover:border-slate-300"
              >
                <div className={`w-14 h-14 ${feature.color} rounded-xl flex items-center justify-center mb-5 shadow-lg`}>
                  <Icon size={28} className="text-white" strokeWidth={2} />
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>

                <p className="text-slate-600 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={scrollReveal}
          className="mt-20 p-10 lg:p-16 rounded-2xl bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200"
        >
          <div className="max-w-3xl">
            <h3 className="text-2xl md:text-3xl font-serif text-slate-900 mb-4">
              Ready to Achieve Your Dreams?
            </h3>

            <p className="text-slate-700 text-base md:text-lg mb-8 leading-relaxed">
              Join thousands of satisfied customers who have already transformed their lives with our loan products. Whether it's education, personal needs, business expansion, or a new vehicle, we have the perfect loan for you.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={scrollToFunding}
                className="px-8 py-3.5 bg-emerald-700 text-white font-bold uppercase text-[11px] tracking-widest rounded-lg hover:bg-emerald-800 transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                Get Started Now
              </button>

              <button
                type="button"
                onClick={scrollToFunding}
                className="px-8 py-3.5 border-2 border-emerald-700 text-emerald-700 font-bold uppercase text-[11px] tracking-widest rounded-lg hover:bg-emerald-50 transition-all"
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


