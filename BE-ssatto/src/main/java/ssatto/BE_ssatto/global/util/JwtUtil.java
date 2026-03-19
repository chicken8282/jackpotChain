package ssatto.BE_ssatto.global.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT 생성과 파싱을 담당하는 유틸리티 컴포넌트이다.
 */
@Slf4j
@Component
public class JwtUtil {

    private final SecretKey secretKey;
    private final long expirationMs;

    /**
     * 설정된 시크릿과 만료 시간으로 JWT 유틸리티를 생성한다.
     *
     * @param secret JWT 서명 시크릿
     * @param expirationMs 토큰 만료 시간(밀리초)
     */
    public JwtUtil(
        @Value("${jwt.secret}") String secret,
        @Value("${jwt.expiration}") long expirationMs
    ) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    /**
     * 지정한 지갑 주소에 대한 JWT를 생성한다.
     *
     * @param walletAddress 지갑 주소
     * @return 서명된 JWT
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
     * 토큰 subject에서 지갑 주소를 추출한다.
     *
     * @param token JWT 토큰
     * @return 지갑 주소
     */
    public String extractWalletAddress(String token) {
        return parseClaims(token).getSubject();
    }

    /**
     * 토큰이 정상적으로 파싱되는지 검증한다.
     *
     * @param token JWT 토큰
     * @return 유효하면 true
     */
    public boolean isValidToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (BusinessException exception) {
            return false;
        }
    }

    /**
     * 토큰 클레임을 파싱하고 잘못된 토큰 상태를 비즈니스 예외로 변환한다.
     *
     * @param token JWT 토큰
     * @return 파싱된 클레임
     */
    private Claims parseClaims(String token) {
        try {
            return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        } catch (ExpiredJwtException exception) {
            log.debug("AUTH_TOKEN_EXPIRED message={}", exception.getMessage());
            throw new BusinessException(ErrorCode.AUTH_TOKEN_EXPIRED, exception);
        } catch (SignatureException | MalformedJwtException exception) {
            log.debug("AUTH_TOKEN_INVALID message={}", exception.getMessage());
            throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, exception);
        } catch (Exception exception) {
            log.debug("AUTH_TOKEN_INVALID message={}", exception.getMessage());
            throw new BusinessException(ErrorCode.AUTH_TOKEN_INVALID, exception);
        }
    }
}
