import React from "react";
import { Landmark, UserCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

const Navbar = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, role, logout } = useAuth();
  const effectiveRole = role || user?.role || null;
  const dashboardRoute =
    effectiveRole === "ADMIN" ? "/admin" : effectiveRole === "CREDIT_OFFICER" ? "/officer" : "/dashboard";

  return (
    <nav className="fixed top-0 w-full z-[100] bg-white/70 backdrop-blur-2xl border-b border-slate-200/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-16 py-4 flex justify-between items-center">

        {/* --- Logo Section --- */}
        <div
          onClick={() => navigate("/")}
          className="flex items-center gap-3.5 cursor-pointer group"
        >
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg group-hover:bg-emerald-600 transition-colors duration-300">
            <Landmark size={22} className="text-white" />
          </div>
          
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-slate-900 leading-none font-serif uppercase">
              LMS Trust
            </span>
            <span className="text-[9px] text-emerald-700 font-bold tracking-[0.3em] uppercase mt-1">
              Global Banking
            </span>
          </div>
        </div>

        {/* --- Action Buttons --- */}
        <div className="flex items-center gap-4 md:gap-8">
          {isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={() => navigate(dashboardRoute)}
                className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 px-2 hover:text-emerald-700 transition-all"
              >
                <UserCircle size={20} strokeWidth={2.5} />
                {user?.username || "User"}
              </button>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="relative group px-8 py-3 bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-full shadow-[0_10px_20px_-5px_rgba(0,0,0,0.2)] hover:bg-emerald-700 transition-all active:scale-95"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-emerald-700 transition-all px-2"
              >
                <UserCircle size={20} strokeWidth={2.5} />
                Login
              </button>

              <button
                type="button"
                onClick={() => navigate("/register")}
                className="relative group px-8 py-3 bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-full shadow-[0_10px_20px_-5px_rgba(0,0,0,0.2)] hover:bg-emerald-700 transition-all active:scale-95"
              >
                Register
              </button>
            </>
          )}

        </div>
      </div>
    </nav>
  );
};

export default Navbar;
