package com.trumio.lms.util;



import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import java.util.*;

public final class AuditLogMaskUtil {

    private static final ObjectMapper objectMapper;

    static {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    // Keys that must be masked (case-insensitive)
    private static final Set<String> SENSITIVE_KEYS = Set.of(
            "password",
            "panNumber",
            "phone",
            "email",
            "token",
            "authorization"
    );

    private AuditLogMaskUtil() {
    }

    /**
     * Convert any object into a masked Map suitable for MongoDB audit logs
     */
    public static Map<String, Object> toMaskedMap(Object object) {
        if (object == null) {
            return null;
        }

        Map<String, Object> map = objectMapper.convertValue(object, Map.class);
        return maskMap(map);
    }

    private static Map<String, Object> maskMap(Map<String, Object> input) {
        Map<String, Object> masked = new LinkedHashMap<>();

        for (Map.Entry<String, Object> entry : input.entrySet()) {
            String key = entry.getKey();
            Object value = entry.getValue();

            if (value == null) {
                masked.put(key, null);
            }
            else if (isSensitiveKey(key)) {
                masked.put(key, maskValue(key, value.toString()));
            }
            else if (value instanceof Map<?, ?> nestedMap) {
                masked.put(key, maskMap((Map<String, Object>) nestedMap));
            }
            else if (value instanceof List<?> list) {
                masked.put(key, maskList(list));
            }
            else {
                masked.put(key, value);
            }
        }
        return masked;
    }

    private static List<Object> maskList(List<?> list) {
        List<Object> maskedList = new ArrayList<>();

        for (Object item : list) {
            if (item instanceof Map<?, ?> mapItem) {
                maskedList.add(maskMap((Map<String, Object>) mapItem));
            } else {
                maskedList.add(item);
            }
        }
        return maskedList;
    }

    private static boolean isSensitiveKey(String key) {
        return SENSITIVE_KEYS.stream()
                .anyMatch(sensitive -> sensitive.equalsIgnoreCase(key));
    }

    private static String maskValue(String key, String value) {

        if ("password".equalsIgnoreCase(key) ||
                "token".equalsIgnoreCase(key) ||
                "authorization".equalsIgnoreCase(key)) {
            return "******";
        }

        if ("phone".equalsIgnoreCase(key)) {
            return value.replaceAll("\\d(?=\\d{4})", "*");
        }

        if ("panNumber".equalsIgnoreCase(key)) {
            return value.replaceAll("(?<=.{5}).(?=.{1})", "*");
        }

        if ("email".equalsIgnoreCase(key)) {
            int atIndex = value.indexOf("@");
            if (atIndex > 1) {
                return value.charAt(0) + "***" + value.substring(atIndex);
            }
            return "***";
        }

        return "****";
    }
}
