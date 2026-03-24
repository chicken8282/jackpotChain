package ssatto.BE_ssatto.global.logging;

import org.slf4j.MDC;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * MDC 기반 구조화 로그를 위한 유틸리티다.
 */
public final class LoggingUtils {

    private LoggingUtils() {
    }

    public static String resolveRequestId(String requestIdHeader) {
        if (requestIdHeader != null && !requestIdHeader.isBlank()) {
            return requestIdHeader.trim();
        }
        return UUID.randomUUID().toString();
    }

    public static String newTraceId() {
        return UUID.randomUUID().toString().replace("-", "");
    }

    public static Map<String, Object> fields(Object... keyValues) {
        if (keyValues.length % 2 != 0) {
            throw new IllegalArgumentException("keyValues length must be even");
        }

        Map<String, Object> values = new LinkedHashMap<>();
        for (int index = 0; index < keyValues.length; index += 2) {
            Object key = keyValues[index];
            Object value = keyValues[index + 1];
            if (key instanceof String fieldName) {
                values.put(fieldName, value);
            }
        }
        return values;
    }

    public static void withFields(Map<String, ?> fields, Runnable action) {
        Map<String, String> previousValues = new HashMap<>();
        try {
            fields.forEach((key, value) -> {
                previousValues.put(key, MDC.get(key));
                if (value == null) {
                    MDC.remove(key);
                    return;
                }
                MDC.put(key, String.valueOf(value));
            });
            action.run();
        } finally {
            previousValues.forEach((key, previousValue) -> {
                if (previousValue == null) {
                    MDC.remove(key);
                    return;
                }
                MDC.put(key, previousValue);
            });
        }
    }
}
