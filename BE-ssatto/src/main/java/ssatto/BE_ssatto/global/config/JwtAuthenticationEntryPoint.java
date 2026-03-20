package ssatto.BE_ssatto.global.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import ssatto.BE_ssatto.global.exception.ErrorCode;
import ssatto.BE_ssatto.global.response.ApiResponse;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * 인증 실패 시 공통 JSON 응답을 반환한다.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    /**
     * 인증 실패 응답을 JSON 형식으로 기록한다.
     *
     * @param request 요청 객체
     * @param response 응답 객체
     * @param authException 인증 예외
     * @throws IOException 응답 쓰기 실패
     */
    @Override
    public void commence(
        HttpServletRequest request,
        HttpServletResponse response,
        AuthenticationException authException
    ) throws IOException {
        ErrorCode errorCode = ErrorCode.AUTH_TOKEN_MISSING;
        response.setStatus(errorCode.getHttpStatus().value());
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(
            response.getWriter(),
            ApiResponse.error(errorCode.getHttpStatus().value(), errorCode.getMessage())
        );
    }
}
