package ssatto.BE_ssatto.domain.blockchain.rpc;

/**
 * JackpotChain 로또 개요 조회 결과를 백엔드에서 사용하기 위한 DTO다.
 *
 * @param poolBalanceSatoshi 현재 풀 잔액 satoshi
 * @param nextJackpotSatoshi 다음 잭팟 예상치 satoshi
 * @param totalEntries 누적 참여 횟수
 * @param payoutCount 누적 지급 건수
 */
public record JackpotChainLottoInfo(
    long poolBalanceSatoshi,
    long nextJackpotSatoshi,
    long totalEntries,
    long payoutCount
) {
}
