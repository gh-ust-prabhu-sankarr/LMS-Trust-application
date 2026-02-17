import React, { useEffect } from "react";
import Navbar from "../navbar/Navbar";
export default function AuthShell({
  title = "Login to LoanBank",
  subtitle = "",
  children,
  footer,
  cardMaxWidth = "max-w-md",
  compact = false,
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="h-screen overflow-hidden app-gradient-bg">
      <Navbar />
      <div className="grid h-[calc(100vh-80px)] grid-cols-1 lg:grid-cols-2 pt-20">
        <div className="relative hidden lg:flex items-center justify-center px-10 py-16">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-orange-50" />
          <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-emerald-200/30 blur-[120px]" />
          <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-orange-200/30 blur-[120px]" />

          <div className="relative max-w-md">
            {/* <div
              onClick={() => navigate("/")}
              className="flex items-center gap-3 cursor-pointer group mb-10"
            >
              <div className="w-10 h-10 bg-[#0F172A] rounded-xl flex items-center justify-center shadow-lg group-hover:bg-emerald-700 transition-colors duration-500">
                <Landmark size={22} className="text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tighter text-slate-900 leading-none uppercase font-serif">
                  LMS Trust
                </span>
                <span className="text-[9px] text-emerald-700 font-black tracking-[0.3em] uppercase">
                  Global Banking
                </span>
              </div>
            </div> */}

            <h1
              className={`${
                compact ? "text-4xl" : "text-5xl"
              } font-serif font-medium leading-tight text-slate-900`}
            >
              Simple. Secure. <br />
              <span className="italic text-emerald-700">
                Loans that grow with you.
              </span>
            </h1>

            <p className="mt-6 text-base leading-relaxed text-slate-600">
              Apply and manage <strong>Personal, Business, Education</strong>{" "}
              and <strong>Vehicle</strong> loans with a fast, secure BFSI-style flow.
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              {["KYC Ready", "Fast Approval", "EMI Tracking", "Audit Safe"].map(
                (t) => (
                  <span
                    key={t}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700"
                  >
                    {t}
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        <div className="flex h-full items-center justify-center overflow-hidden px-6 py-10 lg:px-10 lg:py-16">
          <div className={`w-full ${cardMaxWidth}`}>
            <div className="mb-6 flex items-center justify-between">
              <div className="text-lg font-black tracking-tight text-slate-900"></div>
              <div className="text-xs font-medium text-slate-500"></div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white shadow-[0_25px_60px_rgba(15,23,42,0.12)]">
              <div
                className={`border-b border-slate-100 ${
                  compact ? "px-6 py-5" : "px-7 py-6"
                }`}
              >
                <div className={`${compact ? "text-xl" : "text-2xl"} font-semibold text-slate-900`}>
                  {title}
                </div>
                {subtitle ? (
                  <div className={`mt-1 ${compact ? "text-xs" : "text-sm"} text-slate-600`}>
                    {subtitle}
                  </div>
                ) : null}
              </div>

              <div className={compact ? "px-6 py-6" : "px-7 py-7"}>{children}</div>

              {footer ? (
                <div className={compact ? "px-6 pb-6" : "px-7 pb-7"}>{footer}</div>
              ) : null}
            </div>

            <div className="mt-6 text-center text-xs text-slate-500">

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
