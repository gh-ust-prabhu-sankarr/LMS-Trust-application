package com.trumio.lms.controller;

import com.trumio.lms.dto.AdminKycRequest;
import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.dto.KycResponse;
import com.trumio.lms.entity.enums.KYCStatus;
import com.trumio.lms.idempotency.Idempotent;
import com.trumio.lms.service.KycService;
import jakarta.validation.Valid;
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
@RequestMapping("/api/admin/kyc")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminKycController {

    private final KycService kycService;

    @GetMapping
    public ResponseEntity<List<KycResponse>> getByStatus(@RequestParam KYCStatus status) {
        return ResponseEntity.ok(kycService.getByStatus(status));
    }

    /**
     * Example request body:
     * {
     *   "status": "APPROVED",
     *   "remarks": "Documents validated successfully"
     * }
     */
    @PostMapping("/{kycId}/verify")
    @Idempotent(entityType = "KYC")
    public ResponseEntity<ApiResponse<KycResponse>> verifyKyc(
            @PathVariable String kycId,
            @Valid @RequestBody AdminKycRequest request) {
        return ResponseEntity.ok(kycService.verifyKyc(kycId, request));
    }
}
