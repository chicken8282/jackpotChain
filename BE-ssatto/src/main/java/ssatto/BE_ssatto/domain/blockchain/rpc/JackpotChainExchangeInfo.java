package ssatto.BE_ssatto.domain.blockchain.rpc;

/**
 * JackpotChain 교환 규칙 조회 결과를 백엔드에서 사용하기 위한 DTO다.
 *
 * @param jackPerPot POT 1개당 필요한 JACK 수량
 * @param minJack 최소 교환 JACK 수량
 */
public record JackpotChainExchangeInfo(
    int jackPerPot,
    int minJack
) {
}
