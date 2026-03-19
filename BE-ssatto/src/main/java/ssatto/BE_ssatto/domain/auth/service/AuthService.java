package ssatto.BE_ssatto.domain.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import ssatto.BE_ssatto.domain.auth.dto.AuthTokenRequest;
import ssatto.BE_ssatto.domain.auth.dto.AuthTokenResponse;
import ssatto.BE_ssatto.domain.wallet.repository.WalletRepository;
import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;
import ssatto.BE_ssatto.global.util.JwtUtil;

import java.time.LocalDateTime;

/**
 * 지갑 주소 기반 토큰 발급을 담당하는 서비스다.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final WalletRepository walletRepository;
    private final JwtUtil jwtUtil;

    @Value("${jwt.expiration}")
    private long jwtExpirationMs;

    /**
     * 지갑 주소 기반 JWT를 발급한다.
     *
     * @param request 토큰 발급 요청
     * @return 토큰 발급 결과
     */
    @Transactional(readOnly = true)
    public AuthTokenResponse issueToken(AuthTokenRequest request) {
        if (!StringUtils.hasText(request.address())) {
            throw new BusinessException(ErrorCode.COMMON_INVALID_REQUEST);
        }

        walletRepository.findByAddress(request.address())
            .orElseThrow(() -> new BusinessException(ErrorCode.WALLET_NOT_FOUND));

        return new AuthTokenResponse(
            jwtUtil.generateToken(request.address()),
            request.address(),
            LocalDateTime.now().plusNanos(jwtExpirationMs * 1_000_000)
        );
    }
}
