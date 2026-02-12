package com.trumio.lms.idempotency;


import com.fasterxml.jackson.databind.ObjectMapper;
import com.trumio.lms.dto.ApiResponse;
import com.trumio.lms.entity.User;
import com.trumio.lms.exception.BusinessException;
import com.trumio.lms.exception.ErrorCode;
import com.trumio.lms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;
import java.lang.reflect.Method;
import java.util.Optional;

@Slf4j
@Aspect
@Component
@Order(1) // Execute before other aspects
@RequiredArgsConstructor
public class IdempotencyAspect {

    private static final String IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";

    private final IdempotencyService idempotencyService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Around("@annotation(com.trumio.lms.idempotency.Idempotent)")
    public Object handleIdempotency(ProceedingJoinPoint joinPoint) throws Throwable {

        // Get HTTP request
        ServletRequestAttributes attributes = (ServletRequestAttributes)
                RequestContextHolder.getRequestAttributes();
        if (attributes == null) {
            log.warn("No request attributes found, skipping idempotency check");
            return joinPoint.proceed();
        }

        HttpServletRequest request = attributes.getRequest();
        String idempotencyKey = request.getHeader(IDEMPOTENCY_KEY_HEADER);

        // Get annotation
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        Idempotent annotation = method.getAnnotation(Idempotent.class);

        // Check if idempotency key is required
        if (annotation.required() && (idempotencyKey == null || idempotencyKey.trim().isEmpty())) {
            throw new BusinessException(
                    ErrorCode.VALIDATION_ERROR,
                    "Idempotency-Key header is required for this operation"
            );
        }

        // If no idempotency key provided and not required, proceed normally
        if (idempotencyKey == null || idempotencyKey.trim().isEmpty()) {
            return joinPoint.proceed();
        }

        // Get current user
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        // Get request body (first argument of controller method)
        Object requestBody = joinPoint.getArgs().length > 0 ? joinPoint.getArgs()[0] : null;

        // Check idempotency
        Optional<IdempotencyKey> cachedResponse = idempotencyService.checkIdempotency(
                idempotencyKey,
                user.getId(),
                request.getRequestURI(),
                request.getMethod(),
                requestBody
        );

        // If cached response exists, return it
        if (cachedResponse.isPresent()) {
            log.info("Returning cached response for idempotency key: {}", idempotencyKey);
            IdempotencyKey key = cachedResponse.get();

            // Parse and return cached response
            try {
                if (key.getResponseBody() != null) {
                    // Determine if the return type is ResponseEntity
                    Class<?> returnType = signature.getReturnType();
                    
                    if (returnType.isAssignableFrom(ResponseEntity.class)) {
                        // For ResponseEntity, we need to reconstruct it from the cached body
                        // The body was stored as JSON, so we need to extract the inner type
                        Object body = objectMapper.readValue(key.getResponseBody(), Object.class);
                        return ResponseEntity.ok(body);
                    } else {
                        // For non-ResponseEntity returns, deserialize directly
                        Object parsedResponse = objectMapper.readValue(
                                key.getResponseBody(),
                                returnType
                        );
                        return parsedResponse;
                    }
                }

                // If no response body cached, return empty ApiResponse
                return ApiResponse.success("Request already processed (cached response)", null);

            } catch (Exception e) {
                log.error("Error parsing cached response, proceeding with new request", e);
                // If parsing fails, proceed with new request
            }
        }

        // Process new request
        Object result;
        try {
            result = joinPoint.proceed();

            // Extract body if ResponseEntity
            Object bodyToCache = result;
            if (result instanceof ResponseEntity) {
                bodyToCache = ((ResponseEntity<?>) result).getBody();
            }

            // Store successful response
            String entityId = extractEntityId(bodyToCache);
            idempotencyService.storeSuccessResponse(
                    idempotencyKey,
                    user.getId(),
                    200,
                    bodyToCache,
                    entityId,
                    annotation.entityType()
            );

            log.info("Successfully processed idempotent request with key: {}", idempotencyKey);
            return result;

        } catch (Exception e) {
            // Mark as failed
            idempotencyService.markAsFailed(idempotencyKey, user.getId(), e.getMessage());
            log.error("Failed to process idempotent request with key: {}", idempotencyKey, e);
            throw e;
        }
    }

    /**
     * Extract entity ID from response for caching
     */
    private String extractEntityId(Object response) {
        if (response instanceof ApiResponse) {
            ApiResponse<?> apiResponse = (ApiResponse<?>) response;
            Object data = apiResponse.getData();

            if (data != null) {
                try {
                    // Try to get id field via reflection
                    Method getIdMethod = data.getClass().getMethod("getId");
                    Object id = getIdMethod.invoke(data);
                    return id != null ? id.toString() : null;
                } catch (Exception e) {
                    log.debug("Could not extract entity ID from response", e);
                }
            }
        }
        return null;
    }
}