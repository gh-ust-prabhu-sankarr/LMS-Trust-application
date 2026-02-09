import Navbar from "../navbar/Navbar.jsx";

export default function PortalShell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#0F172A 1px, transparent 1px), linear-gradient(90deg, #0F172A 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <main className="relative z-10 mx-auto max-w-7xl px-6 lg:px-16 py-10 pt-28">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-serif text-slate-900">{title}</h1>
          {subtitle ? <p className="text-slate-600 mt-2">{subtitle}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
