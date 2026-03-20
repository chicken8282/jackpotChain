package ssatto.BE_ssatto.domain.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import ssatto.BE_ssatto.domain.auth.dto.AuthChallengeRequest;
import ssatto.BE_ssatto.domain.auth.dto.AuthChallengeResponse;
import ssatto.BE_ssatto.domain.auth.dto.AuthRefreshRequest;
import ssatto.BE_ssatto.domain.auth.dto.AuthRefreshResponse;
import ssatto.BE_ssatto.domain.auth.dto.AuthVerifyRequest;
import ssatto.BE_ssatto.domain.auth.dto.AuthVerifyResponse;
import ssatto.BE_ssatto.domain.auth.exception.AuthChallengeNotFoundException;
import ssatto.BE_ssatto.domain.auth.exception.AuthRefreshSessionNotFoundException;
import ssatto.BE_ssatto.domain.auth.exception.AuthWalletNotFoundException;
import ssatto.BE_ssatto.domain.auth.exception.InvalidAuthChallengeRequestException;
import ssatto.BE_ssatto.domain.auth.exception.InvalidAuthRefreshRequestException;
import ssatto.BE_ssatto.domain.auth.exception.InvalidAuthSignatureException;
import ssatto.BE_ssatto.domain.auth.model.AuthChallenge;
import ssatto.BE_ssatto.domain.auth.model.AuthRefreshSession;
import ssatto.BE_ssatto.domain.auth.repository.AuthChallengeRepository;
import ssatto.BE_ssatto.domain.auth.repository.AuthRefreshSessionRepository;
import ssatto.BE_ssatto.domain.auth.util.WalletAuthCrypto;
import ssatto.BE_ssatto.domain.wallet.repository.WalletRepository;
import ssatto.BE_ssatto.global.util.JwtUtil;

import java.time.LocalDateTime;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.UUID;

