package ssatto.BE_ssatto.domain.blockchain.rpc;

/**
 * 잭팟 풀 기준 UTXO 단건 정보다.
 *
 * @param txId 트랜잭션 식별자
 * @param vout 출력 인덱스
 * @param jackSatoshi JACK 금액
 * @param confirmations 확인 수
 */
public record JackpotChainPoolUnspentOutput(
    String txId,
    int vout,
    long jackSatoshi,
    int confirmations
) {
}
