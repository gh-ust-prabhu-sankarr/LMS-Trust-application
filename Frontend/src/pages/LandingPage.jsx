import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/navbar/Navbar";
import Hero from "../components/hero/Hero";
import LoansSection from "../components/loans/LoansSection";
import FeaturesSection from "../components/features/FeaturesSection";
import Footer from "../components/footer/Footer";
import { useAuth } from "../context/AuthContext.jsx";
  
const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const handleProtectedAction = () => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true);
    }
  };

  return (
    <div className="relative min-h-screen app-gradient-bg overflow-hidden">
      <Navbar />
      <Hero onProtectedAction={handleProtectedAction} />
      <FeaturesSection />
      <LoansSection
        isAuthenticated={isAuthenticated}
        onRequireLogin={handleProtectedAction}
      />
      <Footer />
      {showLoginPrompt && (
        <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6">
            <h3 className="text-xl font-serif text-slate-900 mb-2">Login Required</h3>
            <p className="text-sm text-slate-600 mb-5">
              Please login first.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLoginPrompt(false);
                  navigate("/login");
                }}
                className="px-6 py-2.5 bg-slate-900 text-white text-[11px] font-bold uppercase tracking-widest hover:bg-emerald-700 transition-all rounded-sm shadow-md"
              >
                Please Login First
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
