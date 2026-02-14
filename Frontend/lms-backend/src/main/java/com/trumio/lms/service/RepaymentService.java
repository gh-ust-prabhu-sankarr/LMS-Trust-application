package com.trumio.lms.service;

import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.dto.RepaymentRequest;
import com.trumio.lms.entity.EMIInstallment;
import com.trumio.lms.entity.EMISchedule;
import com.trumio.lms.entity.LoanApplication;
import com.trumio.lms.entity.Repayment;
import com.trumio.lms.entity.Customer;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RepaymentService {
    private static final double DEFAULT_CUSTOMER_BANK_BALANCE = 100000.0;
    private static final double DEFAULT_OFFICER_BANK_BALANCE = 1_000_000_000.0;

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
        if (amount <= 0) {
            throw new BusinessException(ErrorCode.INVALID_AMOUNT, "Repayment amount must be greater than 0");
        }
        if (customer.getBankBalance() == null) {
            customer.setBankBalance(DEFAULT_CUSTOMER_BANK_BALANCE);
        }
        if (customer.getBankBalance() < amount) {
            throw new BusinessException(ErrorCode.INSUFFICIENT_WALLET_BALANCE, "Insufficient customer bank balance");
        }

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

        customer.setBankBalance(customer.getBankBalance() - amount);
        customer.setUpdatedAt(LocalDateTime.now());

        if (loan.getReviewedBy() != null && !loan.getReviewedBy().isBlank()) {
            userRepository.findById(loan.getReviewedBy()).ifPresent(officer -> {
                if (officer.getBankBalance() == null) {
                    officer.setBankBalance(DEFAULT_OFFICER_BANK_BALANCE);
                }
                officer.setBankBalance(officer.getBankBalance() + amount);
                officer.setUpdatedAt(LocalDateTime.now());
                userRepository.save(officer);
            });
        }

        // Update EMI schedule; supports early bulk prepayment with interest/EMI recast.
        updateEMISchedule(schedule, loan, amount);
        adjustCreditScore(customer, amount > 0 ? 5 : 0);
        customerRepository.save(customer);

        auditService.log(userId, "REPAYMENT", "REPAYMENT", saved.getId(),
                "Repayment of " + request.getAmount());

        return ApiResponse.success("Payment processed successfully", saved);
    }

    private void updateEMISchedule(EMISchedule schedule, LoanApplication loan, Double amount) {
        double remainingAmount = amount == null ? 0.0 : amount;
        LocalDate paymentDate = LocalDate.now();
        boolean paidFutureInstallment = false;

        for (EMIInstallment installment : schedule.getInstallments()) {
            if (remainingAmount <= 0) break;
            if (installment.getStatus() == EMIStatus.PAID) continue;

            double paidSoFar = nvl(installment.getPaidAmount());
            double pending = round2(nvl(installment.getTotalAmount()) - paidSoFar);
            if (pending <= 0) {
                installment.setPaidAmount(nvl(installment.getTotalAmount()));
                installment.setStatus(EMIStatus.PAID);
                installment.setPaidDate(paymentDate);
                continue;
            }

            if (remainingAmount >= pending) {
                installment.setPaidAmount(installment.getTotalAmount());
                installment.setStatus(EMIStatus.PAID);
                installment.setPaidDate(paymentDate);
                remainingAmount -= pending;
                if (installment.getDueDate() != null && installment.getDueDate().isAfter(paymentDate)) {
                    paidFutureInstallment = true;
                }
            } else {
                installment.setPaidAmount(round2(paidSoFar + remainingAmount));
                installment.setStatus(EMIStatus.PARTIAL);
                remainingAmount = 0;
            }
        }

        // Recast future installments only for clean advance-payment cases (no partials pending).
        boolean hasPendingPartial = schedule.getInstallments().stream()
                .anyMatch(i -> i.getStatus() != EMIStatus.PAID && nvl(i.getPaidAmount()) > 0.0);
        if (paidFutureInstallment && !hasPendingPartial) {
            recastRemainingSchedule(schedule, loan, paymentDate);
        }

        schedule.setTotalInterest(round2(schedule.getInstallments().stream()
                .mapToDouble(i -> nvl(i.getInterestAmount()))
                .sum()));
        emiScheduleRepository.save(schedule);
        loanApplicationRepository.save(loan);
    }

    private void recastRemainingSchedule(EMISchedule schedule, LoanApplication loan, LocalDate today) {
        List<EMIInstallment> remaining = schedule.getInstallments().stream()
                .filter(i -> i.getStatus() != EMIStatus.PAID)
                .toList();
        if (remaining.isEmpty()) {
            loan.setEmi(0.0);
            return;
        }

        double outstandingPrincipal = round2(remaining.stream()
                .mapToDouble(this::pendingPrincipal)
                .sum());
        if (outstandingPrincipal <= 0) {
            loan.setEmi(0.0);
            return;
        }

        int remainingMonths = remaining.size();
        double annualRate = nvl(loan.getInterestRate());
        double monthlyRate = annualRate / (12 * 100.0);
        double emi = monthlyRate == 0.0
                ? round2(outstandingPrincipal / remainingMonths)
                : com.trumio.lms.util.EMICalculator.calculateEMI(outstandingPrincipal, annualRate, remainingMonths);

        double principalLeft = outstandingPrincipal;
        for (int i = 0; i < remainingMonths; i++) {
            EMIInstallment installment = remaining.get(i);
            double interestAmount = monthlyRate == 0.0 ? 0.0 : principalLeft * monthlyRate;
            double principalAmount = emi - interestAmount;
            if (i == remainingMonths - 1 || principalAmount > principalLeft) {
                principalAmount = principalLeft;
                emi = principalAmount + interestAmount;
            }

            installment.setPrincipalAmount(round2(principalAmount));
            installment.setInterestAmount(round2(interestAmount));
            installment.setTotalAmount(round2(emi));
            installment.setPaidAmount(0.0);
            installment.setPaidDate(null);
            installment.setStatus(
                    installment.getDueDate() != null && installment.getDueDate().isBefore(today)
                            ? EMIStatus.OVERDUE
                            : EMIStatus.PENDING
            );

            principalLeft = round2(principalLeft - principalAmount);
        }

        loan.setEmi(round2(remaining.get(0).getTotalAmount()));
    }

    private double pendingPrincipal(EMIInstallment installment) {
        double principal = nvl(installment.getPrincipalAmount());
        double interest = nvl(installment.getInterestAmount());
        double paid = nvl(installment.getPaidAmount());
        double principalPaid = Math.max(0.0, Math.min(principal, paid - interest));
        return round2(principal - principalPaid);
    }

    private double nvl(Double value) {
        return value == null ? 0.0 : value;
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    public ApiResponse<EMISchedule> markMissed(String loanId, String userId) {
        EMISchedule schedule = emiScheduleRepository.findByLoanApplicationId(loanId)
                .orElseThrow(() -> new BusinessException(ErrorCode.EMI_NOT_FOUND));
        LoanApplication loan = loanApplicationRepository.findById(loanId)
                .orElseThrow(() -> new BusinessException(ErrorCode.LOAN_NOT_FOUND));
        Customer customer = customerRepository.findById(loan.getCustomerId())
                .orElseThrow(() -> new BusinessException(ErrorCode.CUSTOMER_NOT_FOUND));

        Optional<EMIInstallment> firstPending = schedule.getInstallments().stream()
                .filter(i -> i.getStatus() == EMIStatus.PENDING) // // Find first unpaid EMI
                .findFirst();
        if (firstPending.isPresent()) {
            // Mark installment as overdue
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
