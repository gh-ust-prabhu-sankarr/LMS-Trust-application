const Footer = () => {
  return (
    <footer className="bg-[#020617] border-t border-white/5 py-12">
      <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-left">
          <h2 className="text-xl font-bold text-white tracking-tighter">LMS Trust</h2>
          <p className="text-slate-500 text-sm mt-1">© 2026 LMS Trust. All rights reserved.</p>
        </div>

        <div className="flex gap-8 text-sm text-slate-400">
          <a href="#" className="hover:text-emerald-400 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-emerald-400 transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-emerald-400 transition-colors">Contact Support</a>
        </div>

        <div className="text-slate-400 text-sm font-medium">
          support@lmstrust.com
        </div>
      </div>
    </footer>
  );
};

export default Footer;
