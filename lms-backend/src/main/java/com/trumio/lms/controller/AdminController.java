package com.trumio.lms.controller;

import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.entity.AuditLog;
import com.trumio.lms.entity.User;
import com.trumio.lms.idempotency.Idempotent;
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
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AuditService auditService;
    private final UserService userService;

    @GetMapping("/audit/user/{userId}")
    public ResponseEntity<List<AuditLog>> getUserAuditLogs(@PathVariable String userId) {
        return ResponseEntity.ok(auditService.getAuditLogsByUser(userId));
    }

    @GetMapping("/audit/entity/{entityType}/{entityId}")
    public ResponseEntity<List<AuditLog>> getEntityAuditLogs(
            @PathVariable String entityType,
            @PathVariable String entityId) {
        return ResponseEntity.ok(auditService.getAuditLogsByEntity(entityType, entityId));
    }

    @PostMapping("/users/officer")
    @Idempotent(entityType = "User")
    public ResponseEntity<ApiResponse<User>> createCreditOfficer(
            @RequestBody Map<String, String> request) {
        return ResponseEntity.ok(userService.createCreditOfficer(
                request.get("username"),
                request.get("email"),
                request.get("password")
        ));
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @PutMapping("/users/{userId}/status")
    @Idempotent(entityType = "User")
    public ResponseEntity<ApiResponse<User>> toggleUserStatus(
            @PathVariable String userId,
            @RequestParam boolean active) {
        return ResponseEntity.ok(userService.toggleUserStatus(userId, active));
    }
}
