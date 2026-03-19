package ssatto.BE_ssatto.global.response;

import lombok.Getter;

/**
 * 공통 API 응답 래퍼이다.
 *
 * @param <T> 응답 데이터 타입
 */
@Getter
public class ApiResponse<T> {

    private static final String SUCCESS_CODE = "SUCCESS";
    private static final String SUCCESS_MESSAGE = "Request completed successfully.";

    private final String code;
    private final String message;
    private final T data;

    private ApiResponse(String code, String message, T data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }

    /**
     * 데이터를 포함한 성공 응답을 생성한다.
     *
     * @param data 응답 본문 데이터
     * @return 성공 응답
     */
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(SUCCESS_CODE, SUCCESS_MESSAGE, data);
    }

    /**
     * 데이터가 없는 성공 응답을 생성한다.
     *
     * @return 성공 응답
     */
    public static <T> ApiResponse<T> success() {
        return new ApiResponse<>(SUCCESS_CODE, SUCCESS_MESSAGE, null);
    }

    /**
     * 에러 응답을 생성한다.
     *
     * @param code 비즈니스 또는 공통 에러 코드
     * @param message 클라이언트에 노출할 메시지
     * @return 에러 응답
     */
    public static <T> ApiResponse<T> error(String code, String message) {
        return new ApiResponse<>(code, message, null);
    }
}
