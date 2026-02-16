import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PortalShell from "../../components/layout/PortalShell.jsx";
import { repaymentApi } from "../../api/domainApi.js";

export default function PaySuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");

  const [status, setStatus] = useState("LOADING"); // LOADING | OK | ERROR
  const [message, setMessage] = useState("Confirming your payment...");

  const safeSession = useMemo(() => {
    if (!sessionId) return "-";
    if (sessionId.length <= 10) return sessionId;
    return `${sessionId.slice(0, 6)}...${sessionId.slice(-4)}`;
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;

    async function confirm() {
      if (!sessionId) {
        setStatus("ERROR");
        setMessage("Missing session_id in URL. Payment cannot be verified.");
        return;
      }

      try {
        // ✅ backend expects JSON body { sessionId }
        const res = await repaymentApi.confirmStripePayment(sessionId);

        if (cancelled) return;

        const apiMsg = res?.data?.message || "Payment confirmed successfully.";
        setStatus("OK");
        setMessage(apiMsg);
      } catch (e) {
        if (cancelled) return;

        const msg =
          e?.response?.data?.message ||
          e?.message ||
          "Payment could not be confirmed. Please try again.";
        setStatus("ERROR");
        setMessage(msg);
      }
    }

    confirm();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (status !== "OK") return;
    const timer = setTimeout(() => {
      navigate("/dashboard", { replace: true, state: { tab: "repayments" } });
    }, 1500);
    return () => clearTimeout(timer);
  }, [status, navigate]);

  return (
    <PortalShell title="Payment Status" subtitle="Stripe payment verification">
      <div className="max-w-2xl mx-auto rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_20px_50px_-25px_rgba(15,23,42,0.25)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Stripe Session
            </p>
            <p className="mt-1 font-mono text-sm text-slate-800">{safeSession}</p>
          </div>

          {status === "OK" ? (
            <span className="px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-800 border-emerald-200">
              Success
            </span>
          ) : status === "ERROR" ? (
            <span className="px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-800 border-rose-200">
              Failed
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-800 border-amber-200">
              Processing
            </span>
          )}
        </div>

        <h2 className="mt-6 text-2xl font-bold text-slate-900">
          {status === "OK"
            ? "Payment confirmed ✅"
            : status === "ERROR"
            ? "Payment confirmation failed"
            : "Confirming payment..."}
        </h2>

        <p className="mt-2 text-sm text-slate-600">{message}</p>
        {status === "OK" ? (
          <p className="mt-2 text-xs text-emerald-700 font-semibold">
            Redirecting to dashboard...
          </p>
        ) : null}

        {status === "ERROR" && sessionId && (
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-emerald-700 transition-colors"
          >
            Retry Confirmation
          </button>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            Go to Dashboard
          </button>

          <button
            onClick={() => navigate("/dashboard", { replace: true, state: { tab: "repayments" } })}
            className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-300 text-slate-800 hover:bg-slate-50 transition-colors"
          >
            View Repayments
          </button>
        </div>
      </div>
    </PortalShell>
  );
}
