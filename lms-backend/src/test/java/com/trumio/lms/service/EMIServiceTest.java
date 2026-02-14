package com.trumio.lms.service;

import com.trumio.lms.entity.EMISchedule;
import com.trumio.lms.entity.LoanApplication;
import com.trumio.lms.repository.EMIScheduleRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EMIServiceTest {

    @Mock
    private EMIScheduleRepository emiScheduleRepository;

    @InjectMocks
    private EMIService emiService;

    @Test
    void generateSchedule_ShouldPersistSchedule() {
        LoanApplication loan = LoanApplication.builder()
                .id("loan-1")
                .approvedAmount(100000.0)
                .interestRate(12.0)
                .tenure(12)
                .build();

        when(emiScheduleRepository.save(any(EMISchedule.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EMISchedule schedule = emiService.generateSchedule(loan);

        assertEquals("loan-1", schedule.getLoanApplicationId());
        assertEquals(12, schedule.getInstallments().size());
        assertTrue(schedule.getTotalInterest() > 0);
    }

    @Test
    void getScheduleByLoanId_ShouldReturnOptionalSchedule() {
        EMISchedule schedule = EMISchedule.builder().loanApplicationId("loan-1").build();
        when(emiScheduleRepository.findByLoanApplicationId("loan-1")).thenReturn(Optional.of(schedule));

        Optional<EMISchedule> result = emiService.getScheduleByLoanId("loan-1");

        assertTrue(result.isPresent());
        assertEquals("loan-1", result.get().getLoanApplicationId());
    }
}
