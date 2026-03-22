package ssatto.BE_ssatto.domain.lotto.dto;

/**
 * 클라이언트 claim 서명용 잭팟 풀 UTXO 응답이다.
 *
 * @param txId 트랜잭션 식별자
 * @param vout 출력 인덱스
 * @param jackAmount JACK 금액 satoshi
 * @param confirmations 확인 수
 */
public record LottoClaimPoolUtxoResponse(
    String txId,
    int vout,
    Long jackAmount,
    int confirmations
) {
}
