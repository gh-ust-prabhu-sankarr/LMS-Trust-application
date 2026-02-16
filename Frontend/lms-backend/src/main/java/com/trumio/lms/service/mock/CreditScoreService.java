package com.trumio.lms.service.mock;


import org.springframework.stereotype.Service;

import java.util.Random;

@Service
public class CreditScoreService {

    private final Random random = new Random();

    /**
     * Mock credit score fetch (simulates external API call)
     * Returns score between 300-900
     */
    public Integer fetchCreditScore(String panNumber) {
        // Simulate API delay
        try {
            Thread.sleep(500);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }

        // Generate mock score
        return 300 + random.nextInt(601); // 300-900
    }
}