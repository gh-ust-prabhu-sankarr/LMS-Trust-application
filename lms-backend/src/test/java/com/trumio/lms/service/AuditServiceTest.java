package com.trumio.lms.service;

import com.trumio.lms.entity.AuditLog;
import com.trumio.lms.repository.AuditLogRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @InjectMocks
    private AuditService auditService;

    @Test
    void log_ShouldPersistAuditRecord() {
        auditService.log("u1", "ACTION", "ENTITY", "e1", "details");
        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    void getAuditLogsByUser_ShouldReturnLogs() {
        when(auditLogRepository.findByUserId("u1")).thenReturn(List.of(AuditLog.builder().userId("u1").build()));

        List<AuditLog> logs = auditService.getAuditLogsByUser("u1");

        assertEquals(1, logs.size());
        assertEquals("u1", logs.getFirst().getUserId());
    }
}
