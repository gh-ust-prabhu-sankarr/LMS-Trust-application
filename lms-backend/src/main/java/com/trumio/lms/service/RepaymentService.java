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

        updateEMISchedule(context.schedule(), amount);

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
    private void updateEMISchedule(EMISchedule schedule, Double amount) {
        double remainingAmount = amount;

        for (EMIInstallment installment : schedule.getInstallments()) {
            if (remainingAmount <= 0) break;
            if (installment.getStatus() == EMIStatus.PAID) continue;

            double alreadyPaid = installment.getPaidAmount() == null ? 0.0 : installment.getPaidAmount();
            double pending = installment.getTotalAmount() - alreadyPaid;

            if (pending <= 0) {
                installment.setPaidAmount(installment.getTotalAmount());
                installment.setStatus(EMIStatus.PAID);
                if (installment.getPaidDate() == null) installment.setPaidDate(LocalDate.now());
                continue;
            }

            if (remainingAmount >= pending) {
                installment.setPaidAmount(installment.getTotalAmount());
                installment.setStatus(EMIStatus.PAID);
                installment.setPaidDate(LocalDate.now());
                remainingAmount -= pending;
            } else {
                installment.setPaidAmount(alreadyPaid + remainingAmount);
                installment.setStatus(EMIStatus.PARTIAL);
                remainingAmount = 0;
            }
        }

        emiScheduleRepository.save(schedule);
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
