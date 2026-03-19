package ssatto.BE_ssatto.domain.blockchain.dto;

import java.util.List;

/**
 * 블록체인 대시보드 통합 조회 응답이다.
 *
 * @param isOn 노드 동작 여부
 * @param height 현재 블록 높이
 * @param bestBlockHash 최신 블록 해시
 * @param difficulty 현재 난이도
 * @param networkHashps 네트워크 해시레이트
 * @param connections 연결 수
 * @param pooledTxCount 멤풀 트랜잭션 수
 * @param blocks 최근 블록 목록
 * @param nodes 연결된 피어 식별자 목록
 */
public record BlockchainDashboardResponse(
    boolean isOn,
    long height,
    String bestBlockHash,
    long difficulty,
    Long networkHashps,
    int connections,
    int pooledTxCount,
    List<BlockchainDashboardBlockResponse> blocks,
    List<Integer> nodes
) {
}
