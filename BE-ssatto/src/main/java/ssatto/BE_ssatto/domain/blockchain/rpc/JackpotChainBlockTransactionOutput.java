package ssatto.BE_ssatto.domain.blockchain.rpc;

import java.util.Map;

/**
 * JackpotChain 블록 상세 내 트랜잭션 출력 DTO다.
 *
 * @param index 출력 인덱스
 * @param jackValue JACK 금액 satoshi
 * @param assets 추가 에셋 맵
 * @param scriptPubKeyHex scriptPubKey hex
 * @param address 해석 가능한 경우의 주소
 */
public record JackpotChainBlockTransactionOutput(
    int index,
    long jackValue,
    Map<String, Long> assets,
    String scriptPubKeyHex,
    String address
) {
}
