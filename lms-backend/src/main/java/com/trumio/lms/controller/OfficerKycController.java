package com.trumio.lms.controller;

import com.trumio.lms.dto.AdminKycRequest;
import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.dto.KycResponse;
import com.trumio.lms.entity.enums.KYCStatus;
import com.trumio.lms.idempotency.Idempotent;
import com.trumio.lms.service.KycService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/officer/kyc")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('CREDIT_OFFICER', 'ADMIN')")
public class OfficerKycController {

    private final KycService kycService;

    @GetMapping
    public ResponseEntity<List<KycResponse>> getByStatus(@RequestParam KYCStatus status) {
        return ResponseEntity.ok(kycService.getByStatus(status));
    }

    @PostMapping("/{kycId}/approve")
    @Idempotent(entityType = "KYC")
    public ResponseEntity<ApiResponse<KycResponse>> approve(
            @PathVariable String kycId,
            @RequestBody(required = false) AdminKycRequest request) {
        String remarks = request != null ? request.getRemarks() : null;
        return ResponseEntity.ok(kycService.verifyKyc(
                kycId,
                new AdminKycRequest(KYCStatus.APPROVED, remarks)
        ));
    }

    @PostMapping("/{kycId}/reject")
    @Idempotent(entityType = "KYC")
    public ResponseEntity<ApiResponse<KycResponse>> reject(
            @PathVariable String kycId,
            @RequestBody(required = false) AdminKycRequest request) {
        String remarks = request != null ? request.getRemarks() : null;
        return ResponseEntity.ok(kycService.verifyKyc(
                kycId,
                new AdminKycRequest(KYCStatus.REJECTED, remarks)
        ));
    }
}
