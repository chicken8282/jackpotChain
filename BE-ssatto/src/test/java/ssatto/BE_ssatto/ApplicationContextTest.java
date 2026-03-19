package ssatto.BE_ssatto;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * 테스트 프로필에서 Spring Boot 애플리케이션 컨텍스트가 정상 로드되는지 검증한다.
 */
@SpringBootTest
@ActiveProfiles("test")
class ApplicationContextTest {

    /**
     * 애플리케이션 컨텍스트를 로드한다.
     */
    @Test
    void contextLoads() {
    }
}
