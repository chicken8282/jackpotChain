package ssatto.BE_ssatto.domain.exchange.dto;

/**
 * JACK -> POT 교환 완료 응답이다.
 *
 * @param txId 제출된 트랜잭션 해시
 * @param burnedJack 소각 JACK satoshi
 * @param receivedPot 수령 POT satoshi
 * @param exchangeRate 적용 비율
 */
public record ExchangeResponse(
    String txId,
    long burnedJack,
    long receivedPot,
    int exchangeRate
) {
}
