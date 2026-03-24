package ssatto.BE_ssatto.global.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * 요청 단위 MDC 필드를 세팅하고 정리한다.
 */
@Component
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final String REQUEST_ID_HEADER = "X-Request-Id";

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String requestId = LoggingUtils.resolveRequestId(request.getHeader(REQUEST_ID_HEADER));
        String traceId = LoggingUtils.newTraceId();

        try {
            MDC.put(LoggingFields.REQUEST_ID, requestId);
            MDC.put(LoggingFields.TRACE_ID, traceId);
            MDC.put(LoggingFields.METHOD, request.getMethod());
            MDC.put(LoggingFields.URI, request.getRequestURI());
            response.setHeader(REQUEST_ID_HEADER, requestId);
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(LoggingFields.REQUEST_ID);
            MDC.remove(LoggingFields.TRACE_ID);
            MDC.remove(LoggingFields.METHOD);
            MDC.remove(LoggingFields.URI);
        }
    }
}
