package ssatto.BE_ssatto.domain.lotto.dto;

/**
 * 로또 랭킹 응답의 단일 항목이다.
 *
 * @param rank 순위
 * @param matches 일치 개수
 * @param rewardJack 보상 JACK satoshi
 */
public record LottoPrizeTierResponse(
    int rank,
    int matches,
    long rewardJack
) {
}
