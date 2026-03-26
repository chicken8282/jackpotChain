package ssatto.BE_ssatto.domain.lotto.dto;

import java.time.LocalDateTime;

/**
 * 로또 당첨자 랭킹 응답이다.
 *
 * @param rank 순위 (1~3)
 * @param walletAddress 당첨자 지갑 주소
 * @param rewardJack 수령 보상 (JACK satoshi)
 * @param matchCount 일치 번호 수
 * @param claimedAt 보상 수령 일시
 */
public record LottoRankingResponse(
    int rank,
    String walletAddress,
    long rewardJack,
    int matchCount,
    LocalDateTime claimedAt
) {
}
