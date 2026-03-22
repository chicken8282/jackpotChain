package ssatto.BE_ssatto.domain.wallet.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ssatto.BE_ssatto.domain.wallet.dto.CreateWalletRequest;
import ssatto.BE_ssatto.domain.wallet.dto.CreateWalletResponse;
import ssatto.BE_ssatto.domain.wallet.dto.WalletActivityCursorResponse;
import ssatto.BE_ssatto.domain.wallet.dto.WalletListResponse;
import ssatto.BE_ssatto.domain.wallet.dto.WalletUtxoListResponse;
import ssatto.BE_ssatto.domain.wallet.service.WalletService;
import ssatto.BE_ssatto.global.response.ApiResponse;

/**
 * 지갑 메타데이터 등록과 목록 조회 API를 제공한다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/wallet")
public class WalletController {

    private static final int SUCCESS_CODE = HttpStatus.OK.value();
    private static final String CREATE_WALLET_SUCCESS_MESSAGE = "지갑이 등록되었습니다.";
    private static final String GET_WALLETS_SUCCESS_MESSAGE = "지갑 목록 조회가 완료되었습니다.";
    private static final String GET_ACTIVITIES_SUCCESS_MESSAGE = "활동 내역 조회가 완료되었습니다.";
    private static final String GET_UTXOS_SUCCESS_MESSAGE = "UTXO 조회가 완료되었습니다.";

    private final WalletService walletService;

    /**
     * 지갑 메타데이터를 등록한다.
     *
     * @param request 등록 요청
     * @return 등록 결과
     */
    @PostMapping
    public ApiResponse<CreateWalletResponse> createWallet(@Valid @RequestBody CreateWalletRequest request) {
        return ApiResponse.success(SUCCESS_CODE, CREATE_WALLET_SUCCESS_MESSAGE, walletService.createWallet(request));
    }

    /**
     * 지갑 목록과 on-chain 잔액을 조회한다.
     *
     * @param addresses 지갑 주소 목록
     * @return 지갑 목록 응답
     */
    @GetMapping
    public ApiResponse<WalletListResponse> getWallets(@RequestParam String addresses) {
        return ApiResponse.success(SUCCESS_CODE, GET_WALLETS_SUCCESS_MESSAGE, walletService.getWallets(addresses));
    }

    /**
     * 특정 지갑의 활동 내역을 조회한다.
     *
     * @param address 지갑 주소
     * @param cursor 커서
     * @param size 조회 개수
     * @param type 활동 타입
     * @return 활동 내역 응답
     */
    @GetMapping("/{address}/activities")
    public ApiResponse<WalletActivityCursorResponse> getActivities(
        Authentication authentication,
        @PathVariable String address,
        @RequestParam(required = false) Long lastActivityId,
        @RequestParam(required = false) Long cursor,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(required = false) String type
    ) {
        Long resolvedCursor = lastActivityId != null ? lastActivityId : cursor;
        return ApiResponse.success(
            SUCCESS_CODE,
            GET_ACTIVITIES_SUCCESS_MESSAGE,
            walletService.getActivities(resolveWalletSubject(authentication), address, resolvedCursor, size, type)
        );
    }

    /**
     * 특정 지갑의 UTXO 목록을 조회한다.
     *
     * @param authentication 인증 주체
     * @param address 지갑 주소
     * @return UTXO 목록 응답
     */
    @GetMapping("/{address}/utxos")
    public ApiResponse<WalletUtxoListResponse> getUtxos(Authentication authentication, @PathVariable String address) {
        return ApiResponse.success(
            SUCCESS_CODE,
            GET_UTXOS_SUCCESS_MESSAGE,
            walletService.getUtxos(resolveWalletSubject(authentication), address)
        );
    }

    private String resolveWalletSubject(Authentication authentication) {
        return authentication.getName();
    }
}
