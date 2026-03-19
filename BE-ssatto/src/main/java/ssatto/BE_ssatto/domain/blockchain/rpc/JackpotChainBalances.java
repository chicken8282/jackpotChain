package ssatto.BE_ssatto.domain.blockchain.rpc;

/**
 * JackpotChain 잔액 조회 결과를 백엔드에서 사용하기 위한 DTO다.
 *
 * @param jackSatoshi JACK 잔액 satoshi
 * @param potSatoshi POT 잔액 satoshi
 */
public record JackpotChainBalances(
    long jackSatoshi,
    long potSatoshi
) {
}
