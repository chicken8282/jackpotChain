package ssatto.jackpotchain.global.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Getter;

/**
 * 공통 API 응답 래퍼
 *
 * <p>모든 API 응답은 이 클래스로 감싸서 반환한다.
 * 성공 시: code="SUCCESS", data=응답 데이터
 * 실패 시: code=에러코드 문자열, message=에러 메시지, data=null</p>
 *
 * <p>응답 예시:
 * <pre>
 * {
 *   "code": "SUCCESS",
 *   "message": "요청이 성공적으로 처리되었습니다.",
 *   "data": { ... }
 * }
 * </pre>
 * </p>
 *
 * @param <T> 응답 데이터 타입
 */
@Getter
@JsonInclude(JsonInclude.Include.NON_NULL)  // null 필드는 JSON 직렬화에서 제외
public class ApiResponse<T> {

    /** 응답 코드 — 성공: "SUCCESS", 실패: ErrorCode 이름 */
    private final String code;

    /** 응답 메시지 — 성공/실패 설명 */
    private final String message;

    /** 실제 응답 데이터 — 실패 시 null */
    private final T data;

    // 생성자는 private — 정적 팩터리 메서드로만 생성
    private ApiResponse(String code, String message, T data) {
        this.code = code;
        this.message = message;
        this.data = data;
    }

    /**
     * 성공 응답 생성 (데이터 있음)
     *
     * @param data 응답 데이터
     * @return 성공 응답 객체
     */
    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>("SUCCESS", "요청이 성공적으로 처리되었습니다.", data);
    }

    /**
     * 성공 응답 생성 (데이터 없음 — 생성/삭제 완료 등)
     *
     * @return 성공 응답 객체 (data=null)
     */
    public static <T> ApiResponse<T> success() {
        return new ApiResponse<>("SUCCESS", "요청이 성공적으로 처리되었습니다.", null);
    }

    /**
     * 에러 응답 생성
     *
     * @param code    에러 코드 문자열 (ErrorCode.name())
     * @param message 사용자에게 노출할 에러 메시지
     * @return 에러 응답 객체
     */
    public static <T> ApiResponse<T> error(String code, String message) {
        return new ApiResponse<>(code, message, null);
    }
}
