import React from "react";

export default function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-500 shadow-sm" />
      <div className="leading-tight">
        <div className="text-sm font-black tracking-tight text-slate-900">LoanBank</div>
        <div className="text-[11px] font-semibold text-slate-500">Loan Management</div>
      </div>
    </div>
  );
}
