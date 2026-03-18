package ssatto.jackpotchain.global.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import ssatto.jackpotchain.global.exception.BusinessException;
import ssatto.jackpotchain.global.exception.ErrorCode;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT 토큰 유틸리티
 *
 * <p>지갑 주소 기반 JWT 토큰의 생성, 파싱, 검증을 담당한다.
 * JackpotChain은 전통적인 ID/PW 로그인이 없으며,
 * 지갑 주소(walletAddress)를 subject로 하는 JWT를 발급하여 인증한다.</p>
 *
 * <p>토큰 구조:
 * - subject: 지갑 주소 (예: "0xabc123...")
 * - issuedAt: 발급 시각
 * - expiration: 만료 시각 (기본 24시간)
 * </p>
 */
@Slf4j
@Component
public class JwtUtil {

    /** JWT 서명에 사용할 시크릿 키 (HMAC-SHA256, 256비트 이상 필요) */
    private final SecretKey secretKey;

    /** 토큰 유효 시간 (밀리초) */
    private final long expirationMs;

    /**
     * JwtUtil 생성자
     *
     * @param secret        application.yaml의 jwt.secret 값
     * @param expirationMs  application.yaml의 jwt.expiration 값 (밀리초)
     */
    public JwtUtil(
        @Value("${jwt.secret}") String secret,
        @Value("${jwt.expiration}") long expirationMs
    ) {
        // 시크릿 문자열을 HMAC-SHA256 키로 변환
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    /**
     * 지갑 주소로 JWT 토큰 생성
     *
     * @param walletAddress 토큰 subject로 사용할 지갑 주소
     * @return 생성된 JWT 토큰 문자열
     */
    public String generateToken(String walletAddress) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
            .subject(walletAddress)
            .issuedAt(now)
            .expiration(expiry)
            .signWith(secretKey)
            .compact();
    }

    /**
     * JWT 토큰에서 지갑 주소(subject) 추출
     *
     * @param token JWT 토큰 문자열
     * @return 지갑 주소
     * @throws BusinessException AUTH_TOKEN_INVALID — 유효하지 않은 토큰
     * @throws BusinessException AUTH_TOKEN_EXPIRED — 만료된 토큰
     */
    public String extractWalletAddress(String token) {
        return parseClaims(token).getSubject();
    }

    /**
     * JWT 토큰 유효성 검증
     *
     * @param token JWT 토큰 문자열
     * @return 유효한 토큰이면 true
     */
    public boolean isValidToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (BusinessException e) {
            return false;
        }
    }

    /**
     * JWT 토큰 파싱 — Claims(페이로드) 추출
     *
     * @param token JWT 토큰 문자열
     * @return 파싱된 Claims 객체
     * @throws BusinessException 토큰 유효성 검사 실패 시
     */
    private Claims parseClaims(String token) {
        try {
            return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        } catch (ExpiredJwtException e) {
            // 토큰 만료
            log.debug("[JwtUtil] 만료된 토큰: {}", e.getMessage());
            throw new BusinessException(ErrorCode.AUTH_TOKEN_EXPIRED, e);
        } catch (SignatureException | MalformedJwtException e) {
            // 서명 불일치 또는 형식 오류
            log.debug("[JwtUtil] 유효하지 않은 토큰: {}", e.getMessage());
            throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, e);
        } catch (Exception e) {
            // 기타 예외
            log.warn("[JwtUtil] 토큰 파싱 중 예외 발생: {}", e.getMessage());
            throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, e);
        }
    }
}
