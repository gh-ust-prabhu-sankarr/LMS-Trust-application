package com.trumio.lms.service;

import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.dto.RepaymentRequest;
import com.trumio.lms.entity.EMIInstallment;
import com.trumio.lms.entity.EMISchedule;
import com.trumio.lms.entity.Repayment;
import com.trumio.lms.entity.enums.EMIStatus;
import com.trumio.lms.entity.enums.RepaymentStatus;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;
import com.trumio.lms.repository.EMIScheduleRepository;
import com.trumio.lms.repository.RepaymentRepository;
import com.trumio.lms.service.mock.PaymentGatewayService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RepaymentService {

    private final RepaymentRepository repaymentRepository;
    private final EMIScheduleRepository emiScheduleRepository;
    private final PaymentGatewayService paymentGatewayService;
    private final AuditService auditService;

    public ApiResponse<Repayment> processRepayment(RepaymentRequest request, String userId) {
        EMISchedule schedule = emiScheduleRepository.findByLoanApplicationId(request.getLoanApplicationId())
                .orElseThrow(() -> new BusinessException(ErrorCode.EMI_NOT_FOUND));

        String transactionId;
        try {
            transactionId = paymentGatewayService.processPayment(
                    request.getLoanApplicationId(),
                    request.getAmount()
            );
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.REPAYMENT_FAILED, "Payment gateway error: " + e.getMessage());
        }

        Repayment repayment = Repayment.builder()
                .loanApplicationId(request.getLoanApplicationId())
                .amount(request.getAmount())
                .paymentDate(LocalDateTime.now())
                .transactionId(transactionId)
                .status(RepaymentStatus.SUCCESS)
                .createdAt(LocalDateTime.now())
                .build();

        Repayment saved = repaymentRepository.save(repayment);

        // Update EMI schedule
        updateEMISchedule(schedule, request.getAmount());

        auditService.log(userId, "REPAYMENT", "REPAYMENT", saved.getId(),
                "Repayment of " + request.getAmount());

        return ApiResponse.success("Payment processed successfully", saved);
    }

    private void updateEMISchedule(EMISchedule schedule, Double amount) {
        double remainingAmount = amount;

        for (EMIInstallment installment : schedule.getInstallments()) {
            if (remainingAmount <= 0) break;
            if (installment.getStatus() == EMIStatus.PAID) continue;

            double pending = installment.getTotalAmount() - installment.getPaidAmount();

            if (remainingAmount >= pending) {
                installment.setPaidAmount(installment.getTotalAmount());
                installment.setStatus(EMIStatus.PAID);
                installment.setPaidDate(java.time.LocalDate.now());
                remainingAmount -= pending;
            } else {
                installment.setPaidAmount(installment.getPaidAmount() + remainingAmount);
                installment.setStatus(EMIStatus.PARTIAL);
                remainingAmount = 0;
            }
        }

        emiScheduleRepository.save(schedule);
    }

    public List<Repayment> getRepaymentsByLoan(String loanId) {
        return repaymentRepository.findByLoanApplicationId(loanId);
    }
}