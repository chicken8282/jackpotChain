package ssatto.BE_ssatto.domain.wallet.dto;

import java.util.List;

/**
 * 지갑 목록 조회 응답이다.
 *
 * @param wallets 지갑 요약 목록
 */
public record WalletListResponse(
    List<WalletSummaryResponse> wallets
) {
}
