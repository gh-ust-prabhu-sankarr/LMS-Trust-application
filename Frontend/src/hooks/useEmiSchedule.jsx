import { useCallback, useEffect, useMemo, useState } from "react";
import { fileApi, repaymentApi } from "../api/domainApi.js";
//custome hook
export function useEmiSchedule(activeLoanId) { //when loan chnaged ..it loads
  const [repayments, setRepayments] = useState([]); //Stores repayment history.
  const [schedule, setSchedule] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionBusy, setActionBusy] = useState(false); //This prevents double clicking Pay or Miss button will disapbled..  
  const [actionError, setActionError] = useState("");//Stores Pay/Miss errors.

  const reset = useCallback(() => { //functions inside React get recreated every render.
    setRepayments([]);
    setSchedule(null);
    setDocs([]);                           //If no loan selected,we must clear old data
    setError("");
    setActionError("");
  }, []);

  const load = useCallback(async () => { //loads all EMI-related data.
    if (!activeLoanId) {
      reset();
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [repRes, schRes, fileRes] = await Promise.allSettled([ //calss all api same for doc wmi sche repay
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

  const payInstallment = useCallback(async (installment) => {  //This handles Pay button.
    if (!activeLoanId || !installment || installment.status === "PAID") return false;
    setActionBusy(true);
    setActionError("");
    try {
      await repaymentApi.makePayment({
        loanApplicationId: activeLoanId,
        amount: Number(installment.totalAmount || 0), //ensure numeric type.
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

  const payCustomAmount = useCallback(async (amount) => {
    if (!activeLoanId) return false;
    const numericAmount = Number(amount || 0);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setActionError("Enter a valid amount");
      return false;
    }

    setActionBusy(true);
    setActionError("");
    try {
      await repaymentApi.makePayment({
        loanApplicationId: activeLoanId,
        amount: numericAmount,
      });
      await load();
      return true;
    } catch (e) {
      setActionError(e?.response?.data?.message || e?.message || "Payment failed");
      return false;
    } finally {
      setActionBusy(false);
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

  const installments = useMemo(() => schedule?.installments || [], [schedule]);  //only recalculates when schedule changes.

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
    payCustomAmount,
    missInstallment,
  };
}
