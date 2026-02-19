package com.trumio.lms.controller;


import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.dto.BankDetailsVerificationRequest;
import com.trumio.lms.dto.LoanApplicationRequest;
import com.trumio.lms.dto.LoanAgreementAcceptRequest;
import com.trumio.lms.dto.LoanBankDetailsRequest;
import com.trumio.lms.dto.LoanApprovalRequest;
import com.trumio.lms.entity.LoanApplication;
import com.trumio.lms.entity.enums.LoanStatus;
import com.trumio.lms.idempotency.Idempotent;
import com.trumio.lms.service.LoanApplicationService;
import com.trumio.lms.service.LoanWorkflowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/loans")
@RequiredArgsConstructor
public class LoanApplicationController {

    private final LoanApplicationService loanApplicationService;
    private final LoanWorkflowService loanWorkflowService;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    @Idempotent(entityType = "LoanApplication")
    public ResponseEntity<ApiResponse<LoanApplication>> createApplication(
            @Valid @RequestBody LoanApplicationRequest request) {
        return ResponseEntity.ok(loanApplicationService.createApplication(request));
    }

    @PostMapping("/{loanId}/submit")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Idempotent(entityType = "LoanApplication")
    public ResponseEntity<ApiResponse<LoanApplication>> submitApplication(@PathVariable String loanId) {
        return ResponseEntity.ok(loanApplicationService.submitApplication(loanId));
    }

    @PostMapping("/{loanId}/agreement/accept")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<LoanApplication>> acceptLoanAgreement(
            @PathVariable String loanId,
            @Valid @RequestBody LoanAgreementAcceptRequest request) {
        return ResponseEntity.ok(loanApplicationService.acceptLoanAgreement(loanId, request.getAcceptedName()));
    }

    @PostMapping("/{loanId}/bank-details")
    @PreAuthorize("hasRole('CUSTOMER')")
    @Idempotent(entityType = "LoanApplication")
    public ResponseEntity<ApiResponse<LoanApplication>> submitBankDetails(
            @PathVariable String loanId,
            @Valid @RequestBody LoanBankDetailsRequest request) {
        return ResponseEntity.ok(loanApplicationService.submitBankDetails(loanId, request));
    }

    @GetMapping("/my-loans")
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<List<LoanApplication>> getMyLoans() {
        return ResponseEntity.ok(loanApplicationService.getMyLoans());
    }

    @GetMapping("/{loanId}")
    public ResponseEntity<LoanApplication> getLoanById(@PathVariable String loanId) {
        return ResponseEntity.ok(loanApplicationService.getLoanById(loanId));
    }

    @GetMapping("/status/{status}")
    @PreAuthorize("hasAnyRole('CREDIT_OFFICER', 'ADMIN')")
    public ResponseEntity<List<LoanApplication>> getLoansByStatus(@PathVariable LoanStatus status) {
        return ResponseEntity.ok(loanApplicationService.getLoansByStatus(status));
    }

    @PostMapping("/{loanId}/review")
    @PreAuthorize("hasAnyRole('CREDIT_OFFICER', 'ADMIN')")
    @Idempotent(entityType = "LoanApplication")
    public ResponseEntity<ApiResponse<LoanApplication>> moveToReview(@PathVariable String loanId) {
        return ResponseEntity.ok(loanWorkflowService.moveToReview(loanId));
    }

    @PostMapping("/{loanId}/approve")
    @PreAuthorize("hasAnyRole('CREDIT_OFFICER', 'ADMIN')")
    @Idempotent(entityType = "LoanApplication")
    public ResponseEntity<ApiResponse<LoanApplication>> approveLoan(
            @PathVariable String loanId,
            @Valid @RequestBody LoanApprovalRequest request) {
        return ResponseEntity.ok(loanWorkflowService.approveLoan(loanId, request));
    }

    @PostMapping("/{loanId}/reject")
    @PreAuthorize("hasAnyRole('CREDIT_OFFICER', 'ADMIN')")
    @Idempotent(entityType = "LoanApplication")
    public ResponseEntity<ApiResponse<LoanApplication>> rejectLoan(
            @PathVariable String loanId,
            @RequestParam String reason) {
        return ResponseEntity.ok(loanWorkflowService.rejectLoan(loanId, reason));
    }

    @PostMapping("/{loanId}/disburse")
    @PreAuthorize("hasRole('ADMIN')")
    @Idempotent(entityType = "LoanApplication")
    public ResponseEntity<ApiResponse<LoanApplication>> disburseLoan(@PathVariable String loanId) {
        return ResponseEntity.ok(loanWorkflowService.disburseLoan(loanId));
    }

    @PostMapping("/{loanId}/bank-details/verify")
    @PreAuthorize("hasRole('ADMIN')")
    @Idempotent(entityType = "LoanApplication")
    public ResponseEntity<ApiResponse<LoanApplication>> verifyBankDetails(
            @PathVariable String loanId,
            @Valid @RequestBody BankDetailsVerificationRequest request) {
        return ResponseEntity.ok(loanWorkflowService.verifyBankDetails(loanId, request));
    }
}
