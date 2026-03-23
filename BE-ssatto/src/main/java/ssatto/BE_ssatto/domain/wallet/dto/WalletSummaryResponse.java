package ssatto.BE_ssatto.domain.wallet.dto;

import java.time.LocalDateTime;

/**
 * 지갑 목록의 단일 항목 응답이다.
 *
 * @param address 지갑 주소
 * @param nickname 지갑 닉네임
 * @param walletColor 지갑 색상 식별자
 * @param jackBalance JACK 잔액 satoshi
 * @param potBalance POT 잔액 satoshi
 * @param createdAt 생성 시각
 */
public record WalletSummaryResponse(
    String address,
    String nickname,
    String walletColor,
    long jackBalance,
    long potBalance,
    LocalDateTime createdAt
) {
}
