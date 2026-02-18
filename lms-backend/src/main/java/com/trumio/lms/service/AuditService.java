package com.trumio.lms.service;


import com.trumio.lms.entity.AuditLog;
import com.trumio.lms.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public void log(String userId, String action, String entityType, String entityId, String details) {
        AuditLog auditLog = AuditLog.builder()
                .userId(userId)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .timestamp(LocalDateTime.now())
                .build();

        auditLogRepository.save(auditLog);
    }

    public List<AuditLog> getAuditLogsByUser(String userId) {
        return auditLogRepository.findByUserId(userId);
    }

    public List<AuditLog> getAuditLogsByEntity(String entityType, String entityId) {
        return auditLogRepository.findByEntityTypeAndEntityId(entityType, entityId);
    }

    public List<AuditLog> getAuditLogs(String userId, String action, String entityType, String entityId, int limit) {
        int size = Math.min(Math.max(limit, 1), 200);
        List<AuditLog> logs;

        if (userId != null && !userId.isBlank()) {
            logs = auditLogRepository.findByUserId(userId);
        } else if (entityType != null && !entityType.isBlank() && entityId != null && !entityId.isBlank()) {
            logs = auditLogRepository.findByEntityTypeAndEntityId(entityType, entityId);
        } else if (entityType != null && !entityType.isBlank()) {
            logs = auditLogRepository.findByEntityType(entityType);
        } else {
            logs = auditLogRepository.findAll();
        }

        if (action != null && !action.isBlank()) {
            String expected = action.trim().toUpperCase();
            logs = logs.stream()
                    .filter(log -> expected.equalsIgnoreCase(String.valueOf(log.getAction())))
                    .toList();
        }

        logs.sort(Comparator.comparing(AuditLog::getTimestamp, Comparator.nullsLast(Comparator.naturalOrder())).reversed());
        return logs.stream().limit(size).toList();
    }
}
