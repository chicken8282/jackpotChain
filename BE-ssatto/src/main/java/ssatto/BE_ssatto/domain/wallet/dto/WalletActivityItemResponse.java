package ssatto.BE_ssatto.domain.wallet.dto;

import java.time.LocalDateTime;

/**
 * 지갑 활동 단건 응답이다.
 *
 * @param activityId 활동 ID
 * @param type 활동 유형
 * @param description 활동 설명
 * @param txId 연관 트랜잭션 해시
 * @param createdAt 생성 시각
 */
public record WalletActivityItemResponse(
    Long activityId,
    String type,
    String description,
    String txId,
    LocalDateTime createdAt
) {
}
