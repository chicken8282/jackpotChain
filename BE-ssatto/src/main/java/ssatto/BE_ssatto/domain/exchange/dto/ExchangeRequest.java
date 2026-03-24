package ssatto.BE_ssatto.domain.exchange.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * JACK -> POT 교환 요청이다.
 *
 * @param fromAddress 요청 지갑 주소
 * @param jackAmount 교환할 JACK satoshi
 * @param signedTxHex 서명된 트랜잭션 hex
 */
public record ExchangeRequest(
    @NotBlank(message = "교환 지갑 주소는 필수입니다.")
    String fromAddress,

    @NotNull(message = "교환 JACK 수량은 필수입니다.")
    Long jackAmount,

    @NotBlank(message = "서명된 트랜잭션은 필수입니다.")
    String signedTxHex
) {
}
