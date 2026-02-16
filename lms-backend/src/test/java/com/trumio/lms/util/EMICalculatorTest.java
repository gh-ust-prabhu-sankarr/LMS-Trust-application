package com.trumio.lms.util;

import com.trumio.lms.entity.EMIInstallment;
import com.trumio.lms.entity.enums.EMIStatus;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EMICalculatorTest {

    @Test
    void calculateEMI_ShouldReturnExpectedRoundedValue() {
        double emi = EMICalculator.calculateEMI(100000, 12, 12);
        assertEquals(8884.88, emi, 0.01);
    }

    @Test

    void generateSchedule_ShouldCreateFullScheduleWithPendingInstallments() {
        LocalDate startDate = LocalDate.of(2026, 1, 1);

        List<EMIInstallment> schedule = EMICalculator.generateSchedule(100000, 12, 12, startDate);

        assertEquals(12, schedule.size());
        assertEquals(LocalDate.of(2026, 2, 1), schedule.getFirst().getDueDate());
        assertEquals(LocalDate.of(2027, 1, 1), schedule.getLast().getDueDate());
        assertTrue(schedule.stream().allMatch(i -> i.getStatus() == EMIStatus.PENDING));
    }

    @Test
    void calculateTotalInterest_ShouldBePositiveForPositiveRate() {
        double totalInterest = EMICalculator.calculateTotalInterest(100000, 12, 12);
        assertTrue(totalInterest > 0);
    }
}
