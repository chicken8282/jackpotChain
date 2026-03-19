package ssatto.BE_ssatto.global.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * JackpotChain RPC 설정 프로퍼티를 스프링 컨텍스트에 등록한다.
 */
@Configuration
@EnableConfigurationProperties(JackpotChainRpcProperties.class)
public class JackpotChainRpcConfig {
}
