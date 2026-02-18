import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Landmark, UserCircle, LayoutDashboard, Home, LogOut, ChevronDown } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, role, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const menuRef = useRef(null);

  const effectiveRole = role || user?.role || "CUSTOMER";
  const isLoginRoute = location.pathname === "/login" || location.pathname.startsWith("/login/");
  const isRegisterRoute = location.pathname === "/register";
  const roleLabel = effectiveRole === "CREDIT_OFFICER" ? "LOAN_OFFICER" : effectiveRole;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Determine Dashboard Route
  const getDashboardRoute = () => {
    switch (effectiveRole) {
      case "ADMIN": return "/admin";
      case "CREDIT_OFFICER":
      case "LOAN_OFFICER":
        return "/officer";
      default: return "/dashboard";
    }
  };

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
    setShowLogoutConfirm(false);
    navigate("/");
  };

  const logoutModal = showLogoutConfirm && typeof document !== "undefined"
    ? createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600">Confirm Logout</p>
            <h3 className="mt-2 text-lg font-bold text-slate-900">Are you sure you want to log out?</h3>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-rose-700 bg-rose-600 px-5 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-rose-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

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
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="relative" ref={menuRef}>
              {/* Profile Toggle Button */}
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-200 hover:border-emerald-500 transition-all group"
              >
                <UserCircle size={24} className="text-slate-600 group-hover:text-emerald-600" />
                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">
                    {user?.username || "Account"}
                  </span>
                  {roleLabel && roleLabel !== "CUSTOMER" && (
                    <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700">
                      {roleLabel}
                    </span>
                  )}
                </div>
                <ChevronDown 
                  size={14} 
                  className={`text-slate-400 transition-transform duration-300 ${isMenuOpen ? 'rotate-180' : ''}`} 
                />
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 animate-in fade-in zoom-in duration-200">
                  <div className="px-4 py-2 border-b border-slate-50 mb-1">
                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Signed in as</p>
                    <p className="text-sm font-bold text-slate-900 truncate">{user?.email || user?.username}</p>
                    {roleLabel && roleLabel !== "CUSTOMER" && (
                      <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-emerald-700">{roleLabel}</p>
                    )}
                  </div>

                  {/* Shared Links */}
                  <button
                    onClick={() => { navigate("/"); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-emerald-700 transition-colors"
                  >
                    <Home size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider">Home</span>
                  </button>

                  {/* Role Based Dashboard Link */}
                  <button
                    onClick={() => { navigate(getDashboardRoute()); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 hover:text-emerald-700 transition-colors"
                  >
                    <LayoutDashboard size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {effectiveRole === "ADMIN" ? "Admin Panel" : "Dashboard"}
                    </span>
                  </button>

                  <div className="h-px bg-slate-100 my-1" />

                  {/* Logout */}
                  <button
                    onClick={() => { setShowLogoutConfirm(true); setIsMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut size={18} />
                    <span className="text-xs font-bold uppercase tracking-wider">Logout</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className={
                  isLoginRoute
                    ? "px-8 py-3 bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg hover:bg-emerald-700 transition-all active:scale-95"
                    : "text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-emerald-700 transition-all px-2"
                }
              >
                Login
              </button>

              <button
                type="button"
                onClick={() => navigate("/register")}
                className={
                  isRegisterRoute
                    ? "px-8 py-3 bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg hover:bg-emerald-700 transition-all active:scale-95"
                    : "text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 hover:text-emerald-700 transition-all px-2"
                }
                
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>
      {logoutModal}
    </nav>
  );
};

export default Navbar;
