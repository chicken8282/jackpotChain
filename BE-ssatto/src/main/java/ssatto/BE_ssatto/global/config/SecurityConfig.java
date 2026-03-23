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
                    "/api/v1/auth/challenge",
                    "/api/v1/auth/verify",
                    "/api/v1/auth/refresh",
                    "/api/v1/auth/logout",
                    "/api/v1/blockchain/**",
                    "/api/v1/wallet",
                    "/api/v1/wallet/"
                ).permitAll()
                .requestMatchers(
                    "/api/v1/wallet/*/activities",
                    "/api/v1/wallet/*/utxos",
                    "/api/v1/lotto",
                    "/api/v1/lotto/entries",
                    "/api/v1/lotto/entries/*/result",
                    "/api/v1/lotto/commit",
                    "/api/v1/mining/blocks",
                    "/api/v1/exchange/info",
                    "/api/v1/exchange/jack-to-pot"
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
        source.registerCorsConfiguration("/api/**", configuration);
        source.registerCorsConfiguration("/v3/api-docs/**", configuration);
        return source;
    }
}
