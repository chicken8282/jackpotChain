package ssatto.BE_ssatto.domain.blockchain.rpc;

/**
 * JackpotChain onboarding POT 지급 결과를 백엔드에서 사용하기 위한 DTO다.
 *
 * @param txId 지급 트랜잭션 ID
 * @param potSatoshi 지급된 POT satoshi
 */
public record JackpotChainOnboardingReward(
    String txId,
    long potSatoshi
) {
}
