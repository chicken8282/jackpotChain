package ssatto.BE_ssatto.global.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger UI용 OpenAPI 설정이다.
 */
@Configuration
public class SwaggerConfig {

    private static final String BEARER_TOKEN_SECURITY_SCHEME = "bearerAuth";

    /**
     * Swagger UI에서 사용할 OpenAPI 정의를 등록한다.
     *
     * @return OpenAPI 정의
     */
    @Bean
    public OpenAPI openAPI() {
        SecurityScheme bearerAuthScheme = new SecurityScheme()
            .type(SecurityScheme.Type.HTTP)
            .scheme("bearer")
            .bearerFormat("JWT")
            .description("인증 API에서 발급한 JWT Bearer 토큰");

        SecurityRequirement securityRequirement = new SecurityRequirement()
            .addList(BEARER_TOKEN_SECURITY_SCHEME);

        return new OpenAPI()
            .info(new Info()
                .title("JackpotChain API")
                .description("JackpotChain 플랫폼 백엔드 API")
                .version("v1.0.0")
            )
            .components(new Components()
                .addSecuritySchemes(BEARER_TOKEN_SECURITY_SCHEME, bearerAuthScheme)
            )
            .addSecurityItem(securityRequirement);
    }
}
