import { useCallback, useEffect, useMemo, useState } from "react";
import { fileApi, repaymentApi } from "../api/domainApi.js";

// Custom hook
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

  // Old mock/manual pay (optional to keep)
 // ✅ Stripe PAY (make this the default payInstallment)
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

      const successUrl = `${window.location.origin}/pay/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${window.location.origin}/pay/cancel`;

      const res = await repaymentApi.createStripeCheckoutSession({
        loanApplicationId: activeLoanId,
        amount,
        successUrl,
        cancelUrl,
      });

      const checkoutUrl = res?.data?.url;
      if (!checkoutUrl) {
        setActionError("Stripe session URL not received from server.");
        return false;
      }

      window.location.href = checkoutUrl;
      return true;
    } catch (e) {
      setActionError(e?.response?.data?.message || e?.message || "Stripe payment failed");
      return false;
    } finally {
      setActionBusy(false);
    }
  },
  [activeLoanId]
);


  // ✅ Stripe Checkout redirect (Opt A)
  const payInstallmentWithStripe = useCallback(
    async (installment, { successUrl, cancelUrl }) => {
      if (!activeLoanId || !installment || installment.status === "PAID") return false;

      setActionBusy(true);
      setActionError("");
      try {
        const amount = Number(installment.totalAmount || 0);

        const res = await repaymentApi.createStripeCheckoutSession({
          loanApplicationId: activeLoanId,
          amount,
          successUrl,
          cancelUrl,
        });

        const session = res?.data;
        const checkoutUrl = session?.url;

        if (!checkoutUrl) {
          setActionError("Stripe session URL not received.");
          return false;
        }

        window.location.href = checkoutUrl;
        return true;
      } catch (e) {
        setActionError(e?.response?.data?.message || e?.message || "Stripe payment failed");
        return false;
      } finally {
        setActionBusy(false);
      }
    },
    [activeLoanId]
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
    payInstallment, // keep (optional)
    payInstallmentWithStripe, // ✅ new
    missInstallment,
  };
}
