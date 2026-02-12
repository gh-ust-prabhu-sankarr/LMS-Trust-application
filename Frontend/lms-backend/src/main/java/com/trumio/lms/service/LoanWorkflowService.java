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

    private static final double INITIAL_OFFICER_WALLET = 100_000_000.0;
    // Default wallet balance if officer wallet is null

    private final LoanApplicationRepository loanApplicationRepository;
    private final CustomerRepository customerRepository;
    private final UserRepository userRepository;
    private final EMIService emiService;
    private final AuditService auditService;

    // Move loan from SUBMITTED → UNDER_REVIEW
    public ApiResponse<LoanApplication> moveToReview(String loanId) {
        LoanApplication loan = getLoan(loanId); // Fetch loan from DB
        validateTransition(loan.getStatus(), LoanStatus.UNDER_REVIEW); // Validate state change

        loan.setStatus(LoanStatus.UNDER_REVIEW); // Update status
        loan.setUpdatedAt(LocalDateTime.now());

        LoanApplication saved = loanApplicationRepository.save(loan); // Save to DB

        auditService.log(getCurrentUserId(), "LOAN_UNDER_REVIEW", "LOAN_APPLICATION",
                loanId, "Loan moved to review"); // Store audit log

        return ApiResponse.success("Loan moved to review", saved);
    }

    // Approve loan and transfer money
    public ApiResponse<LoanApplication> approveLoan(String loanId, LoanApprovalRequest request) {

        LoanApplication loan = getLoan(loanId); // Fetch loan
        validateTransition(loan.getStatus(), LoanStatus.APPROVED); // Ensure valid transition

        String officerId = getCurrentUserId(); // Get logged-in officer
        User officer = userRepository.findById(officerId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        Customer customer = customerRepository.findById(loan.getCustomerId())
                .orElseThrow(() -> new BusinessException(ErrorCode.CUSTOMER_NOT_FOUND));

        double amount = request.getApprovedAmount() == null ? 0.0 : request.getApprovedAmount();

        // Get balances (set default if null)
        double officerBalance = officer.getWalletBalance() == null ?
                INITIAL_OFFICER_WALLET : officer.getWalletBalance();

        double customerBalance = customer.getWalletBalance() == null ?
                0.0 : customer.getWalletBalance();

        // Prevent approving if officer has insufficient funds
        if (officerBalance < amount) {
            throw new BusinessException(ErrorCode.INSUFFICIENT_WALLET_BALANCE,
                    "Officer wallet balance is insufficient");
        }

        // Transfer money: Officer → Customer
        officer.setWalletBalance(officerBalance - amount);
        customer.setWalletBalance(customerBalance + amount);

        userRepository.save(officer);      // Save updated officer wallet
        customerRepository.save(customer); // Save updated customer wallet

        // Update loan details
        loan.setStatus(LoanStatus.APPROVED);
        loan.setApprovedAmount(request.getApprovedAmount());
        loan.setApprovedAt(LocalDateTime.now());
        loan.setReviewedBy(officerId);
        loan.setUpdatedAt(LocalDateTime.now());

        LoanApplication saved = loanApplicationRepository.save(loan); // Save loan

        // Generate EMI schedule if not already created
        if (emiService.getScheduleByLoanId(saved.getId()).isEmpty()) {
            emiService.generateSchedule(saved);
        }

        auditService.log(getCurrentUserId(), "LOAN_APPROVED", "LOAN_APPLICATION",
                loanId, "Loan approved: " + request.getComments());

        return ApiResponse.success("Loan approved successfully", saved);
    }

    // Reject loan
    public ApiResponse<LoanApplication> rejectLoan(String loanId, String reason) {

        LoanApplication loan = getLoan(loanId); // Fetch loan
        validateTransition(loan.getStatus(), LoanStatus.REJECTED); // Validate transition

        loan.setStatus(LoanStatus.REJECTED);
        loan.setRejectionReason(reason);
        loan.setReviewedBy(getCurrentUserId());
        loan.setUpdatedAt(LocalDateTime.now());

        LoanApplication saved = loanApplicationRepository.save(loan); // Save

        auditService.log(getCurrentUserId(), "LOAN_REJECTED", "LOAN_APPLICATION",
                loanId, "Loan rejected: " + reason);

        return ApiResponse.success("Loan rejected", saved);
    }

    // Disburse loan (final stage before ACTIVE)
    public ApiResponse<LoanApplication> disburseLoan(String loanId) {

        LoanApplication loan = getLoan(loanId); // Fetch loan
        validateTransition(loan.getStatus(), LoanStatus.DISBURSED); // Validate transition

        loan.setStatus(LoanStatus.DISBURSED);
        loan.setDisbursedAt(LocalDateTime.now());
        loan.setUpdatedAt(LocalDateTime.now());

        LoanApplication saved = loanApplicationRepository.save(loan);

        emiService.generateSchedule(saved); // Generate EMI schedule

        // Move loan to ACTIVE state
        saved.setStatus(LoanStatus.ACTIVE);
        saved = loanApplicationRepository.save(saved);

        auditService.log(getCurrentUserId(), "LOAN_DISBURSED", "LOAN_APPLICATION",
                loanId, "Loan disbursed and activated");

        return ApiResponse.success("Loan disbursed successfully", saved);
    }

    // Validates allowed state transitions (Loan State Machine)
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
            throw new InvalidStateTransitionException(from, to); // Prevent illegal status change
        }
    }

    // Fetch loan safely
    private LoanApplication getLoan(String loanId) {
        return loanApplicationRepository.findById(loanId)
                .orElseThrow(() -> new BusinessException(ErrorCode.LOAN_NOT_FOUND));
    }

    // Get currently logged-in user ID using SecurityContext
    private String getCurrentUserId() {
        String username = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        return userRepository.findByUsername(username)
                .map(User::getId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }
}

