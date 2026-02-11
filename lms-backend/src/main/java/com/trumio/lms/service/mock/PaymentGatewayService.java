package com.trumio.lms.service.mock;

import com.trumio.lms.entity.enums.RepaymentStatus;
import org.springframework.stereotype.Service;

import java.util.Random;
import java.util.UUID;

@Service
public class PaymentGatewayService {

    private final Random random = new Random();

    /**
     * Mock payment processing
     */
    public String processPayment(String loanId, Double amount) {
        try {
            Thread.sleep(800);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // 95% success rate
        if (random.nextInt(100) < 95) {
            return "TXN_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }

        throw new RuntimeException("Payment gateway error");
    }

    public RepaymentStatus verifyTransaction(String transactionId) {
        return RepaymentStatus.SUCCESS;
    }
}