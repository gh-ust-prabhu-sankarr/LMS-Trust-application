import React from "react";

export default function Input({
  label,
  error,
  right,
  className = "",
  ...props
}) {
  return (
    <div className="space-y-1.5">
      {label ? <label className="text-xs font-semibold text-slate-700">{label}</label> : null}

      <div className="relative">
        <input
          {...props}
          className={[
            "w-full rounded-2xl border bg-white px-4 py-3 text-sm outline-none transition",
            error ? "border-rose-300 focus:border-rose-400" : "border-slate-200 focus:border-emerald-400",
            right ? "pr-12" : "",
            className,
          ].join(" ")}
        />
        {right ? <div className="absolute inset-y-0 right-0 flex items-center pr-2">{right}</div> : null}
      </div>

      {error ? <div className="text-xs font-medium text-rose-600">{error}</div> : null}
    </div>
  );
}
