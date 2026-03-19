package ssatto.BE_ssatto;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * JackpotChain 백엔드의 Spring Boot 진입점이다.
 */
@SpringBootApplication
public class Application {

    /**
     * 애플리케이션을 시작한다.
     *
     * @param args 런타임 인자
     */
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
