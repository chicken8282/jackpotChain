package ssatto.BE_ssatto.domain.exchange.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ssatto.BE_ssatto.domain.exchange.dto.ExchangeInfoResponse;
import ssatto.BE_ssatto.domain.exchange.dto.ExchangeRequest;
import ssatto.BE_ssatto.domain.exchange.dto.ExchangeResponse;
import ssatto.BE_ssatto.domain.exchange.service.ExchangeService;
import ssatto.BE_ssatto.global.response.ApiResponse;

/**
 * 교환 정보 조회와 제출 API를 제공한다.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/exchange")
public class ExchangeController {

    private final ExchangeService exchangeService;

    /**
     * 교환 화면의 현재 잔액을 조회한다.
     *
     * @param address 지갑 주소
     * @return 교환 정보 응답
     */
    @GetMapping("/info")
    public ApiResponse<ExchangeInfoResponse> getExchangeInfo(@RequestParam String address) {
        return ApiResponse.success(exchangeService.getExchangeInfo(address));
    }

    /**
     * 서명된 교환 트랜잭션을 제출한다.
     *
     * @param request 교환 요청
     * @return 교환 완료 응답
     */
    @PostMapping("/jack-to-pot")
    public ApiResponse<ExchangeResponse> exchangeJackToPot(@Valid @RequestBody ExchangeRequest request) {
        return ApiResponse.success(exchangeService.exchangeJackToPot(request));
    }
}
