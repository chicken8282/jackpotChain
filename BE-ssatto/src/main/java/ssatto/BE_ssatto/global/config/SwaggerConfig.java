package ssatto.jackpotchain.global.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger / SpringDoc OpenAPI 설정
 *
 * <p>Swagger UI를 통해 API를 문서화하고 브라우저에서 직접 테스트할 수 있게 한다.
 * 접근 URL: http://localhost:8080/swagger-ui/index.html</p>
 *
 * <p>JWT 인증이 필요한 API는 Swagger UI 우측 상단 "Authorize" 버튼에서
 * Bearer 토큰을 입력하면 헤더에 자동으로 추가된다.</p>
 */
@Configuration
public class SwaggerConfig {

    /** JWT Bearer 토큰 보안 스키마 이름 */
    private static final String BEARER_TOKEN_SECURITY_SCHEME = "bearerAuth";

    /**
     * OpenAPI 설정 빈 등록
     *
     * <p>API 기본 정보(title, description, version)와
     * JWT Bearer 토큰 전역 보안 스키마를 설정한다.</p>
     *
     * @return OpenAPI 설정 객체
     */
    @Bean
    public OpenAPI openAPI() {
        // JWT Bearer 토큰 보안 스키마 정의
        SecurityScheme bearerAuthScheme = new SecurityScheme()
            .type(SecurityScheme.Type.HTTP)
            .scheme("bearer")
            .bearerFormat("JWT")
            .description("지갑 주소 기반 JWT 토큰. POST /api/auth/token 으로 발급 후 입력.");

        // 전역 보안 요구사항 — 모든 API에 Bearer 토큰 요구
        SecurityRequirement securityRequirement = new SecurityRequirement()
            .addList(BEARER_TOKEN_SECURITY_SCHEME);

        return new OpenAPI()
            .info(new Info()
                .title("JackpotChain API")
                .description("""
                    JackpotChain 블록체인 복권 경험 플랫폼 백엔드 API

                    ## 인증
                    대부분의 API는 JWT Bearer 토큰이 필요합니다.
                    1. `POST /api/auth/token` 으로 지갑 주소를 제출하여 토큰을 발급받습니다.
                    2. 발급된 토큰을 우측 상단 **Authorize** 버튼에 입력합니다.

                    ## 도메인
                    - **Blockchain**: 블록 조회, 트랜잭션 조회, 네트워크 상태
                    - **Wallet**: 지갑 생성, 잔액 조회, 활동 내역
                    - **Exchange**: JACK ↔ POT 환전
                    - **Lotto**: 로또 참여, 추첨 결과, 당첨금 수령
                    - **Mining**: 채굴 보상 조회
                    - **Ops**: 헬스체크, 운영 정보
                    """)
                .version("v1.0.0")
            )
            .components(new Components()
                .addSecuritySchemes(BEARER_TOKEN_SECURITY_SCHEME, bearerAuthScheme)
            )
            .addSecurityItem(securityRequirement);
    }
}
