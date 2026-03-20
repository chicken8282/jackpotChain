package ssatto.BE_ssatto.domain.lotto.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * 로또 보상 수령 요청이다.
 *
 * @param fromAddress 수령 지갑 주소
 * @param commitHash 커밋 트랜잭션 해시
 * @param signedTxHex 서명된 트랜잭션 hex
 */
public record LottoClaimRequest(
    @NotBlank(message = "수령 지갑 주소는 필수입니다.")
    String fromAddress,

    @NotBlank(message = "커밋 해시는 필수입니다.")
    String commitHash,

    @NotBlank(message = "서명된 트랜잭션은 필수입니다.")
    String signedTxHex
) {
}