/**
 * 지갑 주소 기반 토큰 발급을 담당하는 서비스다.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final SecureRandom secureRandom = new SecureRandom();
    private final WalletRepository walletRepository;
    private final JwtUtil jwtUtil;
    private final AuthChallengeRepository authChallengeRepository;
    private final AuthRefreshSessionRepository authRefreshSessionRepository;
    private final WalletAuthCrypto walletAuthCrypto;

    @Value("${jwt.access-expiration:${jwt.expiration}}")
    private long accessTokenExpirationMs;

    @Value("${jwt.refresh-expiration:1209600000}")
    private long refreshTokenExpirationMs;

    @Value("${auth.challenge-ttl-seconds}")
    private long authChallengeTtlSeconds;

    /**
     * 지갑 서명 검증용 챌린지를 발급한다.
     *
     * @param request 챌린지 발급 요청
     * @return 챌린지 응답
     */
    @Transactional(readOnly = true)
    public AuthChallengeResponse createChallenge(AuthChallengeRequest request) {
        validateChallengeAddress(request.address());
        walletRepository.findByAddress(request.address())
            .orElseThrow(AuthWalletNotFoundException::new);

        LocalDateTime issuedAt = LocalDateTime.now();
        LocalDateTime expiresAt = issuedAt.plusSeconds(authChallengeTtlSeconds);
        String challengeId = UUID.randomUUID().toString();
        String nonce = generateNonce();
        String message = buildChallengeMessage(request.address(), challengeId, nonce, issuedAt, expiresAt);
        AuthChallenge challenge = new AuthChallenge(
            challengeId,
            request.address(),
            nonce,
            message,
            expiresAt,
            false
        );

        authChallengeRepository.save(challenge);
        return new AuthChallengeResponse(challengeId, request.address(), nonce, message, expiresAt);
    }

    /**
     * 지갑 서명을 검증하고 access token을 발급한다.
     *
     * @param request 챌린지 검증 요청
     * @return access token 응답
     */
    @Transactional
    public AuthVerifyResponse verifyChallenge(AuthVerifyRequest request) {
        validateVerifyRequest(request);

        AuthChallenge challenge = authChallengeRepository.findById(request.challengeId())
            .orElseThrow(AuthChallengeNotFoundException::new);

        if (challenge.used() || challenge.isExpired(LocalDateTime.now())) {
            authChallengeRepository.delete(request.challengeId());
            throw new AuthChallengeNotFoundException();
        }

        walletRepository.findByAddress(request.address())
            .orElseThrow(AuthWalletNotFoundException::new);

        String derivedAddress = walletAuthCrypto.deriveAddress(request.publicKey());
        if (!request.address().equals(challenge.address()) || !request.address().equals(derivedAddress)) {
            throw new InvalidAuthSignatureException();
        }

        boolean signatureValid = walletAuthCrypto.verifySignature(
            challenge.message(),
            request.signature(),
            request.publicKey()
        );
        if (!signatureValid) {
            throw new InvalidAuthSignatureException();
        }

        authChallengeRepository.save(challenge.markUsed());
        String accessToken = jwtUtil.generateAccessToken(request.address());
        String refreshToken = jwtUtil.generateRefreshToken();
        String refreshTokenHash = jwtUtil.hashRefreshToken(refreshToken);
        String sessionHandle = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();

        authRefreshSessionRepository.save(AuthRefreshSession.create(
            sessionHandle,
            request.address(),
            refreshTokenHash,
            now.plusNanos(refreshTokenExpirationMs * 1_000_000L),
            now,
            null
        ));

        return new AuthVerifyResponse(
            accessToken,
            request.address(),
            now.plusNanos(accessTokenExpirationMs * 1_000_000L),
            sessionHandle,
            refreshToken
        );
    }

    /**
     * refresh 세션을 검증하고 access token과 refresh token을 회전한다.
     *
     * @param request refresh 요청
     * @param refreshToken refresh cookie 원문
     * @return 재발급 응답
     */
    @Transactional
    public AuthRefreshResponse refresh(AuthRefreshRequest request, String refreshToken) {
        if (!StringUtils.hasText(request.sessionHandle()) || !StringUtils.hasText(refreshToken)) {
            throw new InvalidAuthRefreshRequestException();
        }

        AuthRefreshSession session = authRefreshSessionRepository.findBySessionHandle(request.sessionHandle())
            .orElseThrow(AuthRefreshSessionNotFoundException::new);
        LocalDateTime now = LocalDateTime.now();
        String refreshTokenHash = jwtUtil.hashRefreshToken(refreshToken);

        if (!session.isActive(now) || !session.getRefreshTokenHash().equals(refreshTokenHash)) {
            session.revoke(now);
            authRefreshSessionRepository.save(session);
            throw new AuthRefreshSessionNotFoundException();
        }

        String nextAccessToken = jwtUtil.generateAccessToken(session.getWalletAddress());
        String nextRefreshToken = jwtUtil.generateRefreshToken();
        String nextRefreshTokenHash = jwtUtil.hashRefreshToken(nextRefreshToken);
        session.rotate(nextRefreshTokenHash, now.plusNanos(refreshTokenExpirationMs * 1_000_000L));
        authRefreshSessionRepository.save(session);

        return new AuthRefreshResponse(
            nextAccessToken,
            session.getWalletAddress(),
            now.plusNanos(accessTokenExpirationMs * 1_000_000L),
            session.getSessionHandle(),
            nextRefreshToken
        );
    }

    /**
     * refresh 세션을 폐기한다.
     *
     * @param sessionHandle 세션 핸들
     * @param refreshToken refresh cookie 원문
     */
    @Transactional
    public void logout(String sessionHandle, String refreshToken) {
        if (!StringUtils.hasText(sessionHandle)) {
            throw new InvalidAuthRefreshRequestException();
        }

        authRefreshSessionRepository.findBySessionHandle(sessionHandle)
            .ifPresent(session -> {
                LocalDateTime now = LocalDateTime.now();
                if (!StringUtils.hasText(refreshToken)
                    || session.getRefreshTokenHash().equals(jwtUtil.hashRefreshToken(refreshToken))) {
                    session.revoke(now);
                    authRefreshSessionRepository.save(session);
                }
            });
    }

    private void validateChallengeAddress(String address) {
        if (!StringUtils.hasText(address) || !walletAuthCrypto.isValidAddress(address)) {
            throw new InvalidAuthChallengeRequestException();
        }
    }

    private void validateVerifyRequest(AuthVerifyRequest request) {
        if (!StringUtils.hasText(request.challengeId())
            || !StringUtils.hasText(request.address())
            || !StringUtils.hasText(request.publicKey())
            || !StringUtils.hasText(request.signature())
            || !walletAuthCrypto.isValidAddress(request.address())) {
            throw new InvalidAuthChallengeRequestException();
        }
    }

    private String generateNonce() {
        byte[] bytes = new byte[16];
        secureRandom.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private String buildChallengeMessage(
        String address,
        String challengeId,
        String nonce,
        LocalDateTime issuedAt,
        LocalDateTime expiresAt
    ) {
        return "SSATTO Login\n"
            + "address=" + address + "\n"
            + "challengeId=" + challengeId + "\n"
            + "nonce=" + nonce + "\n"
            + "issuedAt=" + issuedAt + "\n"
            + "expiresAt=" + expiresAt + "\n"
            + "purpose=wallet-auth";
    }
}
