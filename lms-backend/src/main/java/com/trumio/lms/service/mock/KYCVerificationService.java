package com.trumio.lms.service.mock;



import com.trumio.lms.entity.enums.KYCStatus;
import org.springframework.stereotype.Service;

import java.util.Random;

@Service
public class KYCVerificationService {

    private final Random random = new Random();

    /**
     * Mock KYC verification (simulates external verification)
     */
    public KYCStatus verifyKYC(String panNumber, String documentPath) {
        try {
            Thread.sleep(1000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // 90% success rate
        return random.nextInt(10) < 9 ? KYCStatus.APPROVED : KYCStatus.REJECTED;
    }
}
