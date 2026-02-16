package com.trumio.lms.idempotency;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;
import com.trumio.lms.repository.IdempotencyKeyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class IdempotencyService {

    private final IdempotencyKeyRepository idempotencyKeyRepository;
    private final ObjectMapper objectMapper;

    /**
     * Main idempotency check entry point
     */
    @Transactional
    public Optional<IdempotencyKey> checkIdempotency(
            String idempotencyKey,
            String userId,
            String requestPath,
            String httpMethod,
            Object requestBody) {

        if (idempotencyKey == null || idempotencyKey.trim().isEmpty()) {
            return Optional.empty();
        }

        Optional<IdempotencyKey> existing =
                idempotencyKeyRepository.findByIdempotencyKeyAndUserId(idempotencyKey, userId);

        if (existing.isPresent()) {
            IdempotencyKey key = existing.get();

            switch (key.getStatus()) {

                case COMPLETED:
                    log.info("Returning cached response for key {}", idempotencyKey);
                    return Optional.of(key);

                case PROCESSING:
                    throw new BusinessException(
                            ErrorCode.DUPLICATE_REQUEST,
                            "Request is already being processed"
                    );

                case FAILED:
                    log.info("Retrying previously failed request {}", idempotencyKey);
                    key.setStatus(IdempotencyKey.ProcessingStatus.PROCESSING);
                    key.setCreatedAt(Instant.now());
                    key.setExpiresAt(Instant.now().plusSeconds(180));
                    idempotencyKeyRepository.save(key);
                    return Optional.empty();

                default:
                    throw new BusinessException(
                            ErrorCode.INTERNAL_ERROR,
                            "Unknown idempotency status"
                    );
            }
        }

        // Create new record (race-condition safe)
        try {
            String requestBodyJson = requestBody != null
                    ? objectMapper.writeValueAsString(requestBody)
                    : null;

            IdempotencyKey newKey = IdempotencyKey.builder()
                    .idempotencyKey(idempotencyKey)
                    .userId(userId)
                    .requestPath(requestPath)
                    .httpMethod(httpMethod)
                    .requestBody(requestBodyJson)
                    .status(IdempotencyKey.ProcessingStatus.PROCESSING)
                    .createdAt(Instant.now())
                    .expiresAt(Instant.now().plusSeconds(180)) // 3 min TTL
                    .build();

            idempotencyKeyRepository.save(newKey);

            log.info("Created idempotency record {}", idempotencyKey);
            return Optional.empty();

        } catch (DuplicateKeyException ex) {

            log.info("Duplicate key detected (race condition): {}", idempotencyKey);

            return idempotencyKeyRepository
                    .findByIdempotencyKeyAndUserId(idempotencyKey, userId);
        } catch (Exception ex) {

            log.error("Error creating idempotency record", ex);

            throw new BusinessException(
                    ErrorCode.INTERNAL_ERROR,
                    "Failed to process idempotency key"
            );
        }
    }

    /**
     * Store successful response
     */
    @Transactional
    public void storeSuccessResponse(
            String idempotencyKey,
            String userId,
            int statusCode,
            Object responseBody,
            String entityId,
            String entityType) {

        if (idempotencyKey == null || idempotencyKey.trim().isEmpty()) {
            return;
        }

        try {
            Optional<IdempotencyKey> keyOpt =
                    idempotencyKeyRepository.findByIdempotencyKeyAndUserId(idempotencyKey, userId);

            if (keyOpt.isPresent()) {

                IdempotencyKey key = keyOpt.get();

                String responseJson = null;
                if (responseBody != null) {
                    try {
                        responseJson = objectMapper.writeValueAsString(responseBody);
                    } catch (Exception e) {
                        log.warn("Could not serialize response body for idempotency caching: {}", e.getMessage());
                        // Continue even if serialization fails
                    }
                }

                key.setStatus(IdempotencyKey.ProcessingStatus.COMPLETED);
                key.setResponseStatus(statusCode);
                key.setResponseBody(responseJson);
                key.setEntityId(entityId);
                key.setEntityType(entityType);

                idempotencyKeyRepository.save(key);

                log.info("Stored success response for {}", idempotencyKey);
            }

        } catch (Exception e) {
            log.error("Error storing success response", e);
        }
    }

    /**
     * Mark as failed
     */
    @Transactional
    public void markAsFailed(String idempotencyKey, String userId, String errorMessage) {

        if (idempotencyKey == null || idempotencyKey.trim().isEmpty()) {
            return;
        }

        try {
            Optional<IdempotencyKey> keyOpt =
                    idempotencyKeyRepository.findByIdempotencyKeyAndUserId(idempotencyKey, userId);

            if (keyOpt.isPresent()) {

                IdempotencyKey key = keyOpt.get();
                key.setStatus(IdempotencyKey.ProcessingStatus.FAILED);
                key.setResponseBody(errorMessage);

                idempotencyKeyRepository.save(key);

                log.info("Marked key {} as FAILED", idempotencyKey);
            }

        } catch (Exception e) {
            log.error("Error marking idempotency key as failed", e);
        }
    }

    /**
     * Parse cached response
     */
    public <T> T parseCachedResponse(IdempotencyKey key, Class<T> responseType) {
        try {
            if (key.getResponseBody() == null) {
                return null;
            }
            return objectMapper.readValue(key.getResponseBody(), responseType);
        } catch (Exception e) {
            log.error("Error parsing cached response", e);
            throw new BusinessException(
                    ErrorCode.INTERNAL_ERROR,
                    "Failed to parse cached response"
            );
        }
    }
}
