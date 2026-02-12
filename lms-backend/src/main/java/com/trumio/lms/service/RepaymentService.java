package com.trumio.lms.service;

import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.dto.RepaymentRequest;
import com.trumio.lms.entity.EMIInstallment;
import com.trumio.lms.entity.EMISchedule;
import com.trumio.lms.entity.LoanApplication;
import com.trumio.lms.entity.Repayment;
import com.trumio.lms.entity.Customer;
import com.trumio.lms.entity.User;
import com.trumio.lms.entity.User;
import com.trumio.lms.entity.enums.EMIStatus;
import com.trumio.lms.entity.enums.RepaymentStatus;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;
import com.trumio.lms.repository.EMIScheduleRepository;
import com.trumio.lms.repository.LoanApplicationRepository;
import com.trumio.lms.repository.RepaymentRepository;
import com.trumio.lms.repository.CustomerRepository;
import com.trumio.lms.repository.UserRepository;
import com.trumio.lms.service.mock.PaymentGatewayService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RepaymentService {

    private final RepaymentRepository repaymentRepository;
    private final EMIScheduleRepository emiScheduleRepository;
    private final LoanApplicationRepository loanApplicationRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final LoanProductService loanProductService;
    private final PaymentGatewayService paymentGatewayService;
    private final AuditService auditService;

    public ApiResponse<Repayment> processRepayment(RepaymentRequest request, String userId) {
        EMISchedule schedule = emiScheduleRepository.findByLoanApplicationId(request.getLoanApplicationId())
                .orElseThrow(() -> new BusinessException(ErrorCode.EMI_NOT_FOUND));
        LoanApplication loan = loanApplicationRepository.findById(request.getLoanApplicationId())
                .orElseThrow(() -> new BusinessException(ErrorCode.LOAN_NOT_FOUND));
        enrichLoanWithProductName(loan);
        Customer customer = customerRepository.findById(loan.getCustomerId())
                .orElseThrow(() -> new BusinessException(ErrorCode.CUSTOMER_NOT_FOUND));

        double amount = request.getAmount() == null ? 0.0 : request.getAmount();

        String transactionId;
        try {
            transactionId = paymentGatewayService.processPayment(
                    request.getLoanApplicationId(),
                    amount
            );
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.REPAYMENT_FAILED, "Payment gateway error: " + e.getMessage());
        }

        Repayment repayment = Repayment.builder()
                .loanApplicationId(request.getLoanApplicationId())
                .amount(amount)
                .paymentDate(LocalDateTime.now())
                .transactionId(transactionId)
                .status(RepaymentStatus.SUCCESS)
                .createdAt(LocalDateTime.now())
                .build();

        Repayment saved = repaymentRepository.save(repayment);

        // Update EMI schedule
        updateEMISchedule(schedule, amount);
        adjustCreditScore(customer, amount > 0 ? 5 : 0);
        customerRepository.save(customer);

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

    public ApiResponse<EMISchedule> markMissed(String loanId, String userId) {
        EMISchedule schedule = emiScheduleRepository.findByLoanApplicationId(loanId)
                .orElseThrow(() -> new BusinessException(ErrorCode.EMI_NOT_FOUND));
        LoanApplication loan = loanApplicationRepository.findById(loanId)
                .orElseThrow(() -> new BusinessException(ErrorCode.LOAN_NOT_FOUND));
        Customer customer = customerRepository.findById(loan.getCustomerId())
                .orElseThrow(() -> new BusinessException(ErrorCode.CUSTOMER_NOT_FOUND));

        Optional<EMIInstallment> firstPending = schedule.getInstallments().stream()
                .filter(i -> i.getStatus() == EMIStatus.PENDING)
                .findFirst();
        if (firstPending.isPresent()) {
            EMIInstallment installment = firstPending.get();
            installment.setStatus(EMIStatus.OVERDUE);
            emiScheduleRepository.save(schedule);
            adjustCreditScore(customer, -10);
            customerRepository.save(customer);
            auditService.log(userId, "EMI_MISSED", "EMI", loanId, "EMI marked as missed");
        }

        return ApiResponse.success("EMI marked as missed", schedule);
    }

    private void adjustCreditScore(Customer customer, int delta) {
        int current = customer.getCreditScore() == null ? 650 : customer.getCreditScore();
        int next = current + delta;
        if (next < 300) next = 300;
        if (next > 900) next = 900;
        customer.setCreditScore(next);
    }

    public List<Repayment> getRepaymentsByLoan(String loanId) {
        return repaymentRepository.findByLoanApplicationId(loanId);
    }

    private void enrichLoanWithProductName(LoanApplication loan) {
        if (loan.getLoanProductName() == null || loan.getLoanProductName().isEmpty()) {
            try {
                loan.setLoanProductName(loanProductService.getById(loan.getLoanProductId()).getName());
            } catch (Exception e) {
                if (loan.getLoanProductName() == null) {
                    loan.setLoanProductName("Unknown Loan");
                }
            }
        }
    }
}
