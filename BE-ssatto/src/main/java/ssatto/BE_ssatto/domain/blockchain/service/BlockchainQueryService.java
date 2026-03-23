package ssatto.BE_ssatto.domain.blockchain.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import ssatto.BE_ssatto.domain.blockchain.dto.BlockchainBlockDetailResponse;
import ssatto.BE_ssatto.domain.blockchain.dto.BlockchainDashboardBlockResponse;
import ssatto.BE_ssatto.domain.blockchain.dto.BlockchainDashboardResponse;
import ssatto.BE_ssatto.domain.blockchain.dto.MempoolTransactionResponse;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainBlock;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainBlockchainInfo;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainPeerInfo;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainRpcClient;
import ssatto.BE_ssatto.domain.blockchain.rpc.MempoolTransactionEntry;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Map;
import java.util.List;

/**
 * 블록체인 조회용 REST 응답을 JackpotChain RPC 응답으로 조합한다.
 */
@Service
@RequiredArgsConstructor
public class BlockchainQueryService {

    private static final int DEFAULT_LIMIT = 10;

    private final JackpotChainRpcClient jackpotChainRpcClient;

    /**
     * 대시보드 조회 응답을 조합한다.
     *
     * @param limit 최근 블록 조회 개수
     * @return 대시보드 응답
     */
    public BlockchainDashboardResponse getDashboard(int limit) {
        JackpotChainBlockchainInfo blockchainInfo = jackpotChainRpcClient.getBlockchainInfo();
        List<JackpotChainPeerInfo> peerInfos = jackpotChainRpcClient.getPeerInfo();
        int mempoolTransactionCount = jackpotChainRpcClient.getMempoolTransactionCount();
        List<BlockchainDashboardBlockResponse> blocks = getRecentBlocks(blockchainInfo.blocks(), limit);

        return new BlockchainDashboardResponse(
            true,
            blockchainInfo.blocks(),
            blockchainInfo.bestBlockHash(),
            blockchainInfo.difficulty(),
            null,
            peerInfos.size(),
            mempoolTransactionCount,
            blocks,
            mapPeerIndexes(peerInfos)
        );
    }

    /**
     * 지정한 높이의 블록 상세 응답을 조합한다.
     *
     * @param height 블록 높이
     * @return 블록 상세 응답
     */
    public BlockchainBlockDetailResponse getBlockDetail(long height) {
        String blockHash = jackpotChainRpcClient.getBlockHash(height);
        JackpotChainBlock block = jackpotChainRpcClient.getBlock(blockHash);

        int miningElapsed = 0;
        if (block.height() > 0 && block.previousBlockHash() != null && !block.previousBlockHash().isBlank()) {
            JackpotChainBlock previousBlock = jackpotChainRpcClient.getBlock(block.previousBlockHash());
            miningElapsed = (int) Math.max(0, block.timestamp() - previousBlock.timestamp());
        }

        return new BlockchainBlockDetailResponse(
            block.height(),
            block.hash(),
            block.rewardJack(),
            block.feeRewardJack(),
            block.transactionCount(),
            block.confirmations(),
            toLocalDateTime(block.timestamp()),
            miningElapsed,
            block.versionHex(),
            block.previousBlockHash(),
            block.nonce(),
            block.difficultyDisplay(),
            block.minerAddress(),
            block.mainChain(),
            block.merkleRoot(),
            calculateJackpotContribution(block.feeRewardJack())
        );
    }

    private List<BlockchainDashboardBlockResponse> getRecentBlocks(long currentHeight, int limit) {
        int resolvedLimit = limit > 0 ? limit : DEFAULT_LIMIT;
        long startHeight = Math.max(0, currentHeight - resolvedLimit + 1);
        List<BlockchainDashboardBlockResponse> blocks = new ArrayList<>();

        for (long height = currentHeight; height >= startHeight; height--) {
            String blockHash = jackpotChainRpcClient.getBlockHash(height);
            JackpotChainBlock block = jackpotChainRpcClient.getBlock(blockHash);
            blocks.add(new BlockchainDashboardBlockResponse(
                block.height(),
                block.hash(),
                block.transactionCount(),
                toLocalDateTime(block.timestamp()),
                block.minerAddress(),
                block.rewardJack(),
                block.confirmations(),
                calculateJackpotContribution(block.feeRewardJack())
            ));
        }

        return blocks;
    }

    private List<Integer> mapPeerIndexes(List<JackpotChainPeerInfo> peerInfos) {
        List<Integer> nodes = new ArrayList<>();
        for (int index = 0; index < peerInfos.size(); index++) {
            nodes.add(index + 1);
        }
        return nodes;
    }

    /**
     * 멤풀 트랜잭션 상세 목록을 조회한다.
     *
     * @return 멤풀 트랜잭션 목록
     */
    public List<MempoolTransactionResponse> getMempoolTransactions() {
        Map<String, MempoolTransactionEntry> rawMempool = jackpotChainRpcClient.getRawMempool();
        List<MempoolTransactionResponse> transactions = new ArrayList<>();

        for (Map.Entry<String, MempoolTransactionEntry> entry : rawMempool.entrySet()) {
            MempoolTransactionEntry tx = entry.getValue();
            transactions.add(new MempoolTransactionResponse(
                entry.getKey(),
                tx.fee(),
                tx.size(),
                tx.time()
            ));
        }

        return transactions;
    }

    private long calculateJackpotContribution(long feeRewardJack) {
        return feeRewardJack * 30 / 100;
    }

    private LocalDateTime toLocalDateTime(long epochSeconds) {
        return LocalDateTime.ofInstant(Instant.ofEpochSecond(epochSeconds), ZoneOffset.UTC);
    }
}
