package ssatto.BE_ssatto.domain.blockchain.scheduler;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import ssatto.BE_ssatto.domain.blockchain.service.BlockchainReadModelSyncService;

/**
 * 블록체인 read-model을 주기적으로 동기화하는 백그라운드 스케줄러다.
 *
 * <p>이전에는 {@code GET /api/v1/wallet/{address}/activities} 호출 시마다
 * {@link BlockchainReadModelSyncService#syncToTip()}이 실행되어 사용자 요청 스레드에서
 * 수백~수천 블록을 한꺼번에 처리하는 문제가 있었다.
 *
 * <p>이 스케줄러가 블록 동기화를 전담함으로써 API 응답 지연을 제거한다.
 */
@Component
@RequiredArgsConstructor
public class BlockchainSyncScheduler {

    private static final Logger log = LoggerFactory.getLogger(BlockchainSyncScheduler.class);

    private final BlockchainReadModelSyncService blockchainReadModelSyncService;

    /**
     * 5초마다 블록체인 read-model을 동기화한다.
     *
     * <p>{@code fixedDelay}를 사용하므로 이전 실행이 완료된 후 5초가 지나야 다음 실행이 시작된다.
     * 이를 통해 동기화 작업이 동시에 중복 실행되는 것을 방지한다.
     *
     * <p>RPC 장애 등 예외가 발생하면 ERROR 로그를 남기고 다음 주기에 재시도한다.
     * 예외를 catch하지 않으면 스케줄러 스레드가 종료되어 이후 동기화가 중단되므로
     * 반드시 try-catch로 보호한다.
     */
    @Scheduled(fixedDelay = 5000)
    public void syncBlockchain() {
        try {
            blockchainReadModelSyncService.syncToTip();
        } catch (Exception e) {
            log.error("[BlockchainSyncScheduler] 블록체인 동기화 중 오류 발생. 다음 주기에 재시도합니다.", e);
        }
    }
}
