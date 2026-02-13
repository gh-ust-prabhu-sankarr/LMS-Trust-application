package com.trumio.lms.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.trumio.lms.entity.AuditLog;
import com.trumio.lms.repository.AuditLogRepository;
import com.trumio.lms.util.AuditLogMaskUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public void log(
            String userId,
            String action,
            String entityType,
            Object RequestSnapshot,
            Object ResponseSnapshot,
            String entityId,
            String details
    ) {

        Map<String, Object> RequestSnapshotMap = null;
        Map<String, Object> ResponseSnapshotMap = null;
        RequestSnapshotMap = AuditLogMaskUtil.toMaskedMap(RequestSnapshot);
        ResponseSnapshotMap = AuditLogMaskUtil.toMaskedMap(ResponseSnapshot);





        AuditLog auditLog = AuditLog.builder()
                .userId(userId)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .requestSnapshot(RequestSnapshotMap)
                .responseSnapshot(ResponseSnapshotMap)
                .timestamp(LocalDateTime.now())
                .build();

        auditLogRepository.save(auditLog);
    }
    public void log(
            String userId,
            String action,
            String entityType,
            String entityId,
            String details
    ) {


        AuditLog auditLog = AuditLog.builder()
                .userId(userId)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .requestSnapshot(null)
                .responseSnapshot(null)
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
}
