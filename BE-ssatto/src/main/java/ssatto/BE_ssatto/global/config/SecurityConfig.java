package ssatto.jackpotchain.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Spring Security 설정
 *
 * <p>JWT 기반 Stateless 인증 방식을 사용한다.
 * 세션을 사용하지 않으며 CSRF 보호를 비활성화한다.
 * (REST API에서 CSRF 토큰 기반 보호는 의미가 없으므로)</p>
 *
 * <p>인증 불필요 경로:
 * - /swagger-ui/** : Swagger UI 접근
 * - /v3/api-docs/** : OpenAPI JSON 문서
 * - /api/auth/token : JWT 토큰 발급 (인증 진입점)
 * - /api/blockchain/** : 공개 블록체인 정보 조회
 * - /actuator/health : 헬스체크
 * </p>
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    /**
     * SecurityFilterChain 빈 등록
     *
     * <p>JWT 기반 Stateless 인증 체인을 구성한다.
     * 초기 설정에서는 인증 처리를 최소화하여 개발 편의성을 높이고,
     * JwtFilter는 추후 wallet 모듈 구현 시 추가한다.</p>
     *
     * @param http HttpSecurity 빌더
     * @return 구성된 SecurityFilterChain
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // CSRF 비활성화 — REST API는 세션 쿠키 인증을 사용하지 않으므로 불필요
            .csrf(AbstractHttpConfigurer::disable)

            // 세션 비활성화 — JWT Stateless 방식
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )

            // 요청별 인증 정책 설정
            .authorizeHttpRequests(auth -> auth
                // Swagger UI 및 API 문서는 인증 불필요
                .requestMatchers(
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/v3/api-docs/**"
                ).permitAll()

                // JWT 토큰 발급 엔드포인트 인증 불필요
                .requestMatchers("/api/auth/token").permitAll()

                // 헬스체크 인증 불필요
                .requestMatchers("/actuator/health").permitAll()

                // 공개 블록체인 정보 조회 인증 불필요
                .requestMatchers("/api/blockchain/**").permitAll()

                // 그 외 모든 요청은 인증 필요 (개발 중에는 임시로 모두 허용)
                // TODO: 도메인 구현 완료 후 .authenticated()로 변경
                .anyRequest().permitAll()
            );

        return http.build();
    }
}
