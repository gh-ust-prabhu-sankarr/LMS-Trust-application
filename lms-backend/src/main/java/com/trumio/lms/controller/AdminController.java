package com.trumio.lms.controller;

import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.dto.CreateOfficerRequest;
import com.trumio.lms.entity.AuditLog;
import com.trumio.lms.entity.User;
import com.trumio.lms.service.AuditService;
import com.trumio.lms.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AuditService auditService;
    private final UserService userService;

    @GetMapping("/audit/user/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN','CREDIT_OFFICER')")
    public ResponseEntity<List<AuditLog>> getUserAuditLogs(@PathVariable String userId) {
        return ResponseEntity.ok(auditService.getAuditLogsByUser(userId));
    }

    @GetMapping("/audit/entity/{entityType}/{entityId}")
    @PreAuthorize("hasAnyRole('ADMIN','CREDIT_OFFICER')")
    public ResponseEntity<List<AuditLog>> getEntityAuditLogs(
            @PathVariable String entityType,
            @PathVariable String entityId) {
        return ResponseEntity.ok(auditService.getAuditLogsByEntity(entityType, entityId));
    }

    @GetMapping({"/audit", "/audit/"})
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AuditLog>> getAuditLogs(
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String entityId,
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(auditService.getAuditLogs(userId, action, entityType, entityId, limit));
    }

    @PostMapping("/users/officer")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<User>> createCreditOfficer(
            @Valid @RequestBody CreateOfficerRequest request) {
        return ResponseEntity.ok(userService.createCreditOfficer(
                request.getUsername(),
                request.getEmail(),
                request.getPassword()
        ));
    }

    @GetMapping("/users")
    @PreAuthorize("hasAnyRole('ADMIN','CREDIT_OFFICER')")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @PutMapping("/users/{userId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<User>> toggleUserStatus(
            @PathVariable String userId,
            @RequestParam boolean active) {
        return ResponseEntity.ok(userService.toggleUserStatus(userId, active));
    }
}
