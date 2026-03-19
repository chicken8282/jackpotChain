package ssatto.BE_ssatto.domain.lotto.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

/**
 * 로또 참여 요청이다.
 *
 * @param fromAddress 참여 지갑 주소
 * @param chosenNumbers 선택한 6개 숫자
 * @param signedTxHex 서명된 트랜잭션 hex
 */
public record LottoCommitRequest(
    @NotBlank(message = "참여 지갑 주소는 필수입니다.")
    String fromAddress,

    @NotEmpty(message = "로또 번호는 필수입니다.")
    List<Integer> chosenNumbers,

    @NotBlank(message = "서명된 트랜잭션은 필수입니다.")
    String signedTxHex
) {
}
