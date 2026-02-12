package com.trumio.lms.idempotency;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "idempotency_keys")
public class IdempotencyKey {

    @Id
    private String id;

    @Indexed(unique = true)
    private String idempotencyKey;

    @Indexed
    private String userId;

    private String requestPath;

    private String httpMethod;

    private String requestBody;

    private Integer responseStatus;

    private String responseBody;

    private Instant createdAt;

    // TTL index: document expires 3 minutes after expiresAt time
    @Indexed(name = "expiresAt_ttl_idx", expireAfter = "3m")
    private Instant expiresAt;

    private ProcessingStatus status;

    private String entityId;   // ID of created entity (e.g., loan application ID)

    private String entityType; // Type of entity (e.g., "LOAN_APPLICATION")

    public enum ProcessingStatus {
        PROCESSING,
        COMPLETED,
        FAILED
    }
}
