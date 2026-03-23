package ssatto.BE_ssatto.domain.lotto.dto;

import java.time.LocalDateTime;

/**
 * 로또 보상 수령 응답이다.
 *
 * @param claimTxId 클레임 트랜잭션 해시
 * @param matchCount 일치 개수
 * @param rewardJack 수령 JACK satoshi
 * @param claimedAt 수령 시각
 */
public record LottoClaimResponse(
    String claimTxId,
    Integer matchCount,
    Long rewardJack,
    LocalDateTime claimedAt
) {
}
