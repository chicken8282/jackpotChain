package ssatto.BE_ssatto.domain.wallet.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 지갑 메타데이터 등록 요청이다.
 *
 * @param address 지갑 주소
 * @param nickname 지갑 닉네임
 * @param walletColor 지갑 색상 식별자
 * @param grantOnboardingReward 신규 생성 지갑에 onboarding 보상을 지급할지 여부
 */
public record CreateWalletRequest(
    @NotBlank(message = "지갑 주소는 필수입니다.")
    String address,

    @Size(max = 50, message = "지갑 닉네임은 50자를 초과할 수 없습니다.")
    String nickname,

    String walletColor,

    Boolean grantOnboardingReward
) {
}
