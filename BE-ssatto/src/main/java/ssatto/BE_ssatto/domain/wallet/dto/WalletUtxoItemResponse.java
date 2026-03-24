package ssatto.BE_ssatto.domain.wallet.dto;

import java.util.Map;

/**
 * 지갑 UTXO 단건 응답이다.
 *
 * @param txId 트랜잭션 식별자
 * @param vout 출력 인덱스
 * @param address 소유 주소
 * @param jackAmount JACK 금액
 * @param assets 자산 금액 맵
 * @param confirmations 확인 수
 * @param coinbase 코인베이스 여부
 */
public record WalletUtxoItemResponse(
    String txId,
    int vout,
    String address,
    long jackAmount,
    Map<String, Long> assets,
    int confirmations,
    boolean coinbase
) {
}
