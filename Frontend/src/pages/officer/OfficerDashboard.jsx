import { useEffect, useMemo, useState } from "react";
import PortalShell from "../../components/layout/PortalShell.jsx";
import { customerApi, fileApi, kycApi, loanApi, unwrap } from "../../api/domainApi.js";

const KYC_STATUSES = ["PENDING", "APPROVED", "REJECTED"];
const LOAN_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "APPROVED"];
const STATUS_TONE = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
  SUBMITTED: "bg-amber-50 text-amber-800 border-amber-200",
  UNDER_REVIEW: "bg-amber-50 text-amber-800 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

export default function OfficerDashboard() {
  // which KYC tab officer is viewing
  const [kycStatus, setKycStatus] = useState("PENDING");

  // all kyc records grouped by status
  const [kycByStatus, setKycByStatus] = useState({});// { PENDING: [...], APPROVED: [...], REJECTED: [...]}

  // loading + error handling
  const [kycLoading, setKycLoading] = useState(true);
  const [error, setError] = useState("");

  // remarks entered by officer (per kyc id)
  const [kycRemarks, setKycRemarks] = useState({});
  const [loanByStatus, setLoanByStatus] = useState({});
  const [loanRemarks, setLoanRemarks] = useState({});
  const [loanLoading, setLoanLoading] = useState(true);
  const [customerById, setCustomerById] = useState({});
  
  // Approval confirmation modal state
  const [confirmingLoan, setConfirmingLoan] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  
  // Loan documents state
  const [loanDocuments, setLoanDocuments] = useState({});


  const kycRecords = kycByStatus[kycStatus] || [];  // current list shown one at a timeee
  const loanRecords = LOAN_STATUSES.flatMap((s) => loanByStatus[s] || []);

  // count shown on top cards  ;;;;;;pending 4 ....
  const kycStatusCounts = useMemo(
    () =>
      KYC_STATUSES.reduce((acc, s) => {
        acc[s] = (kycByStatus[s] || []).length;
        return acc;
      }, {}),
    [kycByStatus]
  );
  const loanStatusCounts = useMemo(
    () =>
      LOAN_STATUSES.reduce((acc, s) => {
        acc[s] = (loanByStatus[s] || []).length;
        return acc;
      }, {}),
    [loanByStatus]
  );

  // load all KYC records grouped by status
  const loadKyc = async () => {
    setKycLoading(true);
    setError("");
    try { //get all kyc --pending ///approved //////////..mapingg
      const responses = await Promise.all(
        KYC_STATUSES.map((status) => 
          kycApi.getByStatus(status).then((res) => {   
            const records = unwrap(res);
            return [status, Array.isArray(records) ? records : []];//returing pening...kyc1 like thta
          })
        )
      );

      setKycByStatus(Object.fromEntries(responses));//key value pair for respones'''pending --keyc1 
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load KYC");
    } finally {
      setKycLoading(false);
    }
  };

  const loadLoans = async () => {
    setLoanLoading(true);
    try {
      const responses = await Promise.all(
        LOAN_STATUSES.map((status) =>
          loanApi.getByStatus(status).then((res) => {
            const records = unwrap(res);
            return [status, Array.isArray(records) ? records : []];
          })
        )
      );
      const byStatus = Object.fromEntries(responses);
      setLoanByStatus(byStatus);

      const allLoans = LOAN_STATUSES.flatMap((s) => byStatus[s] || []);
      const uniqueCustomerIds = Array.from(
        new Set(allLoans.map((l) => l.customerId).filter(Boolean))
      );
      const missingIds = uniqueCustomerIds.filter((id) => !customerById[id]);
      if (missingIds.length > 0) {
        const results = await Promise.allSettled(
          missingIds.map((id) => customerApi.getById(id))
        );
        setCustomerById((prev) => {
          const next = { ...prev };
          results.forEach((res, idx) => {
            if (res.status === "fulfilled") {
              next[missingIds[idx]] = unwrap(res.value);
            }
          });
          return next;
        });
      }

      // Fetch documents for all loans
      const docResults = await Promise.allSettled(
        allLoans.map((loan) =>
          fileApi.listByEntity("LOAN_APPLICATION", loan.id).then((res) => [loan.id, res.data || []])
        )
      );
      setLoanDocuments((prev) => {
        const next = { ...prev };
        docResults.forEach((res) => {
          if (res.status === "fulfilled") {
            const [loanId, docs] = res.value;
            next[loanId] = docs;
          }
        });
        return next;
      });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Failed to load loans");
    } finally {
      setLoanLoading(false);
    }
  };

  // load once when dashboard opens
  useEffect(() => {
    loadKyc();
    loadLoans();
  }, []);

  // approve kyc
  const approveKyc = async (kycId) => {
    try {
      await kycApi.approve(
        kycId,
        (kycRemarks[kycId] || "").trim() || "Approved by loan officer"
      );
      setKycRemarks((prev) => ({ ...prev, [kycId]: "" }));
      await loadKyc(); // refresh list
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "KYC approve failed");
    }
  };

  // reject kyc
  const rejectKyc = async (kycId) => {
    try {
      await kycApi.reject(
        kycId,
        (kycRemarks[kycId] || "").trim() || "Rejected by loan officer"
      );
      setKycRemarks((prev) => ({ ...prev, [kycId]: "" }));
      await loadKyc(); // refresh list
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "KYC reject failed");
    }
  };

  const handleFileDownload = async (fileId, fallbackName = "document.pdf") => {
    try {
      await fileApi.download(fileId, fallbackName);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "File download failed");
    }
  };

  const approveLoan = async (loan) => {
    try {
      setIsApproving(true);
      if (loan.status === "SUBMITTED") {
        await loanApi.moveToReview(loan.id);
      }
      await loanApi.approve(loan.id, {
        approvedAmount: loan.requestedAmount,
        comments: (loanRemarks[loan.id] || "").trim() || "Approved by loan officer",
      });
      setLoanRemarks((prev) => ({ ...prev, [loan.id]: "" }));
      await loadLoans();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Loan approval failed");
    } finally {
      setIsApproving(false);
      setConfirmingLoan(null);
    }
  };

  const handleApproveLoanClick = (loan) => {
    setConfirmingLoan(loan);
  };

  const confirmApproveLoan = async () => {
    if (confirmingLoan) {
      await approveLoan(confirmingLoan);
    }
  };

  const rejectLoan = async (loan) => {
    try {
      if (loan.status === "SUBMITTED") {
        await loanApi.moveToReview(loan.id);
      }
      await loanApi.reject(loan.id, (loanRemarks[loan.id] || "").trim() || "Rejected by loan officer");
      setLoanRemarks((prev) => ({ ...prev, [loan.id]: "" }));
      await loadLoans();
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Loan rejection failed");
    }
  };

  return (
    <PortalShell title="Credit Officer Portal" subtitle="Review KYC requests">
      <div className="space-y-6">
        {error && (
          <div className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-800">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50/70 to-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-black">Total KYC</div>
              <div className="mt-1 text-2xl font-black text-slate-900">{KYC_STATUSES.reduce((sum, s) => sum + (kycStatusCounts[s] || 0), 0)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-black">Loan Queue</div>
              <div className="mt-1 text-2xl font-black text-slate-900">{loanRecords.length}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-black">Under Review</div>
              <div className="mt-1 text-2xl font-black text-slate-900">{loanStatusCounts.UNDER_REVIEW || 0}</div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {KYC_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setKycStatus(s)}
              className={`rounded-2xl border p-5 text-left transition-all ${
                kycStatus === s
                  ? "border-emerald-700 bg-emerald-700 text-white shadow-md"
                  : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/40"
              }`}
            >
              <div className="text-[9px] font-black uppercase tracking-[0.16em]">{s}</div>
              <div className="mt-2 text-2xl font-black leading-none">{kycStatusCounts[s] ?? 0}</div>
              <div className={`mt-3 inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${kycStatus === s ? "border-white/40 text-white" : STATUS_TONE[s]}`}>
                {kycStatus === s ? "Active Queue" : "Switch Queue"}
              </div>
            </button>
          ))}
        </div>

      {/* KYC LIST */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              KYC Queue: <span className="text-slate-500">{kycStatus}</span>
            </h2>
            <button
              onClick={loadKyc}
              className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-emerald-700 transition hover:bg-emerald-50"
            >
              Refresh
            </button>
          </div>

        {kycLoading ? (
          <p className="text-sm text-slate-600">Loading KYC records...</p>
        ) : kycRecords.length === 0 ? (
          <p className="text-sm text-slate-500">No KYC records.</p>
        ) : (
          <div className="space-y-4">
            {kycRecords.map((kyc) => (
              <div key={kyc.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex flex-col justify-between gap-3 md:flex-row">
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <div className="font-semibold text-slate-900">{kyc.fullName}</div>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_TONE[kyc.status] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        {kyc.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      PAN: {kyc.panNumber} | Aadhaar: {kyc.aadhaarNumber}
                    </div>
                    <div className="mt-2 flex gap-2">
                      {kyc.panDocumentFileId ? (
                        <button
                          type="button"
                          onClick={() => handleFileDownload(kyc.panDocumentFileId, "pan-document.pdf")}
                          className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                        >
                          PAN PDF
                        </button>
                      ) : null}
                      {kyc.aadhaarDocumentFileId ? (
                        <button
                          type="button"
                          onClick={() => handleFileDownload(kyc.aadhaarDocumentFileId, "aadhaar-document.pdf")}
                          className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                        >
                          Aadhaar PDF
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-auto">
                    {String(kyc.status || "").toUpperCase() === "APPROVED" ? (
                      <span className="inline-flex w-auto items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        Approved
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => approveKyc(kyc.id)}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectKyc(kyc.id)}
                          className="rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <input
                  value={kycRemarks[kyc.id] || ""}
                  onChange={(e) =>
                    setKycRemarks((p) => ({ ...p, [kyc.id]: e.target.value }))
                  }
                  placeholder="Officer remarks"
                  className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                />
                <div className="mt-2 text-xs text-slate-500">
                  Current Remarks: {kyc.remarks || "-"}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            Loan Queue <span className="text-slate-500">({loanRecords.length})</span>
          </h2>
          <button
            onClick={loadLoans}
            className="rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.15em] text-emerald-700 transition hover:bg-emerald-50"
          >
            Refresh
          </button>
        </div>
        {loanLoading ? (
          <p className="text-sm text-slate-600">Loading loans...</p>
        ) : loanRecords.length === 0 ? (
          <p className="text-sm text-slate-500">No pending loan requests.</p>
        ) : (
          <div className="space-y-4">
            {loanRecords.map((loan) => (
              <div key={loan.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-sm">
                {/* Customer Info Header */}
                {(() => {
                  const customer = customerById[loan.customerId];
                  return (
                    <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                      <div className="font-semibold text-slate-900 text-sm mb-2">
                        {customer?.fullName || "Customer"}
                      </div>
                      <div className="text-xs text-slate-600 space-y-1">
                        <div>Credit Score: <span className="font-semibold text-slate-900">{customer?.creditScore ?? "-"}</span></div>
                        <div>Phone: <span className="font-semibold text-slate-900">{customer?.phone || "-"}</span></div>
                        <div>Monthly Income: <span className="font-semibold text-emerald-700">{Number(customer?.monthlyIncome || 0).toLocaleString("en-IN", {style: "currency", currency: "INR", maximumFractionDigits: 0})}</span></div>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Loan Details */}
                <div className="px-6 py-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Loan Type</div>
                      <div className="font-semibold text-slate-900">{loan.loanProductName || 'Unknown Loan'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Requested Amount</div>
                      <div className="font-semibold text-slate-900">{Number(loan.requestedAmount || 0).toLocaleString("en-IN", {style: "currency", currency: "INR", maximumFractionDigits: 0})}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Tenure</div>
                      <div className="font-semibold text-slate-900">{loan.tenure} months</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Status</div>
                      <span className={`inline-block rounded-full border px-2.5 py-1 text-[11px] font-bold ${STATUS_TONE[loan.status] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        {loan.status}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {loan.status !== "APPROVED" && loan.status !== "REJECTED" && (
                    <div className="mb-4 flex gap-2">
                      <button 
                        onClick={() => handleApproveLoanClick(loan)} 
                        disabled={isApproving} 
                        className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => rejectLoan(loan)} 
                        className="flex-1 rounded-lg border-2 border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  {/* Documents Section */}
                  {(loanDocuments[loan.id]?.length ?? 0) > 0 && (
                    <div className="mb-4 pt-4 border-t border-slate-200">
                      <div className="text-xs font-bold uppercase tracking-widest text-slate-600 mb-3">Submitted Documents</div>
                      <div className="space-y-2">
                        {loanDocuments[loan.id]?.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-xs">
                            <span className="text-slate-700 font-medium">{doc.displayName || doc.fileName || "Document"}</span>
                            <button
                              onClick={() => handleFileDownload(doc.id, doc.displayName || doc.fileName || "document.pdf")}
                              className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-emerald-700"
                            >
                              Download
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Remarks Input - Only for pending loans */}
                  {loan.status !== "APPROVED" && loan.status !== "REJECTED" && (
                    <input
                      value={loanRemarks[loan.id] || ""}
                      onChange={(e) => setLoanRemarks((p) => ({ ...p, [loan.id]: e.target.value }))}
                      placeholder="Add loan remarks (optional)"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {confirmingLoan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Approve Loan Request?</h2>
            <div className="space-y-3 mb-6 text-sm text-slate-600">
              <div>
                <span className="font-semibold text-slate-700">Applicant:</span> {confirmingLoan.customerId ? (customerById[confirmingLoan.customerId]?.fullName || "Customer") : "Customer"}
              </div>
              <div>
                <span className="font-semibold text-slate-700">Loan Type:</span> {confirmingLoan.loanProductName || 'Unknown Loan'}
              </div>
              <div>
                <span className="font-semibold text-slate-700">Requested Amount:</span> {Number(confirmingLoan.requestedAmount || 0).toLocaleString("en-IN", {style: "currency", currency: "INR", maximumFractionDigits: 0})}
              </div>
              <div>
                <span className="font-semibold text-slate-700">Tenure:</span> {confirmingLoan.tenure} months
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmingLoan(null)}
                disabled={isApproving}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmApproveLoan}
                disabled={isApproving}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50"
              >
                {isApproving ? "Approving..." : "Yes, Approve"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </PortalShell>
  );
}
