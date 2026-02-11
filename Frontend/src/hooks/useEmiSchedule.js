import { useCallback, useEffect, useMemo, useState } from "react";
import { fileApi, repaymentApi } from "../api/domainApi.js";
//custome hook
export function useEmiSchedule(activeLoanId) {
  const [repayments, setRepayments] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const reset = useCallback(() => {
    setRepayments([]);
    setSchedule(null);
    setDocs([]);
    setError("");
    setActionError("");
  }, []);

  const load = useCallback(async () => {
    if (!activeLoanId) {
      reset();
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [repRes, schRes, fileRes] = await Promise.allSettled([
        repaymentApi.getByLoan(activeLoanId),
        repaymentApi.getSchedule(activeLoanId),
        fileApi.listByEntity("LOAN_APPLICATION", activeLoanId),
      ]);
      if (repRes.status === "fulfilled") setRepayments(repRes.value.data || []);
      if (schRes.status === "fulfilled") setSchedule(schRes.value.data || null);
      if (fileRes.status === "fulfilled") setDocs(fileRes.value.data || []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load schedule");
    } finally {
      setLoading(false);
    }
  }, [activeLoanId, reset]);

  useEffect(() => {
    load();
  }, [load]);

  const payInstallment = useCallback(async (installment) => {
    if (!activeLoanId || !installment || installment.status === "PAID") return false;
    setActionBusy(true);
    setActionError("");
    try {
      await repaymentApi.makePayment({
        loanApplicationId: activeLoanId,
        amount: Number(installment.totalAmount || 0),
      });
      await load();
      return true;
    } catch (e) {
      setActionError(e?.response?.data?.message || e?.message || "Payment failed");
      return false;
    } finally {
      setActionBusy(false);
      //ko
    }
  }, [activeLoanId, load]);

  const missInstallment = useCallback(async () => {
    if (!activeLoanId) return false;
    setActionBusy(true);
    setActionError("");
    try {
      await repaymentApi.markMissed(activeLoanId);
      await load();
      return true;
    } catch (e) {
      setActionError(e?.response?.data?.message || e?.message || "Miss action failed");
      return false;
    } finally {
      setActionBusy(false);
    }
  }, [activeLoanId, load]);

  const installments = useMemo(() => schedule?.installments || [], [schedule]);

  return {
    repayments,
    schedule,
    docs,
    installments,
    loading,
    error,
    actionBusy,
    actionError,
    load,
    payInstallment,
    missInstallment,
  };
}
