import React, { useState, useRef, useEffect } from "react";
import { Landmark, LogOut, LayoutDashboard, Home, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

const Navbar = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, role, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const effectiveRole = role || user?.role || null;
  const dashboardRoute =
    effectiveRole === "ADMIN" ? "/admin" : effectiveRole === "CREDIT_OFFICER" ? "/officer" : "/dashboard";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="fixed top-0 w-full z-[100] bg-white/70 backdrop-blur-2xl border-b border-slate-200/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-16 py-4 flex justify-between items-center">

        {/* --- Logo --- */}
        <div onClick={() => navigate("/")} className="flex items-center gap-3.5 cursor-pointer group">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg group-hover:bg-emerald-600 transition-all duration-300">
            <Landmark size={22} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight text-slate-900 leading-none font-serif uppercase">LMS Trust</span>
            <span className="text-[9px] text-emerald-700 font-bold tracking-[0.3em] uppercase mt-1">Global Banking</span>
          </div>
        </div>

        {/* --- Actions --- */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              {/* Profile Trigger */}
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full border border-slate-200 hover:border-emerald-500/50 hover:bg-slate-50 transition-all group"
              >
                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-xs font-bold">
                  {user?.username?.[0].toUpperCase() || "U"}
                </div>
                <div className="hidden md:flex flex-col items-start text-left">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-700">{user?.username}</span>
                  <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">{effectiveRole}</span>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-3 w-52 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right overflow-hidden">

                  {/* 1st: Home */}
                  <DropdownItem
                    icon={<Home size={16} />}
                    label="Home"
                    onClick={() => { navigate("/"); setIsDropdownOpen(false); }}
                  />

                  {/* 2nd: Dashboard */}
                  <DropdownItem
                    icon={<LayoutDashboard size={16} />}
                    label="Dashboard"
                    onClick={() => { navigate(dashboardRoute); setIsDropdownOpen(false); }}
                  />

                  <div className="my-1 border-t border-slate-100" />

                  {/* 3rd: Logout */}
                  <button
                    onClick={() => { logout(); navigate("/"); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-rose-500 hover:bg-rose-50 transition-colors text-[10px] font-black uppercase tracking-widest"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <button onClick={() => navigate("/login")} className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-emerald-700 transition-all">Login</button>
              <button onClick={() => navigate("/register")} className="px-8 py-3 bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-full hover:bg-emerald-700 transition-all shadow-lg">Register</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

// Helper component
const DropdownItem = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 transition-colors text-[10px] font-black uppercase tracking-widest"
  >
    <span className="text-slate-400">{icon}</span>
    {label}
  </button>
);

export default Navbar;