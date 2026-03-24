package ssatto.BE_ssatto.domain.auth.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Repository;
import ssatto.BE_ssatto.domain.auth.model.AuthChallenge;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Redis 기반 인증 챌린지 저장소다.
 */
@Repository
@RequiredArgsConstructor
public class RedisAuthChallengeRepository implements AuthChallengeRepository {

    private static final String KEY_PREFIX = "auth:challenge:";

    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;

    @Override
    public void save(AuthChallenge challenge) {
        try {
            String value = objectMapper.writeValueAsString(challenge);
            Duration ttl = Duration.between(LocalDateTime.now(), challenge.expiresAt());
            stringRedisTemplate.opsForValue().set(buildKey(challenge.challengeId()), value, ttl);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("인증 챌린지 직렬화에 실패했습니다.", exception);
        }
    }

    @Override
    public Optional<AuthChallenge> findById(String challengeId) {
        String value = stringRedisTemplate.opsForValue().get(buildKey(challengeId));
        if (value == null) {
            return Optional.empty();
        }

        try {
            AuthChallenge challenge = objectMapper.readValue(value, AuthChallenge.class);
            if (challenge.isExpired(LocalDateTime.now())) {
                delete(challengeId);
                return Optional.empty();
            }
            return Optional.of(challenge);
        } catch (JsonProcessingException exception) {
            delete(challengeId);
            return Optional.empty();
        }
    }

    @Override
    public void delete(String challengeId) {
        stringRedisTemplate.delete(buildKey(challengeId));
    }

    private String buildKey(String challengeId) {
        return KEY_PREFIX + challengeId;
    }
}
