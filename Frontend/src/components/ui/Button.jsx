import React from "react";

export default function Button({ variant = "primary", className = "", ...props }) {
  const base =
    "w-full rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60";

  const styles =
    variant === "primary"
      ? "bg-emerald-700 text-white hover:bg-emerald-800"
      : variant === "dark"
      ? "bg-[#0F172A] text-white hover:bg-emerald-800"
      : "bg-white text-slate-900 border border-slate-200 hover:bg-slate-50";

  return <button {...props} className={[base, styles, className].join(" ")} />;
}
