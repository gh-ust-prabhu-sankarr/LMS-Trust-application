import React from "react";

export default function BackgroundCanvas() {
  return (
    <>
      <div
        className="absolute inset-0 opacity-[0.09] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#0F172A 1px, transparent 1px), linear-gradient(90deg, #0F172A 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-emerald-400/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-400/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] left-[20%] w-[300px] h-[300px] bg-indigo-400/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 backdrop-blur-[1.5px] pointer-events-none" />
    </>
  );
}
