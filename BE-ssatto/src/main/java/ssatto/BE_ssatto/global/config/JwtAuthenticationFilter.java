package ssatto.BE_ssatto.global.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import ssatto.BE_ssatto.global.util.JwtUtil;

import java.io.IOException;
import java.util.List;

/**
 * Bearer access token을 인증 주체로 변환하는 필터다.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    /**
     * Authorization 헤더의 Bearer token을 SecurityContext에 주입한다.
     *
     * @param request 요청 객체
     * @param response 응답 객체
     * @param filterChain 다음 필터 체인
     * @throws ServletException 서블릿 예외
     * @throws IOException 입출력 예외
     */
    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");
        if (StringUtils.hasText(authorization) && authorization.startsWith("Bearer ")) {
            String accessToken = authorization.substring(7).trim();
            if (StringUtils.hasText(accessToken) && jwtUtil.isValidToken(accessToken)) {
                String walletAddress = jwtUtil.extractWalletAddress(accessToken);
                UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(walletAddress, null, List.of());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }

        filterChain.doFilter(request, response);
    }
}
