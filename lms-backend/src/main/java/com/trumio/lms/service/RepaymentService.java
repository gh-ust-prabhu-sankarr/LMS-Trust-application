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
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class RepaymentService {

    private final RepaymentRepository repaymentRepository;
    private final EMIScheduleRepository emiScheduleRepository;
    private final LoanApplicationRepository loanApplicationRepository;
    private final CustomerRepository customerRepository;
    private final LoanProductService loanProductService;
    private final PaymentGatewayService paymentGatewayService;
    private final StripePaymentService stripePaymentService;
    private final AuditService auditService;
    private static final Duration PENDING_TIMEOUT = Duration.ofMinutes(3);

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

        return processRepaymentForLoan(request.getLoanApplicationId(), amount, transactionId, userId, "INSTALLMENT", null);
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
                request.getCancelUrl(),
                request.getPaymentMode(),
                request.getInstallmentCount()
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

    @Transactional
    public synchronized ApiResponse<Repayment> confirmStripeSession(String sessionId, String userId)
            throws com.stripe.exception.StripeException {

        if (sessionId == null || sessionId.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "sessionId is required");
        }

        // Idempotency: already SUCCESS
        Optional<Repayment> existing = repaymentRepository.findByTransactionId(sessionId);
        if (existing.isPresent()) {
            Repayment current = existing.get();
            if (current.getStatus() == RepaymentStatus.SUCCESS) {
                return ApiResponse.success("Payment already processed", current);
            }
            if (current.getStatus() == RepaymentStatus.PARTIAL) {
                return ApiResponse.success("Payment already processed", current);
            }
            if (current.getStatus() == RepaymentStatus.FAILED) {
                return ApiResponse.success("Payment already marked as failed", current);
            }
            if (current.getStatus() == RepaymentStatus.PENDING && isPendingExpired(current)) {
                current.setStatus(RepaymentStatus.FAILED);
                Repayment failed = repaymentRepository.save(current);
                auditService.log(userId, "STRIPE_PAYMENT_FAILED", "REPAYMENT",
                        failed.getId(), "Pending Stripe payment auto-failed after 3 minutes");
                return ApiResponse.success("Payment marked as failed due to timeout", failed);
            }
        }

        // ✅ Verify paid session from Stripe
        com.stripe.model.checkout.Session session = stripePaymentService.retrievePaidSessionOrThrow(sessionId);

        String loanApplicationId = session.getMetadata() == null ? null : session.getMetadata().get("loanApplicationId");
        String sessionUserId = session.getMetadata() == null ? null : session.getMetadata().get("userId");
        String paymentMode = session.getMetadata() == null ? "INSTALLMENT" : session.getMetadata().get("paymentMode");
        Integer installmentLimit = null;
        if (session.getMetadata() != null) {
            String rawLimit = session.getMetadata().get("installmentCount");
            if (rawLimit != null && !rawLimit.isBlank()) {
                try {
                    installmentLimit = Integer.parseInt(rawLimit);
                } catch (NumberFormatException ignored) {
                    installmentLimit = null;
                }
            }
        }

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

        ApiResponse<Repayment> response = processRepaymentForLoan(
                loanApplicationId, amount, sessionId, userId, paymentMode, installmentLimit
        );

        if (response.getData() != null) {
            auditService.log(userId, "STRIPE_PAYMENT_CONFIRMED", "REPAYMENT",
                    response.getData().getId(), "Stripe payment confirmed for amount " + amount);
        }

        return response;
    }

    // ----------------------------
    // CORE REPAYMENT LOGIC
    // ----------------------------
    private ApiResponse<Repayment> processRepaymentForLoan(
            String loanApplicationId,
            Double amount,
            String transactionId,
            String userId,
            String paymentMode,
            Integer installmentLimit
    ) {
        LoanContext context = loadAuthorizedLoanContext(loanApplicationId, userId);

        if (amount == null || amount <= 0) {
            throw new BusinessException(ErrorCode.INVALID_AMOUNT, "Amount must be positive");
        }
        double pendingBeforePayment = calculatePendingAmount(context.schedule());
        if (pendingBeforePayment <= 0) {
            throw new BusinessException(ErrorCode.INVALID_STATE_TRANSITION, "Loan is already fully paid");
        }
        double appliedAmount = round2(Math.min(amount, pendingBeforePayment));

        boolean willBePartial = appliedAmount < pendingBeforePayment;

        Repayment repayment = repaymentRepository.findByTransactionId(transactionId).orElse(
                Repayment.builder()
                        .loanApplicationId(loanApplicationId)
                        .transactionId(transactionId)
                        .createdAt(LocalDateTime.now())
                        .build()
        );

        repayment.setAmount(appliedAmount);
        repayment.setPaymentDate(LocalDateTime.now());
        repayment.setStatus(willBePartial ? RepaymentStatus.PARTIAL : RepaymentStatus.SUCCESS);

        Repayment saved = repaymentRepository.save(repayment);

        updateEMISchedule(context.schedule(), context.loan(), appliedAmount, paymentMode, installmentLimit);
        closeLoanIfFullyPaid(context.schedule(), context.loan(), userId);

        adjustCreditScore(context.customer(), 5);
        customerRepository.save(context.customer());

        String details = appliedAmount < amount
                ? "Repayment of " + appliedAmount + " (requested " + amount + ", capped to outstanding)"
                : "Repayment of " + appliedAmount;
        auditService.log(userId, "REPAYMENT", "REPAYMENT", saved.getId(), details);

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
        LoanApplication loan = loanApplicationRepository.findById(loanApplicationId)
                .orElseThrow(() -> new BusinessException(ErrorCode.LOAN_NOT_FOUND));

        enrichLoanWithProductName(loan);
        LoanStatus status = loan.getStatus();
        if (status != LoanStatus.DISBURSED && status != LoanStatus.ACTIVE && status != LoanStatus.CLOSED) {
            throw new BusinessException(ErrorCode.INVALID_STATE_TRANSITION,
                    "EMI schedule is available only after loan disbursement");
        }

        EMISchedule schedule = emiScheduleRepository.findByLoanApplicationId(loanApplicationId)
                .orElseThrow(() -> new BusinessException(ErrorCode.EMI_NOT_FOUND));

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
    private void updateEMISchedule(
            EMISchedule schedule,
            LoanApplication loan,
            Double amount,
            String paymentMode,
            Integer installmentLimit
    ) {
        double remainingAmount = round2(amount == null ? 0.0 : amount);
        LocalDate paymentDate = LocalDate.now();
        boolean paidBeforeDueDate = false;
        boolean isCustomPayment = "CUSTOM".equalsIgnoreCase(String.valueOf(paymentMode));
        int normalizedInstallmentLimit = installmentLimit == null ? Integer.MAX_VALUE : Math.max(1, installmentLimit);
        int fullyPaidInstallmentsThisTxn = 0;
        double earlyInterestBenefit = 0.0;
        double firstPendingOutstanding = schedule.getInstallments().stream()
                .filter(i -> i.getStatus() != EMIStatus.PAID)
                .findFirst()
                .map(i -> round2(Math.max(0.0, nvl(i.getTotalAmount()) - nvl(i.getPaidAmount()))))
                .orElse(0.0);
        boolean advancePayment = remainingAmount > firstPendingOutstanding + 0.01;

        for (EMIInstallment installment : schedule.getInstallments()) {
            if (remainingAmount <= 0) break;
            if (installment.getStatus() == EMIStatus.PAID) continue;
            if (isCustomPayment && fullyPaidInstallmentsThisTxn >= normalizedInstallmentLimit) break;

            double installmentTotal = round2(nvl(installment.getTotalAmount()));
            double alreadyPaid = round2(nvl(installment.getPaidAmount()));
            double pending = round2(installmentTotal - alreadyPaid);

            if (pending <= 0) {
                installment.setPaidAmount(installmentTotal);
                installment.setStatus(EMIStatus.PAID);
                if (installment.getPaidDate() == null) installment.setPaidDate(paymentDate);
                continue;
            }

            if (remainingAmount + 0.0001 >= pending) {
                installment.setPaidAmount(installmentTotal);
                installment.setStatus(EMIStatus.PAID);
                installment.setPaidDate(paymentDate);
                fullyPaidInstallmentsThisTxn++;
                if (isCustomPayment && installment.getDueDate() != null && installment.getDueDate().isAfter(paymentDate)) {
                    earlyInterestBenefit = round2(earlyInterestBenefit + nvl(installment.getInterestAmount()));
                }
                remainingAmount = round2(remainingAmount - pending);
                if (remainingAmount < 0.01) remainingAmount = 0.0;
                if (installment.getDueDate() != null && paymentDate.isBefore(installment.getDueDate())) {
                    paidBeforeDueDate = true;
                }
            } else {
                double newPaidAmount = round2(alreadyPaid + remainingAmount);
                installment.setPaidAmount(newPaidAmount);
                boolean fullyPaidNow = newPaidAmount + 0.0001 >= installmentTotal;
                installment.setStatus(fullyPaidNow ? EMIStatus.PAID : EMIStatus.PARTIAL);
                if (fullyPaidNow) {
                    installment.setPaidDate(paymentDate);
                    fullyPaidInstallmentsThisTxn++;
                    if (isCustomPayment && installment.getDueDate() != null && installment.getDueDate().isAfter(paymentDate)) {
                        earlyInterestBenefit = round2(earlyInterestBenefit + nvl(installment.getInterestAmount()));
                    }
                }
                if (installment.getDueDate() != null && paymentDate.isBefore(installment.getDueDate())) {
                    paidBeforeDueDate = true;
                }
                remainingAmount = 0;
            }
        }

        boolean customMultiMonthPayment = isCustomPayment && fullyPaidInstallmentsThisTxn >= 2;
        if (paidBeforeDueDate || advancePayment || customMultiMonthPayment) {
            recastRemainingSchedule(schedule, loan, paymentDate, isCustomPayment ? earlyInterestBenefit : 0.0);
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

    private void recastRemainingSchedule(EMISchedule schedule, LoanApplication loan, LocalDate paymentDate, double extraPrincipalReduction) {
        List<EMIInstallment> remainingInstallments = schedule.getInstallments().stream()
                .filter(i -> i.getStatus() != EMIStatus.PAID)
                .toList();

        if (remainingInstallments.isEmpty()) {
            loan.setEmi(0.0);
            return;
        }

        // Recast from remaining principal (not total unpaid EMI), so EMI reduces correctly after prepayment.
        double outstandingPrincipal = round2(remainingInstallments.stream()
                .mapToDouble(this::pendingPrincipal)
                .sum());
        outstandingPrincipal = round2(Math.max(0.0, outstandingPrincipal - round2(extraPrincipalReduction)));

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
        expireStalePendingRepaymentsByLoan(loanId, null);
        return repaymentRepository.findByLoanApplicationId(loanId);
    }

    @Scheduled(fixedDelayString = "${app.repayment.pending-timeout-scan-ms:60000}")
    public void expireStalePendingRepaymentsScheduler() {
        expireStalePendingRepaymentsByLoan(null, "system");
    }

    private void expireStalePendingRepaymentsByLoan(String loanId, String actor) {
        List<Repayment> source = loanId == null
                ? repaymentRepository.findByStatus(RepaymentStatus.PENDING)
                : repaymentRepository.findByLoanApplicationId(loanId);

        List<Repayment> toFail = new ArrayList<>();
        for (Repayment repayment : source) {
            if (repayment.getStatus() != RepaymentStatus.PENDING) continue;
            if (!isPendingExpired(repayment)) continue;
            repayment.setStatus(RepaymentStatus.FAILED);
            toFail.add(repayment);
        }

        if (toFail.isEmpty()) return;
        repaymentRepository.saveAll(toFail);
        for (Repayment failed : toFail) {
            auditService.log(actor == null ? "system" : actor, "PAYMENT_AUTO_FAILED", "REPAYMENT",
                    failed.getId(), "Pending payment marked FAILED after 3 minutes");
        }
        log.info("Auto-failed {} stale pending repayments", toFail.size());
    }

    private boolean isPendingExpired(Repayment repayment) {
        LocalDateTime baseTime = repayment.getCreatedAt() != null ? repayment.getCreatedAt() : repayment.getPaymentDate();
        if (baseTime == null) return false;
        return baseTime.plus(PENDING_TIMEOUT).isBefore(LocalDateTime.now());
    }

    private double calculatePendingAmount(EMISchedule schedule) {
        return round2(schedule.getInstallments().stream()
                .filter(i -> i.getStatus() != EMIStatus.PAID)
                .mapToDouble(i -> Math.max(0.0, nvl(i.getTotalAmount()) - nvl(i.getPaidAmount())))
                .sum());
    }

    private double pendingPrincipal(EMIInstallment installment) {
        double principal = round2(nvl(installment.getPrincipalAmount()));
        double interest = round2(nvl(installment.getInterestAmount()));
        double paid = round2(nvl(installment.getPaidAmount()));

        double interestPaid = Math.min(interest, paid);
        double principalPaid = Math.max(0.0, paid - interestPaid);
        principalPaid = Math.min(principal, principalPaid);

        return round2(Math.max(0.0, principal - principalPaid));
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
