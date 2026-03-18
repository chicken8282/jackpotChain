package ssatto.jackpotchain.global.exception;

import lombok.Getter;

/**
 * 비즈니스 규칙 위반 예외
 *
 * <p>Service 레이어에서 비즈니스 로직 검증 실패 시 이 예외를 던진다.
 * {@link GlobalExceptionHandler}가 이 예외를 잡아 클라이언트에게 구조화된 에러 응답을 반환한다.</p>
 *
 * <p>사용 예시:
 * <pre>
 * if (!wallet.hasBalance(amount)) {
 *     throw new BusinessException(ErrorCode.WALLET_INSUFFICIENT_BALANCE);
 * }
 * </pre>
 * </p>
 */
@Getter
public class BusinessException extends RuntimeException {

    /** 에러 유형을 나타내는 에러 코드 */
    private final ErrorCode errorCode;

    /**
     * ErrorCode로 BusinessException 생성
     *
     * <p>에러 메시지는 ErrorCode에 정의된 기본 메시지를 사용한다.</p>
     *
     * @param errorCode 발생한 비즈니스 에러 코드
     */
    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    /**
     * ErrorCode와 추가 메시지로 BusinessException 생성
     *
     * <p>기본 메시지에 추가 정보를 덧붙여야 할 때 사용한다.</p>
     *
     * @param errorCode      발생한 비즈니스 에러 코드
     * @param detailMessage  추가 상세 메시지
     */
    public BusinessException(ErrorCode errorCode, String detailMessage) {
        super(detailMessage);
        this.errorCode = errorCode;
    }

    /**
     * ErrorCode와 원인 예외로 BusinessException 생성
     *
     * <p>인프라 예외(IOException 등)를 도메인 예외로 변환할 때 사용한다.</p>
     *
     * @param errorCode 발생한 비즈니스 에러 코드
     * @param cause     원인 예외
     */
    public BusinessException(ErrorCode errorCode, Throwable cause) {
        super(errorCode.getMessage(), cause);
        this.errorCode = errorCode;
    }
}
