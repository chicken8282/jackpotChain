package ssatto.BE_ssatto.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import ssatto.BE_ssatto.global.logging.RequestLoggingFilter;

/**
 * 백엔드 초기 환경 구성 단계의 보안 설정이다.
 */
@Configuration
@EnableWebSecurity
@EnableConfigurationProperties({AuthRefreshCookieProperties.class, AuthCorsProperties.class})
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RequestLoggingFilter requestLoggingFilter;
    private final AuthenticationEntryPoint authenticationEntryPoint;
    private final AuthCorsProperties authCorsProperties;

    public SecurityConfig(
        JwtAuthenticationFilter jwtAuthenticationFilter,
        RequestLoggingFilter requestLoggingFilter,
        JwtAuthenticationEntryPoint authenticationEntryPoint,
        AuthCorsProperties authCorsProperties
    ) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.requestLoggingFilter = requestLoggingFilter;
        this.authenticationEntryPoint = authenticationEntryPoint;
        this.authCorsProperties = authCorsProperties;
    }

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
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exception -> exception.authenticationEntryPoint(authenticationEntryPoint))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/v3/api-docs/**",
                    "/actuator/health",
                    "/v1/auth/challenge",
                    "/v1/auth/verify",
                    "/v1/auth/refresh",
                    "/v1/auth/logout",
                    "/v1/blockchain/**",
                    "/v1/learning/**",   // [학습 프론트엔드 v2] 추가
                    "/v1/lotto/ranking",
                    "/v1/wallet",
                    "/v1/wallet/"
                ).permitAll()
                .requestMatchers(
                    "/v1/wallet/*/activities",
                    "/v1/wallet/*/utxos",
                    "/v1/lotto",
                    "/v1/lotto/entries",
                    "/v1/lotto/entries/*/result",
                    "/v1/lotto/entries/*/claim-context",
                    "/v1/lotto/commit",
                    "/v1/lotto/claim",
                    "/v1/mining/blocks",
                    "/v1/exchange/info",
                    "/v1/exchange/jack-to-pot"
                ).authenticated()
                .anyRequest().permitAll()
            )
            .addFilterBefore(requestLoggingFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(jwtAuthenticationFilter, RequestLoggingFilter.class);

        return http.build();
    }

    /**
     * 인증/보호 API의 credentialed CORS allowlist를 구성한다.
     *
     * @return CORS 설정 소스
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowCredentials(true);
        configuration.setAllowedOrigins(authCorsProperties.getAllowedOrigins());
        configuration.setAllowedMethods(authCorsProperties.getAllowedMethods());
        configuration.setAllowedHeaders(authCorsProperties.getAllowedHeaders());
        configuration.setMaxAge(authCorsProperties.getMaxAgeSeconds());

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/v1/**", configuration);
        source.registerCorsConfiguration("/v3/api-docs/**", configuration);
        return source;
    }
}
