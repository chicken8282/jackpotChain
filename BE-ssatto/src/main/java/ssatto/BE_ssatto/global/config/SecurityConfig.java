package ssatto.BE_ssatto.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

/**
 * 백엔드 초기 환경 구성 단계의 보안 설정이다.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    /**
     * 현재 부트스트랩 단계에 맞는 Stateless HTTP 보안 구성을 적용한다.
     *
     * @param http Spring Security HTTP 빌더
     * @return 구성된 필터 체인
     * @throws Exception 보안 설정에 실패한 경우
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/v3/api-docs/**",
                    "/actuator/health",
                    "/api/auth/token",
                    "/api/blockchain/**"
                ).permitAll()
                .anyRequest().permitAll()
            );

        return http.build();
    }
}
