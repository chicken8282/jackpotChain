package ssatto.BE_ssatto.domain.exchange.dto;

/**
 * 교환 화면 진입용 응답이다.
 *
 * @param jackBalance JACK 잔액 satoshi
 * @param potBalance POT 잔액 satoshi
 */
public record ExchangeInfoResponse(
    long jackBalance,
    long potBalance
) {
}
