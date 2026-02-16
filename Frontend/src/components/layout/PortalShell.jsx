import Navbar from "../navbar/Navbar.jsx";
import BackgroundCanvas from "./BackgroundCanvas.jsx";
//for dashboard and admin panel and officer panel
export default function PortalShell({ title, subtitle, children }) {
  return (
    <div className="relative min-h-screen app-gradient-bg overflow-hidden">
      <Navbar />
      <BackgroundCanvas />
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
