package com.trumio.lms.util;


import com.trumio.lms.entity.EMIInstallment;
import com.trumio.lms.entity.enums.EMIStatus;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class EMICalculator {

    /**
     * Calculate EMI using reducing balance method
     * Formula: EMI = [P x R x (1+R)^N] / [(1+R)^N-1]
     */
    public static double calculateEMI(double principal, double annualRate, int tenureMonths) {
        double monthlyRate = annualRate / (12 * 100);
        double emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
                (Math.pow(1 + monthlyRate, tenureMonths) - 1);
        return Math.round(emi * 100.0) / 100.0;
    }

    /**
     * Generate complete EMI schedule
     */
    public static List<EMIInstallment> generateSchedule(double principal, double annualRate,
                                                        int tenureMonths, LocalDate startDate) {
        List<EMIInstallment> installments = new ArrayList<>();
        double monthlyRate = annualRate / (12 * 100);
        double emi = calculateEMI(principal, annualRate, tenureMonths);
        double remainingPrincipal = principal;

        for (int i = 1; i <= tenureMonths; i++) {
            double interestAmount = remainingPrincipal * monthlyRate;
            double principalAmount = emi - interestAmount;

            // Adjust last installment for rounding differences
            if (i == tenureMonths) {
                principalAmount = remainingPrincipal;
                emi = principalAmount + interestAmount;
            }

            EMIInstallment installment = EMIInstallment.builder()
                    .installmentNumber(i)
                    .dueDate(startDate.plusMonths(i))
                    .principalAmount(Math.round(principalAmount * 100.0) / 100.0)
                    .interestAmount(Math.round(interestAmount * 100.0) / 100.0)
                    .totalAmount(Math.round(emi * 100.0) / 100.0)
                    .paidAmount(0.0)
                    .status(EMIStatus.PENDING)
                    .build();

            installments.add(installment);
            remainingPrincipal -= principalAmount;
        }

        return installments;
    }

    /**
     * Calculate total interest payable
     */
    public static double calculateTotalInterest(double principal, double annualRate, int tenureMonths) {
        double emi = calculateEMI(principal, annualRate, tenureMonths);
        return (emi * tenureMonths) - principal;
    }
}