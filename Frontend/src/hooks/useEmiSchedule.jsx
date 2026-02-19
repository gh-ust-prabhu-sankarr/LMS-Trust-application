import { useCallback, useEffect, useMemo, useState } from "react";
import { fileApi, repaymentApi } from "../api/domainApi.js";

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

  const startStripeCheckout = useCallback(
    async (amount, paymentMode = "INSTALLMENT", installmentCount = null) => {
      const successUrl = `${window.location.origin}/pay/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}/pay/cancel`;
      const res = await repaymentApi.createStripeCheckoutSession({
        loanApplicationId: activeLoanId,
        amount,
        paymentMode,
        installmentCount,
        successUrl,
        cancelUrl,
      });
      const checkoutUrl = res?.data?.url;
      if (!checkoutUrl) throw new Error("Stripe session URL not received from server.");
      window.location.href = checkoutUrl;
      return true;
    },
    [activeLoanId]
  );

  const payInstallment = useCallback(
    async (installment) => {
      if (!activeLoanId || !installment) return false;
      if (String(installment.status || "").toUpperCase() === "PAID") return true;

      setActionBusy(true);
      setActionError("");
      try {
        const total = Number(installment.totalAmount || 0);
        const paid = Number(installment.paidAmount || 0);
        const amount = Math.max(0, total - paid);
        if (!Number.isFinite(amount) || amount <= 0) {
          setActionError("Nothing pending to pay for this EMI.");
          return false;
        }
        return await startStripeCheckout(amount, "INSTALLMENT");
      } catch (e) {
        setActionError(e?.response?.data?.message || e?.message || "Stripe payment failed");
        return false;
      } finally {
        setActionBusy(false);
      }
    },
    [activeLoanId, startStripeCheckout]
  );

  const payCustomAmount = useCallback(
    async (amount, installmentCount = null) => {
      if (!activeLoanId) return false;
      const numericAmount = Number(amount || 0);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        setActionError("Enter a valid custom amount.");
        return false;
      }

      setActionBusy(true);
      setActionError("");
      try {
        return await startStripeCheckout(numericAmount, "CUSTOM", installmentCount);
      } catch (e) {
        setActionError(e?.response?.data?.message || e?.message || "Stripe payment failed");
        return false;
      } finally {
        setActionBusy(false);
      }
    },
    [activeLoanId, startStripeCheckout]
  );

  const missInstallment = useCallback(
    async () => {
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
    },
    [activeLoanId, load]
  );

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
    payCustomAmount,
    missInstallment,
  };
}
