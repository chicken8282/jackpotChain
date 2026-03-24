package ssatto.BE_ssatto.global.response;

import lombok.Getter;

/**
 * 공통 API 응답 래퍼이다.
 *
 * @param <T> 응답 데이터 타입
 */
@Getter
public class ApiResponse<T> {

    private final int code;
    private final String message;
    private final T data;

    private ApiResponse(int code, String message, T data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }

    /**
     * 데이터를 포함한 성공 응답을 생성한다.
     *
     * @param code 응답 코드
     * @param message 응답 메시지
     * @param data 응답 본문 데이터
     * @return 성공 응답
     */
    public static <T> ApiResponse<T> success(int code, String message, T data) {
        return new ApiResponse<>(code, message, data);
    }

    /**
     * 데이터가 없는 성공 응답을 생성한다.
     *
     * @param code 응답 코드
     * @param message 응답 메시지
     * @return 성공 응답
     */
    public static <T> ApiResponse<T> success(int code, String message) {
        return new ApiResponse<>(code, message, null);
    }

    /**
     * 에러 응답을 생성한다.
     *
     * @param code HTTP 상태 코드
     * @param message 클라이언트에 노출할 메시지
     * @return 에러 응답
     */
    public static <T> ApiResponse<T> error(int code, String message) {
        return new ApiResponse<>(code, message, null);
    }
}
