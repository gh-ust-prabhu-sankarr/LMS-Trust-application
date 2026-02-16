package com.trumio.lms.service;

import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.dto.RepaymentRequest;
import com.trumio.lms.dto.StripeCheckoutSessionRequest;
import com.trumio.lms.dto.StripeCheckoutSessionResponse;
import com.trumio.lms.entity.Customer;
import com.trumio.lms.entity.EMIInstallment;
import com.trumio.lms.entity.EMISchedule;
import com.trumio.lms.entity.LoanApplication;
import com.trumio.lms.entity.Repayment;
import com.trumio.lms.entity.enums.EMIStatus;
import com.trumio.lms.entity.enums.LoanStatus;
import com.trumio.lms.entity.enums.RepaymentStatus;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;
import com.trumio.lms.repository.CustomerRepository;
import com.trumio.lms.repository.EMIScheduleRepository;
import com.trumio.lms.repository.LoanApplicationRepository;
import com.trumio.lms.repository.RepaymentRepository;
import com.trumio.lms.service.mock.PaymentGatewayService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RepaymentService {

    private final RepaymentRepository repaymentRepository;
    private final EMIScheduleRepository emiScheduleRepository;
    private final LoanApplicationRepository loanApplicationRepository;
    private final CustomerRepository customerRepository;
    private final LoanProductService loanProductService;
    private final PaymentGatewayService paymentGatewayService;
    private final StripePaymentService stripePaymentService;
    private final AuditService auditService;

    // ----------------------------
    // MOCK PAYMENT (old flow)
    // ----------------------------
    public ApiResponse<Repayment> processRepayment(RepaymentRequest request, String userId) {
        double amount = request.getAmount() == null ? 0.0 : request.getAmount();

        String transactionId;
        try {
            transactionId = paymentGatewayService.processPayment(request.getLoanApplicationId(), amount);
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.REPAYMENT_FAILED, "Payment gateway error: " + e.getMessage());
        }

        return processRepaymentForLoan(request.getLoanApplicationId(), amount, transactionId, userId);
    }

    // ----------------------------
    // STRIPE OPTION A: Checkout + Confirm (NO WEBHOOK)
    // ----------------------------
    public StripeCheckoutSessionResponse createStripeCheckoutSession(StripeCheckoutSessionRequest request, String userId)
            throws com.stripe.exception.StripeException {

        LoanContext context = loadAuthorizedLoanContext(request.getLoanApplicationId(), userId);

        if (request.getAmount() == null || request.getAmount() <= 0) {
            throw new BusinessException(ErrorCode.INVALID_AMOUNT, "Amount must be positive");
        }

        com.stripe.model.checkout.Session session = stripePaymentService.createCheckoutSession(
                context.loan().getId(),
                request.getAmount(),
                userId,
                request.getSuccessUrl(),
                request.getCancelUrl()
        );

        // Save pending repayment attempt
        Repayment pending = Repayment.builder()
                .loanApplicationId(context.loan().getId())
                .amount(request.getAmount())
                .paymentDate(LocalDateTime.now())
                .transactionId(session.getId()) // sessionId
                .status(RepaymentStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        Repayment savedPending = repaymentRepository.save(pending);

        auditService.log(userId, "STRIPE_SESSION_CREATED", "REPAYMENT",
                savedPending.getId(), "Stripe checkout session created for amount " + request.getAmount());

        return new StripeCheckoutSessionResponse(session.getId(), session.getUrl());
    }

    public ApiResponse<Repayment> confirmStripeSession(String sessionId, String userId)
            throws com.stripe.exception.StripeException {

        if (sessionId == null || sessionId.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "sessionId is required");
        }

        // Idempotency: already SUCCESS
        Optional<Repayment> existing = repaymentRepository.findByTransactionId(sessionId);
        if (existing.isPresent() && existing.get().getStatus() == RepaymentStatus.SUCCESS) {
            return ApiResponse.success("Payment already processed", existing.get());
        }

        // ✅ Verify paid session from Stripe
        com.stripe.model.checkout.Session session = stripePaymentService.retrievePaidSessionOrThrow(sessionId);

        String loanApplicationId = session.getMetadata() == null ? null : session.getMetadata().get("loanApplicationId");
        String sessionUserId = session.getMetadata() == null ? null : session.getMetadata().get("userId");

        if (loanApplicationId == null || loanApplicationId.isBlank()) {
            throw new BusinessException(ErrorCode.REPAYMENT_FAILED, "Invalid Stripe session metadata: loanApplicationId missing");
        }

        if (sessionUserId != null && !sessionUserId.isBlank() && !sessionUserId.equals(userId)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED_ACCESS, "Session does not belong to current user");
        }

        double amount = session.getAmountTotal() == null ? 0.0 : session.getAmountTotal() / 100.0;
        if (amount <= 0) {
            throw new BusinessException(ErrorCode.INVALID_AMOUNT, "Stripe returned invalid amount");
        }

        ApiResponse<Repayment> response = processRepaymentForLoan(loanApplicationId, amount, sessionId, userId);

        if (response.getData() != null) {
            auditService.log(userId, "STRIPE_PAYMENT_CONFIRMED", "REPAYMENT",
                    response.getData().getId(), "Stripe payment confirmed for amount " + amount);
        }

        return response;
    }

    // ----------------------------
    // CORE REPAYMENT LOGIC
    // ----------------------------
    private ApiResponse<Repayment> processRepaymentForLoan(String loanApplicationId, Double amount, String transactionId, String userId) {
        LoanContext context = loadAuthorizedLoanContext(loanApplicationId, userId);

        if (amount == null || amount <= 0) {
            throw new BusinessException(ErrorCode.INVALID_AMOUNT, "Amount must be positive");
        }

        boolean willBePartial = isPartialPayment(context.schedule(), amount);

        Repayment repayment = repaymentRepository.findByTransactionId(transactionId).orElse(
                Repayment.builder()
                        .loanApplicationId(loanApplicationId)
                        .transactionId(transactionId)
                        .createdAt(LocalDateTime.now())
                        .build()
        );

        repayment.setAmount(amount);
        repayment.setPaymentDate(LocalDateTime.now());
        repayment.setStatus(willBePartial ? RepaymentStatus.PARTIAL : RepaymentStatus.SUCCESS);

        Repayment saved = repaymentRepository.save(repayment);

        updateEMISchedule(context.schedule(), context.loan(), amount);
        closeLoanIfFullyPaid(context.schedule(), context.loan(), userId);

        adjustCreditScore(context.customer(), 5);
        customerRepository.save(context.customer());

        auditService.log(userId, "REPAYMENT", "REPAYMENT", saved.getId(), "Repayment of " + amount);

        return ApiResponse.success("Payment processed successfully", saved);
    }

    private boolean isPartialPayment(EMISchedule schedule, double amount) {
        double pendingTotal = schedule.getInstallments().stream()
                .filter(i -> i.getStatus() != EMIStatus.PAID)
                .mapToDouble(i -> {
                    double paid = (i.getPaidAmount() == null) ? 0.0 : i.getPaidAmount();
                    return Math.max(0.0, i.getTotalAmount() - paid);
                })
                .sum();

        return amount < pendingTotal;
    }

    private LoanContext loadAuthorizedLoanContext(String loanApplicationId, String userId) {
        EMISchedule schedule = emiScheduleRepository.findByLoanApplicationId(loanApplicationId)
                .orElseThrow(() -> new BusinessException(ErrorCode.EMI_NOT_FOUND));

        LoanApplication loan = loanApplicationRepository.findById(loanApplicationId)
                .orElseThrow(() -> new BusinessException(ErrorCode.LOAN_NOT_FOUND));

        enrichLoanWithProductName(loan);

        Customer customer = customerRepository.findById(loan.getCustomerId())
                .orElseThrow(() -> new BusinessException(ErrorCode.CUSTOMER_NOT_FOUND));

        if (!userId.equals(customer.getUserId())) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED_ACCESS, "You are not allowed to repay this loan");
        }

        return new LoanContext(schedule, loan, customer);
    }

    /**
     * ✅ FIXED: null-safe paidAmount + correct pending math
     */
    private void updateEMISchedule(EMISchedule schedule, LoanApplication loan, Double amount) {
        double remainingAmount = amount == null ? 0.0 : amount;
        LocalDate paymentDate = LocalDate.now();
        boolean paidBeforeDueDate = false;

        for (EMIInstallment installment : schedule.getInstallments()) {
            if (remainingAmount <= 0) break;
            if (installment.getStatus() == EMIStatus.PAID) continue;

            double alreadyPaid = nvl(installment.getPaidAmount());
            double pending = installment.getTotalAmount() - alreadyPaid;

            if (pending <= 0) {
                installment.setPaidAmount(installment.getTotalAmount());
                installment.setStatus(EMIStatus.PAID);
                if (installment.getPaidDate() == null) installment.setPaidDate(paymentDate);
                continue;
            }

            if (remainingAmount >= pending) {
                installment.setPaidAmount(installment.getTotalAmount());
                installment.setStatus(EMIStatus.PAID);
                installment.setPaidDate(paymentDate);
                remainingAmount -= pending;
                if (installment.getDueDate() != null && paymentDate.isBefore(installment.getDueDate())) {
                    paidBeforeDueDate = true;
                }
            } else {
                installment.setPaidAmount(alreadyPaid + remainingAmount);
                installment.setStatus(EMIStatus.PARTIAL);
                if (installment.getDueDate() != null && paymentDate.isBefore(installment.getDueDate())) {
                    paidBeforeDueDate = true;
                }
                remainingAmount = 0;
            }
        }

        if (paidBeforeDueDate) {
            recastRemainingSchedule(schedule, loan, paymentDate);
        }

        schedule.setTotalInterest(round2(schedule.getInstallments().stream()
                .mapToDouble(i -> nvl(i.getInterestAmount()))
                .sum()));

        emiScheduleRepository.save(schedule);
        loanApplicationRepository.save(loan);
    }

    private void closeLoanIfFullyPaid(EMISchedule schedule, LoanApplication loan, String userId) {
        boolean allPaid = schedule.getInstallments().stream()
                .allMatch(i -> i.getStatus() == EMIStatus.PAID);
        if (!allPaid) return;
        if (loan.getStatus() == LoanStatus.CLOSED) return;

        loan.setStatus(LoanStatus.CLOSED);
        loan.setUpdatedAt(LocalDateTime.now());
        loanApplicationRepository.save(loan);
        auditService.log(userId, "LOAN_CLOSED", "LOAN_APPLICATION", loan.getId(),
                "Loan auto-closed after full repayment");
    }

    private void recastRemainingSchedule(EMISchedule schedule, LoanApplication loan, LocalDate paymentDate) {
        List<EMIInstallment> remainingInstallments = schedule.getInstallments().stream()
                .filter(i -> i.getStatus() != EMIStatus.PAID)
                .toList();

        if (remainingInstallments.isEmpty()) {
            loan.setEmi(0.0);
            return;
        }

        double outstandingPrincipal = round2(remainingInstallments.stream()
                .mapToDouble(this::pendingPrincipal)
                .sum());

        if (outstandingPrincipal <= 0) {
            loan.setEmi(0.0);
            return;
        }

        int remainingMonths = remainingInstallments.size();
        double annualRate = nvl(loan.getInterestRate());
        double monthlyRate = annualRate / (12 * 100.0);
        double emi = monthlyRate == 0.0
                ? round2(outstandingPrincipal / remainingMonths)
                : com.trumio.lms.util.EMICalculator.calculateEMI(outstandingPrincipal, annualRate, remainingMonths);

        double principalLeft = outstandingPrincipal;
        for (int i = 0; i < remainingMonths; i++) {
            EMIInstallment installment = remainingInstallments.get(i);
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
                    installment.getDueDate() != null && installment.getDueDate().isBefore(paymentDate)
                            ? EMIStatus.OVERDUE
                            : EMIStatus.PENDING
            );

            principalLeft = round2(principalLeft - principalAmount);
        }

        loan.setEmi(round2(remainingInstallments.get(0).getTotalAmount()));
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

    // ----------------------------
    // OTHER EXISTING METHODS
    // ----------------------------
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

    public void reconcileLoanClosure(String loanId, String userId) {
        LoanContext context = loadAuthorizedLoanContext(loanId, userId);
        closeLoanIfFullyPaid(context.schedule(), context.loan(), userId);
    }

    private void enrichLoanWithProductName(LoanApplication loan) {
        if (loan.getLoanProductName() == null || loan.getLoanProductName().isEmpty()) {
            try {
                loan.setLoanProductName(loanProductService.getById(loan.getLoanProductId()).getName());
            } catch (Exception e) {
                loan.setLoanProductName("Unknown Loan");
            }
        }
    }

    private record LoanContext(EMISchedule schedule, LoanApplication loan, Customer customer) {}
}
