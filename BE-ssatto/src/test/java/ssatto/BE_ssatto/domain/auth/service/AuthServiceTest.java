package ssatto.BE_ssatto.domain.auth.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import ssatto.BE_ssatto.domain.auth.dto.AuthChallengeRequest;
import ssatto.BE_ssatto.domain.auth.dto.AuthRefreshRequest;
import ssatto.BE_ssatto.domain.auth.dto.AuthVerifyRequest;
import ssatto.BE_ssatto.domain.auth.exception.AuthChallengeNotFoundException;
import ssatto.BE_ssatto.domain.auth.exception.AuthRefreshSessionNotFoundException;
import ssatto.BE_ssatto.domain.auth.exception.InvalidAuthChallengeRequestException;
import ssatto.BE_ssatto.domain.auth.exception.InvalidAuthSignatureException;
import ssatto.BE_ssatto.domain.auth.model.AuthChallenge;
import ssatto.BE_ssatto.domain.auth.model.AuthRefreshSession;
import ssatto.BE_ssatto.domain.auth.repository.AuthChallengeRepository;
import ssatto.BE_ssatto.domain.auth.repository.AuthRefreshSessionRepository;
import ssatto.BE_ssatto.domain.auth.util.WalletAuthCrypto;
import ssatto.BE_ssatto.domain.wallet.entity.Wallet;
import ssatto.BE_ssatto.domain.wallet.repository.WalletRepository;
import ssatto.BE_ssatto.global.util.JwtUtil;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

