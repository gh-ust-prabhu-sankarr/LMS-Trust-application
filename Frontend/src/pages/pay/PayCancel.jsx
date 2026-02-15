import { useNavigate } from "react-router-dom";
import PortalShell from "../../components/layout/PortalShell.jsx";

export default function PayCancel() {
  const navigate = useNavigate();

  return (
    <PortalShell title="Payment Cancelled" subtitle="You cancelled the Stripe checkout">
      <div className="max-w-2xl mx-auto rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_20px_50px_-25px_rgba(15,23,42,0.25)]">
        <span className="px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-800 border-amber-200">
          Cancelled
        </span>

        <h2 className="mt-6 text-2xl font-bold text-slate-900">Payment cancelled</h2>
        <p className="mt-2 text-sm text-slate-600">
          No worries. Your payment wasn’t completed. You can try again from your dashboard.
        </p>

        <div className="mt-8 flex gap-3">
          <button
            onClick={() => navigate("/dashboard")}
            className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            Go to Dashboard
          </button>

          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-300 text-slate-800 hover:bg-slate-50 transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    </PortalShell>
  );
}
