package com.trumio.lms.entity;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "audit_logs")
public class AuditLog {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String action;

    @Indexed
    private String entityType;

    private String entityId;

    private String details;

    private Map<String, Object> requestSnapshot;
    private Map<String, Object> responseSnapshot;

    @Indexed
    private LocalDateTime timestamp;
}