package ssatto.BE_ssatto.domain.wallet.dto;

import java.util.List;

/**
 * 지갑 UTXO 목록 응답이다.
 *
 * @param utxos UTXO 목록
 */
public record WalletUtxoListResponse(
    List<WalletUtxoItemResponse> utxos
) {
}
