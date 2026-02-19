package com.trumio.lms.service;

import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.dto.LoanBankDetailsRequest;
import com.trumio.lms.dto.LoanApplicationRequest;
import com.trumio.lms.entity.Customer;
import com.trumio.lms.entity.EMISchedule;
import com.trumio.lms.entity.LoanApplication;
import com.trumio.lms.entity.LoanProduct;
import com.trumio.lms.entity.User;
import com.trumio.lms.entity.enums.EMIStatus;
import com.trumio.lms.entity.enums.KYCStatus;
import com.trumio.lms.entity.enums.LoanStatus;
import com.trumio.lms.entity.enums.BankDetailsStatus;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;
import com.trumio.lms.repository.LoanApplicationRepository;
import com.trumio.lms.repository.CustomerRepository;
import com.trumio.lms.repository.EMIScheduleRepository;
import com.trumio.lms.repository.UserRepository;
import com.trumio.lms.util.EMICalculator;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class LoanApplicationService {

    private final LoanApplicationRepository loanApplicationRepository;
    private final CustomerService customerService;
    private final LoanProductService loanProductService;
    private final CustomerRepository customerRepository;
    private final EMIScheduleRepository emiScheduleRepository;
    private final UserRepository userRepository;
    private final AuditService auditService;

    public ApiResponse<LoanApplication> createApplication(LoanApplicationRequest request) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // Block loan creation unless user KYC is approved
        if (user.getKycStatus() != KYCStatus.APPROVED) {
            throw new BusinessException(ErrorCode.KYC_NOT_VERIFIED);
        }

        Customer customer = customerService.getCurrentCustomer();
        if (customer.getCreditScore() == null) {
            customer.setCreditScore(650 + new java.util.Random().nextInt(151));
            customerRepository.save(customer);
        }

        LoanProduct product = loanProductService.getById(request.getLoanProductId());
        loanProductService.validateProduct(product);

        // Validate amount
        if (request.getRequestedAmount() < product.getMinAmount() ||
                request.getRequestedAmount() > product.getMaxAmount()) {
            throw new BusinessException(ErrorCode.INVALID_LOAN_AMOUNT);
        }

        // Validate tenure
        if (request.getTenure() < product.getMinTenure() ||
                request.getTenure() > product.getMaxTenure()) {
            throw new BusinessException(ErrorCode.INVALID_TENURE);
        }

        // Validate credit score
        if (customer.getCreditScore() < product.getMinCreditScore()) {
            throw new BusinessException(ErrorCode.INSUFFICIENT_CREDIT_SCORE);
        }

        double fixedInterestRate = determineInterestRateByCreditScore(
                customer.getCreditScore(),
                product.getInterestRate()
        );

        // Allow re-apply only after previous same-product loan is completed/closed.
        // Block if there is any in-flight or active application for the same product.
        Set<LoanStatus> blockingStatuses = Set.of(
                LoanStatus.DRAFT,
                LoanStatus.SUBMITTED,
                LoanStatus.UNDER_REVIEW,
                LoanStatus.APPROVED,
                LoanStatus.DISBURSED,
                LoanStatus.ACTIVE
        );
        List<LoanApplication> existingSameProduct = loanApplicationRepository
                .findByCustomerIdAndLoanProductIdAndStatusIn(customer.getId(), product.getId(), blockingStatuses);
        boolean hasBlockingLoan = existingSameProduct.stream()
                .anyMatch(this::isStillBlockingAfterRepaymentCheck);
        if (hasBlockingLoan) {
            throw new BusinessException(ErrorCode.LOAN_ALREADY_EXISTS,
                    "You already have an active application/loan for this loan type.");
        }

        // Calculate EMI
        double emi = EMICalculator.calculateEMI(
                request.getRequestedAmount(),
                fixedInterestRate,
                request.getTenure()
        );

        if (customer.getMonthlyIncome() == null || customer.getMonthlyIncome() <= 0) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Monthly income must be available to apply for loan");
        }

        double maxAllowedEmi = customer.getMonthlyIncome() * 0.4;
        if (emi > maxAllowedEmi) {
            throw new BusinessException(
                    ErrorCode.EMI_EXCEEDS_INCOME_LIMIT,
                    String.format(
                            "Application rejected: EMI %.2f exceeds 40%% of monthly income %.2f",
                            emi,
                            customer.getMonthlyIncome()
                    )
            );
        }

        LoanApplication application = LoanApplication.builder()
                .customerId(customer.getId())
                .loanProductId(product.getId())
                .loanProductName(product.getName())
                .requestedAmount(request.getRequestedAmount())
                .tenure(request.getTenure())
                .interestRate(fixedInterestRate)
                .emi(emi)
                .status(LoanStatus.DRAFT)
                .agreementAccepted(false)
                .bankDetailsStatus(BankDetailsStatus.NOT_SUBMITTED)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        LoanApplication saved = loanApplicationRepository.save(application);

        auditService.log(
                customer.getUserId(),
                "LOAN_CREATED",
                "LOAN_APPLICATION",
                saved.getId(),
                "Loan application created"
        );

        return ApiResponse.success("Application created successfully", saved);
    }

    public ApiResponse<LoanApplication> submitApplication(String loanId) {
        Customer customer = customerService.getCurrentCustomer();
        LoanApplication loan = getLoanById(loanId);

        if (!loan.getCustomerId().equals(customer.getId())) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED_ACCESS);
        }

        if (loan.getStatus() != LoanStatus.DRAFT) {
            throw new BusinessException(ErrorCode.INVALID_STATE_TRANSITION);
        }

        loan.setStatus(LoanStatus.SUBMITTED);
        loan.setSubmittedAt(LocalDateTime.now());
        loan.setUpdatedAt(LocalDateTime.now());

        LoanApplication saved = loanApplicationRepository.save(loan);

        auditService.log(
                customer.getUserId(),
                "LOAN_SUBMITTED",
                "LOAN_APPLICATION",
                saved.getId(),
                "Loan application submitted"
        );

        return ApiResponse.success("Application submitted successfully", saved);
    }

    public List<LoanApplication> getCustomerLoans(String customerId) {
        List<LoanApplication> loans = loanApplicationRepository.findByCustomerId(customerId);
        return enrichLoansWithProductNames(loans);
    }

    public List<LoanApplication> getMyLoans() {
        Customer customer = customerService.getCurrentCustomer();
        return getCustomerLoans(customer.getId());
    }

    public LoanApplication getLoanById(String loanId) {
        LoanApplication loan = loanApplicationRepository.findById(loanId)
                .orElseThrow(() -> new BusinessException(ErrorCode.LOAN_NOT_FOUND));
        enrichLoanWithProductName(loan);
        return loan;
    }

    public List<LoanApplication> getLoansByStatus(LoanStatus status) {
        List<LoanApplication> loans = loanApplicationRepository.findByStatus(status);
        return enrichLoansWithProductNames(loans);
    }

    public ApiResponse<LoanApplication> acceptLoanAgreement(String loanId, String acceptedName) {
        Customer customer = customerService.getCurrentCustomer();
        LoanApplication loan = getLoanById(loanId);

        if (!loan.getCustomerId().equals(customer.getId())) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED_ACCESS);
        }

        if (loan.getStatus() != LoanStatus.APPROVED) {
            throw new BusinessException(ErrorCode.INVALID_STATE_TRANSITION,
                    "Agreement can only be accepted after loan is approved");
        }
        if (loan.getApprovedAt() == null) {
            throw new BusinessException(ErrorCode.INVALID_STATE_TRANSITION,
                    "Agreement is not generated yet");
        }

        String signer = acceptedName == null ? "" : acceptedName.trim();
        if (signer.isBlank()) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR, "Accepted name is required");
        }

        if (Boolean.TRUE.equals(loan.getAgreementAccepted())) {
            return ApiResponse.success("Agreement already accepted", loan);
        }

        loan.setAgreementAccepted(true);
        loan.setAgreementAcceptedName(signer);
        loan.setAgreementAcceptedAt(LocalDateTime.now());
        loan.setUpdatedAt(LocalDateTime.now());

        LoanApplication saved = loanApplicationRepository.save(loan);
        auditService.log(customer.getUserId(), "LOAN_AGREEMENT_ACCEPTED", "LOAN_APPLICATION",
                saved.getId(), "Agreement accepted by: " + signer);

        return ApiResponse.success("Loan agreement accepted successfully", saved);
    }

    public ApiResponse<LoanApplication> submitBankDetails(String loanId, LoanBankDetailsRequest request) {
        Customer customer = customerService.getCurrentCustomer();
        LoanApplication loan = getLoanById(loanId);

        if (!loan.getCustomerId().equals(customer.getId())) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED_ACCESS);
        }
        if (loan.getStatus() != LoanStatus.APPROVED) {
            throw new BusinessException(ErrorCode.INVALID_STATE_TRANSITION,
                    "Bank details can be submitted only for approved loans");
        }
        if (!Boolean.TRUE.equals(loan.getAgreementAccepted())) {
            throw new BusinessException(ErrorCode.INVALID_STATE_TRANSITION,
                    "Please accept the loan agreement before submitting bank details");
        }

        LocalDateTime now = LocalDateTime.now();
        loan.setBankAccountHolderName(request.getAccountHolderName().trim());
        loan.setBankName(request.getBankName().trim());
        loan.setBankAccountNumber(request.getAccountNumber().trim());
        loan.setBankIfscCode(request.getIfscCode().trim().toUpperCase());
        loan.setBankBranchName(request.getBranchName().trim());
        loan.setBankDetailsStatus(BankDetailsStatus.PENDING);
        loan.setBankDetailsSubmittedAt(now);
        loan.setBankDetailsReviewedAt(null);
        loan.setBankDetailsReviewedBy(null);
        loan.setBankDetailsRejectionReason(null);
        loan.setUpdatedAt(now);

        LoanApplication saved = loanApplicationRepository.save(loan);
        auditService.log(customer.getUserId(), "BANK_DETAILS_SUBMITTED", "LOAN_APPLICATION",
                saved.getId(), "Customer submitted loan disbursement bank details");
        return ApiResponse.success("Bank details submitted successfully", saved);
    }

    private List<LoanApplication> enrichLoansWithProductNames(List<LoanApplication> loans) {
        for (LoanApplication loan : loans) {
            enrichLoanWithProductName(loan);
        }
        return loans;
    }

    private void enrichLoanWithProductName(LoanApplication loan) {
        if (loan.getLoanProductName() == null || loan.getLoanProductName().isEmpty()) {
            try {
                LoanProduct product = loanProductService.getById(loan.getLoanProductId());
                loan.setLoanProductName(product.getName());
            } catch (Exception e) {
                // If product not found, keep unknown or set default
                if (loan.getLoanProductName() == null) {
                    loan.setLoanProductName("Unknown Loan");
                }
            }
        }
    }

    private double determineInterestRateByCreditScore(Integer creditScore, Double baseRate) {
        double adjustedRate = baseRate;

        if (creditScore >= 800) {
            adjustedRate = baseRate - 1.5;
        } else if (creditScore >= 750) {
            adjustedRate = baseRate - 1.0;
        } else if (creditScore >= 700) {
            adjustedRate = baseRate - 0.5;
        } else if (creditScore >= 650) {
            adjustedRate = baseRate;
        } else if (creditScore >= 600) {
            adjustedRate = baseRate + 1.0;
        } else {
            adjustedRate = baseRate + 2.0;
        }

        return Math.round(adjustedRate * 100.0) / 100.0;
    }

    private boolean isStillBlockingAfterRepaymentCheck(LoanApplication loan) {
        LoanStatus status = loan.getStatus();
        if (status == null) {
            return true;
        }

        if (status != LoanStatus.APPROVED && status != LoanStatus.DISBURSED && status != LoanStatus.ACTIVE) {
            return true;
        }

        EMISchedule schedule = emiScheduleRepository.findByLoanApplicationId(loan.getId()).orElse(null);
        if (schedule == null || schedule.getInstallments() == null || schedule.getInstallments().isEmpty()) {
            return true;
        }

        boolean allPaid = schedule.getInstallments().stream()
                .allMatch(i -> i.getStatus() == EMIStatus.PAID);
        if (!allPaid) {
            return true;
        }

        loan.setStatus(LoanStatus.CLOSED);
        loan.setUpdatedAt(LocalDateTime.now());
        loanApplicationRepository.save(loan);
        return false;
    }
}
