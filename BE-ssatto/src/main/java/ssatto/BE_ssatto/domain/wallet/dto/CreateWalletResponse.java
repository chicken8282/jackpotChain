package ssatto.BE_ssatto.domain.wallet.dto;

import java.time.LocalDateTime;

/**
 * 지갑 메타데이터 등록 응답이다.
 *
 * @param address 지갑 주소
 * @param nickname 지갑 닉네임
 * @param walletColor 지갑 색상 식별자
 * @param createdAt 생성 시각
 */
public record CreateWalletResponse(
    String address,
    String nickname,
    String walletColor,
    LocalDateTime createdAt
) {
}
