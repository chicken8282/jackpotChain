package ssatto.BE_ssatto.domain.lotto.dto;

import java.util.List;

/**
 * 로또 페이지 진입 시 필요한 통합 응답이다.
 *
 * @param jackBalance JACK 잔액 satoshi
 * @param potBalance POT 잔액 satoshi
 * @param poolBalanceJack 잭팟 풀 잔액 satoshi
 * @param totalEntries 누적 참여 횟수
 * @param totalWinners 누적 당첨 건수
 * @param prizeTiers 랭킹 목록
 */
public record LottoOverviewResponse(
    long jackBalance,
    long potBalance,
    long poolBalanceJack,
    long totalEntries,
    long totalWinners,
    List<LottoPrizeTierResponse> prizeTiers
) {
}
