package ssatto.BE_ssatto.global.exception;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ssatto.BE_ssatto.domain.auth.exception.EmailDuplicateException;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 공통 예외 처리 계약을 검증한다.
 */
class GlobalExceptionHandlerTest {

    private MockMvc mockMvc;

    /**
     * ControllerAdvice와 Bean Validation이 포함된 standalone MVC 스택을 구성한다.
     */
    @BeforeEach
    void setUp() {
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders.standaloneSetup(new ExceptionTestController())
            .setControllerAdvice(new GlobalExceptionHandler())
            .setValidator(validator)
            .build();
    }

    /**
     * 비즈니스 예외가 설정된 HTTP 상태와 공통 응답 포맷으로 매핑되는지 확인한다.
     */
    @Test
    void businessExceptionUsesConfiguredErrorCodeAndStatus() throws Exception {
        mockMvc.perform(get("/test-exception/business"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("AUTH_EMAIL_DUPLICATE"))
            .andExpect(jsonPath("$.message").value("이미 사용 중인 이메일입니다."))
            .andExpect(jsonPath("$.data").value(nullValue()));
    }

    /**
     * Bean Validation 실패가 Bad Request 응답으로 매핑되는지 확인한다.
     */
    @Test
    void validationFailureReturnsBadRequestWrapper() throws Exception {
        mockMvc.perform(post("/test-exception/validation")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"value\":\"\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("COMMON_INVALID_REQUEST"))
            .andExpect(jsonPath("$.message").value("값은 비어 있을 수 없습니다."))
            .andExpect(jsonPath("$.data").value(nullValue()));
    }

    /**
     * 처리되지 않은 예외가 내부 서버 오류 응답으로 매핑되는지 확인한다.
     */
    @Test
    void unhandledExceptionReturnsInternalServerErrorWrapper() throws Exception {
        mockMvc.perform(get("/test-exception/unhandled"))
            .andExpect(status().isInternalServerError())
            .andExpect(jsonPath("$.code").value("COMMON_INTERNAL_SERVER_ERROR"))
            .andExpect(jsonPath("$.message").value("서버 내부 오류가 발생했습니다."))
            .andExpect(jsonPath("$.data").value(nullValue()));
    }

    /**
     * 예외 처리 분기를 유도하는 테스트용 컨트롤러이다.
     */
    @RestController
    @RequestMapping("/test-exception")
    static class ExceptionTestController {

        /**
         * 비즈니스 예외를 발생시킨다.
         */
        @GetMapping("/business")
        void business() {
            throw new EmailDuplicateException();
        }

        /**
         * 요청 본문을 검증한다.
         */
        @PostMapping("/validation")
        void validation(@Valid @RequestBody ValidationRequest request) {
        }

        /**
         * 처리되지 않은 예외를 발생시킨다.
         */
        @GetMapping("/unhandled")
        void unhandled() {
            throw new IllegalStateException("boom");
        }
    }

    /**
     * 테스트 컨트롤러에서 사용하는 검증용 DTO이다.
     */
    static class ValidationRequest {

        @NotBlank(message = "값은 비어 있을 수 없습니다.")
        private String value;

        /**
         * 값을 반환한다.
         */
        public String getValue() {
            return value;
        }

        /**
         * 값을 설정한다.
         */
        public void setValue(String value) {
            this.value = value;
        }
    }
}
