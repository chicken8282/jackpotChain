package ssatto.BE_ssatto.domain.blockchain.rpc;

/**
 * JackpotChain 잭팟 풀 상태 조회 결과를 백엔드에서 사용하기 위한 DTO다.
 *
 * @param balanceSatoshi 현재 잭팟 풀 잔액 satoshi
 * @param nextJackpotSatoshi 다음 잭팟 예상치 satoshi
 * @param totalEntries 누적 참여 횟수
 * @param totalCollectedSatoshi 누적 수집량 satoshi
 * @param snapshotCount 스냅샷 수
 */
public record JackpotChainJackpotPool(
    long balanceSatoshi,
    long nextJackpotSatoshi,
    long totalEntries,
    long totalCollectedSatoshi,
    long snapshotCount
) {
}
