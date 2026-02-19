package com.trumio.lms.service;



//import com.loanapp.dto.ApiResponse;
//import com.loanapp.dto.LoanApprovalRequest;
//import com.loanapp.entity.LoanApplication;
//import com.loanapp.entity.User;
//import com.loanapp.entity.enums.LoanStatus;
//import com.loanapp.exception.BusinessException;
//import com.loanapp.exception.ErrorCode;
//import com.loanapp.exception.InvalidStateTransitionException;
//import com.loanapp.repository.LoanApplicationRepository;
//import com.loanapp.repository.UserRepository;
import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.dto.BankDetailsVerificationRequest;
import com.trumio.lms.dto.LoanApprovalRequest;
import com.trumio.lms.entity.Customer;
import com.trumio.lms.entity.Kyc;
import com.trumio.lms.entity.LoanApplication;
import com.trumio.lms.entity.User;
import com.trumio.lms.entity.enums.KYCStatus;
import com.trumio.lms.entity.enums.LoanStatus;
import com.trumio.lms.entity.enums.BankDetailsStatus;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;
import com.trumio.lms.exception.InvalidStateTransitionException;
import com.trumio.lms.repository.KycRepository;
import com.trumio.lms.repository.LoanApplicationRepository;
import com.trumio.lms.repository.CustomerRepository;
import com.trumio.lms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class LoanWorkflowService {
    private final LoanApplicationRepository loanApplicationRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final KycRepository kycRepository;
    private final LoanProductService loanProductService;
    private final EMIService emiService;
    private final AuditService auditService;

    public ApiResponse<LoanApplication> moveToReview(String loanId) {
        LoanApplication loan = getLoan(loanId);
        validateTransition(loan.getStatus(), LoanStatus.UNDER_REVIEW);

        loan.setStatus(LoanStatus.UNDER_REVIEW);
        loan.setUpdatedAt(LocalDateTime.now());

        LoanApplication saved = loanApplicationRepository.save(loan);
        auditService.log(getCurrentUserId(), "LOAN_UNDER_REVIEW", "LOAN_APPLICATION",
                loanId, "Loan moved to review");

        return ApiResponse.success("Loan moved to review", saved);
    }

    public ApiResponse<LoanApplication> approveLoan(String loanId, LoanApprovalRequest request) {
        LoanApplication loan = getLoan(loanId);
        validateTransition(loan.getStatus(), LoanStatus.APPROVED);

        String officerId = getCurrentUserId();
        User officer = userRepository.findById(officerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        Customer customer = customerRepository.findById(loan.getCustomerId())
                .orElseThrow(() -> new BusinessException(ErrorCode.CUSTOMER_NOT_FOUND));

        double amount = request.getApprovedAmount() == null ? 0.0 : request.getApprovedAmount();

        loan.setStatus(LoanStatus.APPROVED);
        loan.setApprovedAmount(request.getApprovedAmount());
        loan.setApprovedAt(LocalDateTime.now());
        loan.setReviewedBy(officerId);
        loan.setUpdatedAt(LocalDateTime.now());

        LoanApplication saved = loanApplicationRepository.save(loan);

        auditService.log(getCurrentUserId(), "LOAN_APPROVED", "LOAN_APPLICATION",
                loanId, "Loan approved: " + request.getComments());

        return ApiResponse.success("Loan approved successfully", saved);
    }

    public ApiResponse<LoanApplication> rejectLoan(String loanId, String reason) {
        LoanApplication loan = getLoan(loanId);
        validateTransition(loan.getStatus(), LoanStatus.REJECTED);
        String officerId = getCurrentUserId();
        LocalDateTime now = LocalDateTime.now();

        loan.setStatus(LoanStatus.REJECTED);
        loan.setRejectionReason(reason);
        loan.setReviewedBy(officerId);
        loan.setUpdatedAt(now);

        LoanApplication saved = loanApplicationRepository.save(loan);
        markBorrowerKycRejected(saved, officerId, now, reason);

        auditService.log(officerId, "LOAN_REJECTED", "LOAN_APPLICATION",
                loanId, "Loan rejected: " + reason);

        return ApiResponse.success("Loan rejected", saved);
    }

    private void markBorrowerKycRejected(LoanApplication loan, String officerId, LocalDateTime now, String reason) {
        customerRepository.findById(loan.getCustomerId()).ifPresent(customer -> {
            String userId = customer.getUserId();
            if (userId == null || userId.isBlank()) return;

            kycRepository.findByUserId(userId).ifPresent(kyc -> {
                kyc.setStatus(KYCStatus.REJECTED);
                kyc.setRemarks("Rejected during loan review: " + reason);
                kyc.setReviewedBy(officerId);
                kyc.setReviewedAt(now);
                kyc.setUpdatedAt(now);

                Kyc savedKyc = kycRepository.save(kyc);

                userRepository.findById(userId).ifPresent(user -> {
                    user.setKycStatus(KYCStatus.REJECTED);
                    user.setUpdatedAt(now);
                    userRepository.save(user);
                });

                customer.setKycStatus(KYCStatus.REJECTED);
                customer.setUpdatedAt(now);
                customerRepository.save(customer);

                auditService.log(officerId, "KYC_REJECTED", "KYC", savedKyc.getId(),
                        "KYC rejected along with loan rejection");
            });
        });
    }

    public ApiResponse<LoanApplication> disburseLoan(String loanId) {
        LoanApplication loan = getLoan(loanId);
        validateTransition(loan.getStatus(), LoanStatus.DISBURSED);
        if (!Boolean.TRUE.equals(loan.getAgreementAccepted())) {
            throw new BusinessException(ErrorCode.INVALID_STATE_TRANSITION,
                    "Loan agreement must be accepted before disbursement");
        }
        if (loan.getBankDetailsStatus() != BankDetailsStatus.APPROVED) {
            throw new BusinessException(ErrorCode.INVALID_STATE_TRANSITION,
                    "Bank details must be approved by admin before disbursement");
        }

        loan.setStatus(LoanStatus.DISBURSED);
        loan.setDisbursedAt(LocalDateTime.now());
        loan.setUpdatedAt(LocalDateTime.now());

        LoanApplication saved = loanApplicationRepository.save(loan);

        // Generate EMI schedule
        if (emiService.getScheduleByLoanId(saved.getId()).isEmpty()) {
            emiService.generateSchedule(saved);
        }

        // Move to ACTIVE
        saved.setStatus(LoanStatus.ACTIVE);
        saved = loanApplicationRepository.save(saved);

        auditService.log(getCurrentUserId(), "LOAN_DISBURSED", "LOAN_APPLICATION",
                loanId, "Loan disbursed and activated");

        return ApiResponse.success("Loan disbursed successfully", saved);
    }

    public ApiResponse<LoanApplication> verifyBankDetails(String loanId, BankDetailsVerificationRequest request) {
        LoanApplication loan = getLoan(loanId);
        if (loan.getStatus() != LoanStatus.APPROVED) {
            throw new BusinessException(ErrorCode.INVALID_STATE_TRANSITION,
                    "Bank details can be verified only for approved loans");
        }
        if (loan.getBankDetailsStatus() != BankDetailsStatus.PENDING
                && loan.getBankDetailsStatus() != BankDetailsStatus.REJECTED) {
            throw new BusinessException(ErrorCode.INVALID_STATE_TRANSITION,
                    "Bank details are not pending for verification");
        }

        String status = String.valueOf(request.getStatus()).trim().toUpperCase();
        if (!"APPROVED".equals(status) && !"REJECTED".equals(status)) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "Status must be APPROVED or REJECTED");
        }
        if ("REJECTED".equals(status) && (request.getReason() == null || request.getReason().trim().isBlank())) {
            throw new BusinessException(ErrorCode.VALIDATION_ERROR,
                    "Rejection reason is required");
        }

        String adminId = getCurrentUserId();
        LocalDateTime now = LocalDateTime.now();
        loan.setBankDetailsStatus("APPROVED".equals(status) ? BankDetailsStatus.APPROVED : BankDetailsStatus.REJECTED);
        loan.setBankDetailsReviewedAt(now);
        loan.setBankDetailsReviewedBy(adminId);
        loan.setBankDetailsRejectionReason("REJECTED".equals(status) ? request.getReason().trim() : null);
        loan.setUpdatedAt(now);

        LoanApplication saved = loanApplicationRepository.save(loan);
        auditService.log(adminId, "BANK_DETAILS_" + status, "LOAN_APPLICATION",
                loanId, "Bank details " + status.toLowerCase());
        return ApiResponse.success("Bank details " + status.toLowerCase() + " successfully", saved);
    }

    private void validateTransition(LoanStatus from, LoanStatus to) {
        boolean valid = switch (from) {
            case DRAFT -> to == LoanStatus.SUBMITTED;
            case SUBMITTED -> to == LoanStatus.UNDER_REVIEW;
            case UNDER_REVIEW -> to == LoanStatus.APPROVED || to == LoanStatus.REJECTED;
            case APPROVED -> to == LoanStatus.DISBURSED;
            case DISBURSED -> to == LoanStatus.ACTIVE;
            case ACTIVE -> to == LoanStatus.CLOSED || to == LoanStatus.DEFAULTED;
            default -> false;
        };

        if (!valid) {
            throw new InvalidStateTransitionException(from, to);
        }
    }

    private LoanApplication getLoan(String loanId) {
        LoanApplication loan = loanApplicationRepository.findById(loanId)
                .orElseThrow(() -> new BusinessException(ErrorCode.LOAN_NOT_FOUND));
        enrichLoanWithProductName(loan);
        return loan;
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

    private String getCurrentUserId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .map(User::getId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }
}
