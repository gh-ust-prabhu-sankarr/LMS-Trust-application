import { useEffect, useMemo, useState } from "react";
import PortalShell from "../../components/layout/PortalShell.jsx";
import { kycApi, unwrap } from "../../api/domainApi.js";//unwrap → extract real data from API response  

const KYC_STATUSES = ["PENDING", "APPROVED", "REJECTED"];

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


  const kycRecords = kycByStatus[kycStatus] || [];  // current list shown one at a timeee

  // count shown on top cards  ;;;;;;pending 4 ....
  const kycStatusCounts = useMemo(
    () =>
      KYC_STATUSES.reduce((acc, s) => {
        acc[s] = (kycByStatus[s] || []).length;
        return acc;
      }, {}),
    [kycByStatus]
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

  // load once when dashboard opens
  useEffect(() => {
    loadKyc();
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

  return (
    <PortalShell title="Credit Officer Portal" subtitle="Review KYC requests">
      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* KYC STATUS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {KYC_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setKycStatus(s)}
            className={`rounded-2xl border p-4 text-left ${
              kycStatus === s
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white border-slate-200"
            }`}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest">{s}</div>
            <div className="text-2xl font-semibold mt-1">
              {kycStatusCounts[s] ?? 0}
            </div>
          </button>
        ))}
      </div>

      {/* KYC LIST */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            KYC Queue: {kycStatus}
          </h2>
          <button
            onClick={loadKyc}
            className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest border rounded-sm"
          >
            Refresh
          </button>
        </div>

        {kycLoading ? (
          <p className="text-sm text-slate-600">Loading KYC records...</p>
        ) : kycRecords.length === 0 ? (
          <p className="text-sm text-slate-500">No KYC records.</p>
        ) : (
          <div className="space-y-3">
            {kycRecords.map((kyc) => (
              <div key={kyc.id} className="rounded-xl border p-4">
                <div className="flex justify-between gap-2">
                  <div>
                    <div className="font-semibold">{kyc.fullName}</div>
                    <div className="text-xs text-slate-500">
                      PAN: {kyc.panNumber} | Aadhaar: {kyc.aadhaarNumber}
                    </div>
                    <div className="text-xs text-slate-500">
                      Status: {kyc.status}
                    </div>
                  </div>

                  {kyc.status === "PENDING" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveKyc(kyc.id)}
                        className="px-3 py-1 text-xs bg-emerald-600 text-white rounded"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => rejectKyc(kyc.id)}
                        className="px-3 py-1 text-xs border border-rose-300 text-rose-700 rounded"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>

                {kyc.status === "PENDING" ? (
                  <input
                    value={kycRemarks[kyc.id] || ""}
                    onChange={(e) =>
                      setKycRemarks((p) => ({ ...p, [kyc.id]: e.target.value }))
                    }
                    placeholder="Officer remarks"
                    className="mt-3 w-full rounded-lg border px-3 py-2 text-sm"
                  />
                ) : (
                  <div className="mt-3 text-xs text-slate-500">
                    Remarks: {kyc.remarks || "-"}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </PortalShell>
  );
}
