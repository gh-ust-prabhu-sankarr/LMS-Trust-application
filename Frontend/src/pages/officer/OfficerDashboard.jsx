import { useEffect, useMemo, useState } from "react";
import PortalShell from "../../components/layout/PortalShell.jsx";
import { loanApi } from "../../api/domainApi.js";

const OFFICER_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED"];
const money = (n) => (typeof n === "number" ? n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }) : "-");

export default function OfficerDashboard() {
  const [status, setStatus] = useState("SUBMITTED");
  const [statusLoans, setStatusLoans] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [approvedAmount, setApprovedAmount] = useState("");
  const [comments, setComments] = useState("");
  const [rejectReasons, setRejectReasons] = useState({});

  const loans = statusLoans[status] || [];

  const statusCounts = useMemo(
    () =>
      OFFICER_STATUSES.reduce((acc, s) => {
        acc[s] = (statusLoans[s] || []).length;
        return acc;
      }, {}),
    [statusLoans]
  );

  const loadLoans = async () => {
    setLoading(true);
    setError("");
    try {
      const responses = await Promise.all(
        OFFICER_STATUSES.map((s) =>
          loanApi
            .getByStatus(s)
            .then((res) => [s, res.data || []])
            .catch(() => [s, []])
        )
      );
      setStatusLoans(Object.fromEntries(responses));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to fetch loans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoans();
  }, []);

  const moveToReview = async (loanId) => {
    try {
      await loanApi.moveToReview(loanId);
      await loadLoans();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Move to review failed");
    }
  };

  const approveLoan = async (e) => {
    e.preventDefault();
    if (!selectedLoan) return;
    try {
      await loanApi.approve(selectedLoan.id, { approvedAmount: Number(approvedAmount), comments });
      setSelectedLoan(null);
      setApprovedAmount("");
      setComments("");
      await loadLoans();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Approve failed");
    }
  };

  const rejectLoan = async (loanId) => {
    const reason = (rejectReasons[loanId] || "").trim() || "Rejected by credit officer";
    try {
      await loanApi.reject(loanId, reason);
      setRejectReasons((prev) => ({ ...prev, [loanId]: "" }));
      await loadLoans();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Reject failed");
    }
  };

  return (
    <PortalShell title="Credit Officer Portal" subtitle="Review submitted applications and take decisions.">
      {error ? <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {OFFICER_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-2xl border p-4 text-left transition ${
              status === s ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white"
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest">{s.replace("_", " ")}</div>
            <div className="text-2xl font-semibold mt-1">{statusCounts[s] ?? 0}</div>
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Loan Queue: {status}</h2>
        {loading ? (
          <p className="text-sm text-slate-600">Loading...</p>
        ) : loans.length === 0 ? (
          <p className="text-sm text-slate-500">No loans in this queue.</p>
        ) : (
          <div className="space-y-3">
            {loans.map((loan) => (
              <div key={loan.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Loan #{loan.id.slice(-8)}</div>
                    <div className="text-xs text-slate-500">
                      Requested: {money(loan.requestedAmount)} | Tenure: {loan.tenure} | EMI: {money(loan.emi)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {loan.status === "SUBMITTED" ? (
                      <button
                        onClick={() => moveToReview(loan.id)}
                        className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest bg-slate-900 text-white rounded-sm hover:bg-emerald-700"
                      >
                        Review
                      </button>
                    ) : null}
                    {loan.status === "UNDER_REVIEW" ? (
                      <>
                        <button
                          onClick={() => setSelectedLoan(loan)}
                          className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest border border-slate-300 rounded-sm hover:bg-slate-100"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectLoan(loan.id)}
                          className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest border border-rose-300 text-rose-700 rounded-sm hover:bg-rose-50"
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
                {loan.status === "UNDER_REVIEW" ? (
                  <input
                    value={rejectReasons[loan.id] || ""}
                    onChange={(e) => setRejectReasons((prev) => ({ ...prev, [loan.id]: e.target.value }))}
                    placeholder="Rejection reason (if rejecting)"
                    className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedLoan ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Approve Loan #{selectedLoan.id.slice(-8)}</h3>
          <form onSubmit={approveLoan} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="number"
              placeholder="Approved amount"
              value={approvedAmount}
              onChange={(e) => setApprovedAmount(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              placeholder="Comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm md:col-span-2"
            />
            <div className="md:col-span-3 flex gap-2">
              <button className="px-4 py-2.5 bg-slate-900 text-white text-[11px] font-bold uppercase tracking-widest rounded-sm hover:bg-emerald-700">
                Confirm Approve
              </button>
              <button
                type="button"
                onClick={() => setSelectedLoan(null)}
                className="px-4 py-2.5 border border-slate-300 text-[11px] font-bold uppercase tracking-widest rounded-sm hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </PortalShell>
  );
}
