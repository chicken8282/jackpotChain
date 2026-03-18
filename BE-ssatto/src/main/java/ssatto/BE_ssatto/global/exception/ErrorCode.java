package ssatto.jackpotchain.global.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * 애플리케이션 전역 에러 코드 열거형
 *
 * <p>비즈니스 예외 발생 시 이 enum을 사용하여 에러 유형을 명시한다.
 * 네이밍 규칙: {도메인}_{문제유형} (예: WALLET_NOT_FOUND, LOTTO_ALREADY_ENTERED)</p>
 *
 * <p>HTTP 상태 코드 기준:
 * - 400: 잘못된 요청 파라미터
 * - 401: 인증 실패
 * - 403: 권한 없음
 * - 404: 리소스 없음
 * - 409: 비즈니스 규칙 위반 (상태 충돌)
 * - 503: 외부 의존성 장애
 * - 500: 서버 내부 오류</p>
 */
@Getter
public enum ErrorCode {

    // ===== 공통 에러 =====

    /** 잘못된 요청 파라미터 */
    COMMON_INVALID_REQUEST(HttpStatus.BAD_REQUEST, "잘못된 요청입니다."),

    /** 요청 리소스를 찾을 수 없음 */
    COMMON_NOT_FOUND(HttpStatus.NOT_FOUND, "요청한 리소스를 찾을 수 없습니다."),

    /** 서버 내부 오류 */
    COMMON_INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다."),

    /** 외부 의존성(노드, RPC) 장애 */
    COMMON_SERVICE_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE, "일시적으로 서비스를 이용할 수 없습니다. 잠시 후 다시 시도해 주세요."),

    // ===== 인증 에러 =====

    /** JWT 토큰 없음 */
    AUTH_TOKEN_MISSING(HttpStatus.UNAUTHORIZED, "인증 토큰이 없습니다."),

    /** JWT 토큰 만료 */
    AUTH_TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "인증 토큰이 만료되었습니다. 다시 로그인해 주세요."),

    /** JWT 토큰 유효하지 않음 */
    AUTH_TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "유효하지 않은 인증 토큰입니다."),

    /** 권한 없음 */
    AUTH_FORBIDDEN(HttpStatus.FORBIDDEN, "해당 작업을 수행할 권한이 없습니다."),

    // ===== 지갑(Wallet) 에러 =====

    /** 지갑 주소 존재하지 않음 */
    WALLET_NOT_FOUND(HttpStatus.NOT_FOUND, "지갑 주소를 찾을 수 없습니다."),

    /** 지갑 잔액 부족 */
    WALLET_INSUFFICIENT_BALANCE(HttpStatus.CONFLICT, "잔액이 부족합니다."),

    /** 지갑 상태 전이 불가 */
    WALLET_INVALID_STATUS(HttpStatus.CONFLICT, "현재 지갑 상태에서 해당 작업을 수행할 수 없습니다."),

    /** 지갑 주소 중복 */
    WALLET_ADDRESS_DUPLICATED(HttpStatus.CONFLICT, "이미 등록된 지갑 주소입니다."),

    // ===== 로또(Lotto) 에러 =====

    /** 로또 라운드 없음 */
    LOTTO_ROUND_NOT_FOUND(HttpStatus.NOT_FOUND, "진행 중인 로또 라운드가 없습니다."),

    /** 이미 참여한 로또 라운드 */
    LOTTO_ALREADY_ENTERED(HttpStatus.CONFLICT, "이미 이번 라운드에 참여하셨습니다."),

    /** 로또 참여 비용 부족 */
    LOTTO_INSUFFICIENT_FEE(HttpStatus.CONFLICT, "로또 참여 비용이 부족합니다."),

    /** 로또 당첨 내역 없음 */
    LOTTO_ENTRY_NOT_FOUND(HttpStatus.NOT_FOUND, "로또 참여 내역을 찾을 수 없습니다."),

    /** 로또 번호 유효하지 않음 (1~45 범위, 6개 선택) */
    LOTTO_INVALID_NUMBERS(HttpStatus.BAD_REQUEST, "로또 번호가 유효하지 않습니다. 1~45 중 6개를 선택해야 합니다."),

    /** 당첨금 수령 불가 상태 */
    LOTTO_NOT_CLAIMABLE(HttpStatus.CONFLICT, "당첨금 수령이 불가능한 상태입니다."),

    // ===== 환전(Exchange) 에러 =====

    /** 지원하지 않는 환전 방향 */
    EXCHANGE_INVALID_DIRECTION(HttpStatus.BAD_REQUEST, "지원하지 않는 환전 방향입니다. (JACK_TO_POT 또는 POT_TO_JACK)"),

    /** 환전 최소 수량 미달 */
    EXCHANGE_BELOW_MINIMUM(HttpStatus.BAD_REQUEST, "환전 최소 수량에 미달합니다."),

    /** 환전 잔액 부족 */
    EXCHANGE_INSUFFICIENT_BALANCE(HttpStatus.CONFLICT, "환전할 코인이 부족합니다."),

    // ===== 채굴(Mining) 에러 =====

    /** 채굴 보상 내역 없음 */
    MINING_REWARD_NOT_FOUND(HttpStatus.NOT_FOUND, "채굴 보상 내역을 찾을 수 없습니다."),

    // ===== 블록체인(Blockchain) / 노드 에러 =====

    /** JackpotChain RPC 호출 실패 */
    BLOCKCHAIN_RPC_FAILED(HttpStatus.SERVICE_UNAVAILABLE, "블록체인 노드와 통신에 실패했습니다. 잠시 후 다시 시도해 주세요."),

    /** 블록 데이터 없음 */
    BLOCKCHAIN_BLOCK_NOT_FOUND(HttpStatus.NOT_FOUND, "블록 데이터를 찾을 수 없습니다."),

    /** 트랜잭션 데이터 없음 */
    BLOCKCHAIN_TX_NOT_FOUND(HttpStatus.NOT_FOUND, "트랜잭션 데이터를 찾을 수 없습니다.");

    /** HTTP 상태 코드 */
    private final HttpStatus httpStatus;

    /** 클라이언트에게 노출할 에러 메시지 */
    private final String message;

    ErrorCode(HttpStatus httpStatus, String message) {
        this.httpStatus = httpStatus;
        this.message = message;
    }
}
