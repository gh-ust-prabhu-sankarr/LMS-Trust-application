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
import com.trumio.lms.dto.LoanApprovalRequest;
import com.trumio.lms.entity.Customer;
import com.trumio.lms.entity.LoanApplication;
import com.trumio.lms.entity.User;
import com.trumio.lms.entity.enums.LoanStatus;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;
import com.trumio.lms.exception.InvalidStateTransitionException;
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
                loan, saved, loanId, "Loan moved to review");

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

        if (emiService.getScheduleByLoanId(saved.getId()).isEmpty()) {
            emiService.generateSchedule(saved);
        }
        auditService.log(getCurrentUserId(), "LOAN_APPROVED", "LOAN_APPLICATION",
                request, saved, loanId, "Loan approved: " + request.getComments());

        return ApiResponse.success("Loan approved successfully", saved);
    }

    public ApiResponse<LoanApplication> rejectLoan(String loanId, String reason) {
        LoanApplication loan = getLoan(loanId);
        validateTransition(loan.getStatus(), LoanStatus.REJECTED);

        loan.setStatus(LoanStatus.REJECTED);
        loan.setRejectionReason(reason);
        loan.setReviewedBy(getCurrentUserId());
        loan.setUpdatedAt(LocalDateTime.now());

        LoanApplication saved = loanApplicationRepository.save(loan);
        auditService.log(getCurrentUserId(), "LOAN_REJECTED", "LOAN_APPLICATION",
                reason, saved, loanId, "Loan rejected: " + reason);

        return ApiResponse.success("Loan rejected", saved);
    }

    public ApiResponse<LoanApplication> disburseLoan(String loanId) {
        LoanApplication loan = getLoan(loanId);
        validateTransition(loan.getStatus(), LoanStatus.DISBURSED);

        loan.setStatus(LoanStatus.DISBURSED);
        loan.setDisbursedAt(LocalDateTime.now());
        loan.setUpdatedAt(LocalDateTime.now());

        LoanApplication saved = loanApplicationRepository.save(loan);

        // Generate EMI schedule
        emiService.generateSchedule(saved);

        // Move to ACTIVE
        saved.setStatus(LoanStatus.ACTIVE);
        saved = loanApplicationRepository.save(saved);

        auditService.log(getCurrentUserId(), "LOAN_DISBURSED", "LOAN_APPLICATION",
                loan, saved, loanId, "Loan disbursed and activated");

        return ApiResponse.success("Loan disbursed successfully", saved);
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
