package ssatto.BE_ssatto.global.logging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 핵심 비즈니스 이벤트를 일관된 필드 구조로 기록한다.
 */
public final class BusinessEventLogger {

    private static final Logger log = LoggerFactory.getLogger(BusinessEventLogger.class);

    private BusinessEventLogger() {
    }

    public static void info(LoggingEventType eventType, String message, Map<String, ?> fields) {
        Map<String, Object> enrichedFields = new LinkedHashMap<>();
        enrichedFields.put(LoggingFields.EVENT_TYPE, eventType.name());
        enrichedFields.putAll(fields);
        LoggingUtils.withFields(enrichedFields, () -> log.info(message));
    }
}
