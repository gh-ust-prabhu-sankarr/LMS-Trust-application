package com.trumio.lms.controller;

import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.entity.AuditLog;
import com.trumio.lms.entity.User;
import com.trumio.lms.service.AuditService;
import com.trumio.lms.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AuditService auditService;
    private final UserService userService;
//for audit.. who appliced loan..kyc for particular user
    @GetMapping("/audit/user/{userId}")
    @PreAuthorize("hasAnyRole('ADMIN','CREDIT_OFFICER')")
    public ResponseEntity<List<AuditLog>> getUserAuditLogs(@PathVariable String userId) {
        return ResponseEntity.ok(auditService.getAuditLogsByUser(userId));
    }
    //for audit.. who appliced loan..kyc
    @GetMapping("/audit/entity/{entityType}/{entityId}")
    @PreAuthorize("hasAnyRole('ADMIN','CREDIT_OFFICER')")
    public ResponseEntity<List<AuditLog>> getEntityAuditLogs(
            @PathVariable String entityType,
            @PathVariable String entityId) {
        return ResponseEntity.ok(auditService.getAuditLogsByEntity(entityType, entityId));
    }
//creating credit officer
    @PostMapping("/users/officer")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<User>> createCreditOfficer(
            @RequestBody Map<String, String> request) {
        return ResponseEntity.ok(userService.createCreditOfficer(
                request.get("username"),
                request.get("email"),
                request.get("password")
        ));
    }

    @GetMapping("/users")
    @PreAuthorize("hasAnyRole('ADMIN','CREDIT_OFFICER')")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }
//for activate annd suspend...
    @PutMapping("/users/{userId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<User>> toggleUserStatus(
            @PathVariable String userId,
            @RequestParam boolean active) {
        return ResponseEntity.ok(userService.toggleUserStatus(userId, active));
    }
}
