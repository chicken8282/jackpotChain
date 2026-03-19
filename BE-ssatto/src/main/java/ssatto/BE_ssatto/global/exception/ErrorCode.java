package ssatto.BE_ssatto.global.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * 애플리케이션 전역에서 사용하는 공통 에러 코드 정의이다.
 */
@Getter
public enum ErrorCode {

    COMMON_INVALID_REQUEST(HttpStatus.BAD_REQUEST, "잘못된 요청입니다."),
    COMMON_NOT_FOUND(HttpStatus.NOT_FOUND, "요청한 리소스를 찾을 수 없습니다."),
    COMMON_INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다."),
    COMMON_SERVICE_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "일시적으로 서비스를 이용할 수 없습니다."),

    AUTH_TOKEN_MISSING(HttpStatus.UNAUTHORIZED, "인증 토큰이 없습니다."),
    AUTH_TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "인증 토큰이 만료되었습니다."),
    AUTH_TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 토큰입니다."),
    AUTH_FORBIDDEN(HttpStatus.FORBIDDEN, "해당 작업을 수행할 권한이 없습니다."),
    AUTH_EMAIL_DUPLICATE(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다."),

    WALLET_NOT_FOUND(HttpStatus.NOT_FOUND, "지갑 정보를 찾을 수 없습니다."),
    WALLET_INSUFFICIENT_BALANCE(HttpStatus.CONFLICT, "지갑 잔액이 부족합니다."),
    WALLET_INVALID_STATUS(HttpStatus.CONFLICT, "현재 지갑 상태에서는 해당 작업을 수행할 수 없습니다."),
    WALLET_ADDRESS_DUPLICATED(HttpStatus.CONFLICT, "이미 등록된 지갑 주소입니다."),

    LOTTO_ROUND_NOT_FOUND(HttpStatus.NOT_FOUND, "로또 회차 정보를 찾을 수 없습니다."),
    LOTTO_ALREADY_ENTERED(HttpStatus.CONFLICT, "이미 해당 회차에 참여했습니다."),
    LOTTO_INSUFFICIENT_FEE(HttpStatus.CONFLICT, "로또 참여 수수료가 부족합니다."),
    LOTTO_ENTRY_NOT_FOUND(HttpStatus.NOT_FOUND, "로또 참여 내역을 찾을 수 없습니다."),
    LOTTO_INVALID_NUMBERS(HttpStatus.BAD_REQUEST, "유효하지 않은 로또 번호입니다."),
    LOTTO_NOT_CLAIMABLE(HttpStatus.CONFLICT, "현재 보상을 수령할 수 없습니다."),

    EXCHANGE_INVALID_DIRECTION(HttpStatus.BAD_REQUEST, "유효하지 않은 교환 방향입니다."),
    EXCHANGE_BELOW_MINIMUM(HttpStatus.BAD_REQUEST, "최소 교환 수량보다 적습니다."),
    EXCHANGE_INSUFFICIENT_BALANCE(HttpStatus.CONFLICT, "교환에 필요한 잔액이 부족합니다."),

    MINING_REWARD_NOT_FOUND(HttpStatus.NOT_FOUND, "채굴 보상 정보를 찾을 수 없습니다."),

    BLOCKCHAIN_RPC_FAILED(HttpStatus.SERVICE_UNAVAILABLE, "블록체인 RPC 호출에 실패했습니다."),
    BLOCKCHAIN_BLOCK_NOT_FOUND(HttpStatus.NOT_FOUND, "블록 정보를 찾을 수 없습니다."),
    BLOCKCHAIN_TX_NOT_FOUND(HttpStatus.NOT_FOUND, "트랜잭션 정보를 찾을 수 없습니다.");

    private final HttpStatus httpStatus;
    private final String message;

    ErrorCode(HttpStatus httpStatus, String message) {
        this.httpStatus = httpStatus;
        this.message = message;
    }
}
