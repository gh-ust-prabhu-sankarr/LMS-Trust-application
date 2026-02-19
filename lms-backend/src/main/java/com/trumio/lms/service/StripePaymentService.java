package com.trumio.lms.service;

import com.stripe.exception.StripeException;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import com.trumio.lms.config.StripeProperties;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class StripePaymentService {

    private final StripeProperties props;

    public Session createCheckoutSession(
            String loanApplicationId,
            Double amount,
            String userId,
            String successUrl,
            String cancelUrl,
            String paymentMode,
            Integer installmentCount
    ) throws StripeException {

        if (successUrl == null || !successUrl.contains("{CHECKOUT_SESSION_ID}")) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "successUrl must contain {CHECKOUT_SESSION_ID}");
        }

        long amountMinor = Math.round(amount * 100); // INR paise

        SessionCreateParams.Builder builder = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.PAYMENT)
                .setSuccessUrl(successUrl)
                .setCancelUrl(cancelUrl)
                .addLineItem(
                        SessionCreateParams.LineItem.builder()
                                .setQuantity(1L)
                                .setPriceData(
                                        SessionCreateParams.LineItem.PriceData.builder()
                                                .setCurrency(props.getCurrency().toLowerCase()) // ✅ ensure inr
                                                .setUnitAmount(amountMinor)
                                                .setProductData(
                                                        SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                                                .setName("Loan Repayment")
                                                                .build()
                                                )
                                                .build()
                                )
                                .build()
                )
                .putMetadata("loanApplicationId", loanApplicationId)
                .putMetadata("userId", userId)
                .putMetadata("paymentMode", paymentMode == null || paymentMode.isBlank() ? "INSTALLMENT" : paymentMode);

        if (installmentCount != null) {
            builder.putMetadata("installmentCount", String.valueOf(installmentCount));
        }

        SessionCreateParams params = builder.build();

        return Session.create(params);
    }

    public Session retrievePaidSessionOrThrow(String sessionId) throws StripeException {
        Session session = Session.retrieve(sessionId);

        boolean paid = "complete".equalsIgnoreCase(session.getStatus())
                && "paid".equalsIgnoreCase(session.getPaymentStatus());

        if (!paid) {
            throw new BusinessException(ErrorCode.STRIPE_PAYMENT_NOT_COMPLETED,
                    "Payment not completed yet. status=" + session.getStatus()
                            + ", payment_status=" + session.getPaymentStatus());
        }
        return session;
    }
}
