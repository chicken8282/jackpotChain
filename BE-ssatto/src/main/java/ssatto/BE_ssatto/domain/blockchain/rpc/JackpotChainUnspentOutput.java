package ssatto.BE_ssatto.domain.blockchain.rpc;

import java.util.Map;

/**
 * 주소 기준 UTXO 단건 정보다.
 *
 * @param txId 트랜잭션 식별자
 * @param vout 출력 인덱스
 * @param address 소유 주소
 * @param jackSatoshi JACK 금액
 * @param assets 멀티에셋 금액 맵
 * @param confirmations 확인 수
 * @param coinbase 코인베이스 UTXO 여부
 */
public record JackpotChainUnspentOutput(
    String txId,
    int vout,
    String address,
    long jackSatoshi,
    Map<String, Long> assets,
    int confirmations,
    boolean coinbase
) {
}
