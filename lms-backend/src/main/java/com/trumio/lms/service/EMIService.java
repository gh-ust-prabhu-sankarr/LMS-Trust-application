package com.trumio.lms.service;

import com.trumio.lms.entity.EMIInstallment;
import com.trumio.lms.entity.EMISchedule;
import com.trumio.lms.entity.LoanApplication;
import com.trumio.lms.repository.EMIScheduleRepository;
import com.trumio.lms.util.EMICalculator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class EMIService {

    private final EMIScheduleRepository emiScheduleRepository;

    public EMISchedule generateSchedule(LoanApplication loan) {
        List<EMIInstallment> installments = EMICalculator.generateSchedule(
                loan.getApprovedAmount(),
                loan.getInterestRate(),
                loan.getTenure(),
                LocalDate.now()
        );

        double totalPrincipal = loan.getApprovedAmount();
        double totalInterest = EMICalculator.calculateTotalInterest(
                loan.getApprovedAmount(),
                loan.getInterestRate(),
                loan.getTenure()
        );

        EMISchedule schedule = EMISchedule.builder()
                .loanApplicationId(loan.getId())
                .installments(installments)
                .totalPrincipal(totalPrincipal)
                .totalInterest(totalInterest)
                .createdAt(LocalDateTime.now())
                .build();

        return emiScheduleRepository.save(schedule);
    }

    public Optional<EMISchedule> getScheduleByLoanId(String loanId) {
        return emiScheduleRepository.findByLoanApplicationId(loanId);
    }
}