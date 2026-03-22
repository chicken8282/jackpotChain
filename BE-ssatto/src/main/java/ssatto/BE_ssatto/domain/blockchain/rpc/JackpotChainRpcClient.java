package ssatto.BE_ssatto.domain.blockchain.rpc;

import java.util.List;

/**
 * JackpotChain 서버 노드 JSON-RPC 호출을 추상화한다.
 */
public interface JackpotChainRpcClient {

    /**
     * 노드가 보유한 현재 블록 높이를 조회한다.
     *
     * @return 현재 블록 높이
     */
    long getBlockCount();

    /**
     * 노드의 체인 요약 정보를 조회한다.
     *
     * @return 체인 요약 정보
     */
    JackpotChainBlockchainInfo getBlockchainInfo();

    /**
     * 주소 기준 JACK/POT 잔액을 조회한다.
     *
     * @param address 지갑 주소
     * @return 잔액 정보
     */
    JackpotChainBalances getBalances(String address);

    /**
     * 주소 기준 UTXO 목록을 조회한다.
     *
     * @param address 지갑 주소
     * @return UTXO 목록
     */
    List<JackpotChainUnspentOutput> listUnspent(String address);

    /**
     * 잭팟 풀 기준 UTXO 목록을 조회한다.
     *
     * @return 잭팟 풀 UTXO 목록
     */
    List<JackpotChainPoolUnspentOutput> listPoolUnspent();

    /**
     * 특정 높이의 블록 해시를 조회한다.
     *
     * @param height 블록 높이
     * @return 블록 해시
     */
    String getBlockHash(long height);

    /**
     * 블록 해시 기준으로 단일 블록 상세 정보를 조회한다.
     *
     * @param blockHash 블록 해시
     * @return 블록 상세 정보
     */
    JackpotChainBlock getBlock(String blockHash);

    /**
     * 블록 해시 기준으로 인덱싱용 상세 블록 정보를 조회한다.
     *
     * @param blockHash 블록 해시
     * @return 상세 블록 정보
     */
    JackpotChainIndexedBlock getIndexedBlock(String blockHash);

    /**
     * 로또 개요 정보를 조회한다.
     *
     * @return 로또 개요 정보
     */
    JackpotChainLottoInfo getLottoInfo();

    /**
     * 잭팟 풀 상태를 조회한다.
     *
     * @return 잭팟 풀 상태
     */
    JackpotChainJackpotPool getJackpotPool();

    /**
     * 노드가 연결한 피어 정보를 조회한다.
     *
     * @return 피어 목록
     */
    List<JackpotChainPeerInfo> getPeerInfo();

    /**
     * 노드 mempool에 적재된 트랜잭션 수를 조회한다.
     *
     * @return mempool 트랜잭션 수
     */
    int getMempoolTransactionCount();

    /**
     * 로또 결과를 조회한다.
     *
     * @param commitHash 커밋 트랜잭션 해시
     * @return 로또 결과
     */
    JackpotChainLottoResult checkLottoResult(String commitHash);

    /**
     * 교환 규칙을 조회한다.
     *
     * @return 교환 정보
     */
    JackpotChainExchangeInfo getExchangeInfo();

    /**
     * 신규 지갑 onboarding 용 1 POT 지급을 수행한다.
     *
     * @param address 지급 대상 지갑 주소
     * @return 지급 결과
     */
    JackpotChainOnboardingReward grantOnboardingPotReward(String address);

    /**
     * 서명된 원시 트랜잭션을 체인 노드에 제출한다.
     *
     * @param signedTxHex 서명된 트랜잭션 hex
     * @return 노드가 반환한 txId
     */
    String sendRawTransaction(String signedTxHex);
}