/**
 * 지갑 challenge, refresh, logout 인증 흐름을 검증한다.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private WalletRepository walletRepository;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private AuthChallengeRepository authChallengeRepository;

    @Mock
    private AuthRefreshSessionRepository authRefreshSessionRepository;

    @Mock
    private WalletAuthCrypto walletAuthCrypto;

    @InjectMocks
    private AuthService authService;

    @Test
    @DisplayName("챌린지 발급은 등록된 지갑 주소에 대해 저장소에 챌린지를 저장한다")
    void createChallengeStoresChallenge() {
        setAuthProperties();
        Wallet wallet = Wallet.create("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82", "지갑", "GRAY", LocalDateTime.now());
        given(walletRepository.findByAddress("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82")).willReturn(Optional.of(wallet));
        given(walletAuthCrypto.isValidAddress("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82")).willReturn(true);

        authService.createChallenge(new AuthChallengeRequest("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82"));

        ArgumentCaptor<AuthChallenge> challengeCaptor = ArgumentCaptor.forClass(AuthChallenge.class);
        verify(authChallengeRepository).save(challengeCaptor.capture());
        assertThat(challengeCaptor.getValue().address()).isEqualTo("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82");
        assertThat(challengeCaptor.getValue().used()).isFalse();
    }

    @Test
    @DisplayName("챌린지 검증은 유효한 서명일 때 access token과 refresh session을 발급한다")
    void verifyChallengeReturnsAccessAndRefreshSessionWhenSignatureIsValid() {
        setAuthProperties();
        AuthChallenge challenge = new AuthChallenge(
            "challenge-001",
            "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
            "nonce-001",
            "SSATTO Login\naddress=XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
            LocalDateTime.now().plusMinutes(5),
            false
        );
        Wallet wallet = Wallet.create("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82", "지갑", "GRAY", LocalDateTime.now());

        given(authChallengeRepository.findById("challenge-001")).willReturn(Optional.of(challenge));
        given(walletRepository.findByAddress("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82")).willReturn(Optional.of(wallet));
        given(walletAuthCrypto.isValidAddress("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82")).willReturn(true);
        given(walletAuthCrypto.deriveAddress("034f355bdcb7cc0af728ef3cceb9615d90684bb5b2ca5f859ab0f0b704075871aa"))
            .willReturn("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82");
        given(walletAuthCrypto.verifySignature(
            "SSATTO Login\naddress=XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
            "304402204787ca19d3d8c713eb3ae9b6fb6c7d943fb2e0b61f8eb9c3db78911b87a2c20102205e925f9aae2caa3025714c047faa8c8a3bbf7986a37b2814a49f36d1b695e38f",
            "034f355bdcb7cc0af728ef3cceb9615d90684bb5b2ca5f859ab0f0b704075871aa"
        )).willReturn(true);
        given(jwtUtil.generateAccessToken("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82")).willReturn("access-token-001");
        given(jwtUtil.generateRefreshToken()).willReturn("refresh-token-001");
        given(jwtUtil.hashRefreshToken("refresh-token-001")).willReturn("hashed-refresh-token-001");

        var response = authService.verifyChallenge(new AuthVerifyRequest(
            "challenge-001",
            "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
            "034f355bdcb7cc0af728ef3cceb9615d90684bb5b2ca5f859ab0f0b704075871aa",
            "304402204787ca19d3d8c713eb3ae9b6fb6c7d943fb2e0b61f8eb9c3db78911b87a2c20102205e925f9aae2caa3025714c047faa8c8a3bbf7986a37b2814a49f36d1b695e38f"
        ));

        assertThat(response.accessToken()).isEqualTo("access-token-001");
        assertThat(response.refreshToken()).isEqualTo("refresh-token-001");
        assertThat(response.refreshSessionHandle()).isNotBlank();
        verify(authChallengeRepository).save(any(AuthChallenge.class));
        verify(authRefreshSessionRepository).save(any(AuthRefreshSession.class));
    }

    @Test
    @DisplayName("refresh는 유효한 세션이면 access token을 재발급하고 refresh token을 회전한다")
    void refreshRotatesRefreshToken() {
        setAuthProperties();
        AuthRefreshSession session = AuthRefreshSession.create(
            "session-handle-001",
            "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
            "old-token-hash",
            LocalDateTime.now().plusDays(14),
            LocalDateTime.now(),
            null
        );

        given(authRefreshSessionRepository.findBySessionHandle("session-handle-001")).willReturn(Optional.of(session));
        given(jwtUtil.hashRefreshToken("refresh-token-001")).willReturn("old-token-hash");
        given(jwtUtil.generateAccessToken("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82")).willReturn("access-token-002");
        given(jwtUtil.generateRefreshToken()).willReturn("refresh-token-002");
        given(jwtUtil.hashRefreshToken("refresh-token-002")).willReturn("new-token-hash");

        var response = authService.refresh(new AuthRefreshRequest("session-handle-001"), "refresh-token-001");

        assertThat(response.accessToken()).isEqualTo("access-token-002");
        assertThat(response.refreshToken()).isEqualTo("refresh-token-002");
        assertThat(response.refreshSessionHandle()).isEqualTo("session-handle-001");
        verify(authRefreshSessionRepository).save(any(AuthRefreshSession.class));
    }

    @Test
    @DisplayName("refresh 세션이 없으면 도메인 예외를 던진다")
    void refreshThrowsWhenSessionMissing() {
        setAuthProperties();
        given(authRefreshSessionRepository.findBySessionHandle("missing")).willReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refresh(new AuthRefreshRequest("missing"), "refresh-token-001"))
            .isInstanceOf(AuthRefreshSessionNotFoundException.class);
    }

    @Test
    @DisplayName("챌린지가 없으면 검증 시 도메인 예외를 던진다")
    void verifyChallengeThrowsWhenChallengeMissing() {
        setAuthProperties();
        given(authChallengeRepository.findById("missing")).willReturn(Optional.empty());
        given(walletAuthCrypto.isValidAddress("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82")).willReturn(true);

        assertThatThrownBy(() -> authService.verifyChallenge(new AuthVerifyRequest(
            "missing",
            "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
            "034f355bdcb7cc0af728ef3cceb9615d90684bb5b2ca5f859ab0f0b704075871aa",
            "00"
        ))).isInstanceOf(AuthChallengeNotFoundException.class);
    }

    @Test
    @DisplayName("잘못된 공개키 서명이면 검증 시 도메인 예외를 던진다")
    void verifyChallengeThrowsWhenSignatureInvalid() {
        setAuthProperties();
        AuthChallenge challenge = new AuthChallenge(
            "challenge-001",
            "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
            "nonce-001",
            "SSATTO Login\naddress=XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
            LocalDateTime.now().plusMinutes(5),
            false
        );
        Wallet wallet = Wallet.create("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82", "지갑", "GRAY", LocalDateTime.now());

        given(authChallengeRepository.findById("challenge-001")).willReturn(Optional.of(challenge));
        given(walletRepository.findByAddress("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82")).willReturn(Optional.of(wallet));
        given(walletAuthCrypto.isValidAddress("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82")).willReturn(true);
        given(walletAuthCrypto.deriveAddress("034f355bdcb7cc0af728ef3cceb9615d90684bb5b2ca5f859ab0f0b704075871aa"))
            .willReturn("XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82");
        given(walletAuthCrypto.verifySignature(
            "SSATTO Login\naddress=XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
            "00",
            "034f355bdcb7cc0af728ef3cceb9615d90684bb5b2ca5f859ab0f0b704075871aa"
        )).willReturn(false);

        assertThatThrownBy(() -> authService.verifyChallenge(new AuthVerifyRequest(
            "challenge-001",
            "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82",
            "034f355bdcb7cc0af728ef3cceb9615d90684bb5b2ca5f859ab0f0b704075871aa",
            "00"
        ))).isInstanceOf(InvalidAuthSignatureException.class);
    }

    @Test
    @DisplayName("잘못된 주소 형식으로 챌린지를 요청하면 도메인 예외를 던진다")
    void createChallengeThrowsWhenAddressFormatInvalid() {
        setAuthProperties();
        given(walletAuthCrypto.isValidAddress("invalid")).willReturn(false);

        assertThatThrownBy(() -> authService.createChallenge(new AuthChallengeRequest("invalid")))
            .isInstanceOf(InvalidAuthChallengeRequestException.class);
    }

    private void setAuthProperties() {
        ReflectionTestUtils.setField(authService, "accessTokenExpirationMs", 900_000L);
        ReflectionTestUtils.setField(authService, "refreshTokenExpirationMs", 1_209_600_000L);
        ReflectionTestUtils.setField(authService, "authChallengeTtlSeconds", 300L);
    }
}
