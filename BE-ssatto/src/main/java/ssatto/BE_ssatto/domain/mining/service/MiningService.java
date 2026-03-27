package ssatto.BE_ssatto.domain.mining.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import ssatto.BE_ssatto.domain.auth.exception.AuthForbiddenException;
import ssatto.BE_ssatto.domain.auth.util.WalletAuthCrypto;
import ssatto.BE_ssatto.domain.blockchain.entity.Block;
import ssatto.BE_ssatto.domain.blockchain.repository.BlockRepository;
import ssatto.BE_ssatto.domain.mining.dto.MiningBlockCursorResponse;
import ssatto.BE_ssatto.domain.mining.dto.MiningBlockItemResponse;
import ssatto.BE_ssatto.domain.mining.exception.InvalidMiningRequestException;

import java.util.List;

/**
 * 주소별 채굴 블록 read-model 조회를 담당한다.
 */
@Service
@RequiredArgsConstructor
public class MiningService {

    private final BlockRepository blockRepository;
    private final WalletAuthCrypto walletAuthCrypto;

    /**
     * 인증 지갑 주체와 요청 지갑 주소를 함께 검증한 뒤 채굴 블록 내역을 조회한다.
     *
     * @param authenticatedWalletAddress 인증된 지갑 주소
     * @param address 요청 지갑 주소
     * @param lastBlockId 마지막 블록 ID 커서
     * @param size 조회 개수
     * @return 채굴 블록 커서 응답
     */
    @Transactional(readOnly = true)
    public MiningBlockCursorResponse getMinedBlocks(
        String authenticatedWalletAddress,
        String address,
        Long lastBlockId,
        int size
    ) {
        validateAddress(address);
        validateWalletSubject(authenticatedWalletAddress, address);
        validateSize(size);
        validateCursor(lastBlockId);

        PageRequest pageRequest = PageRequest.of(0, size);
        Page<Block> page = lastBlockId == null
            ? blockRepository.findByMinerAddressAndIsMainChainTrueOrderByIdDesc(address, pageRequest)
            : blockRepository.findByMinerAddressAndIsMainChainTrueAndIdLessThanOrderByIdDesc(address, lastBlockId, pageRequest);

        List<MiningBlockItemResponse> blocks = page.getContent().stream()
            .map(this::toItem)
            .toList();
        Long nextCursor = page.hasNext() && !blocks.isEmpty()
            ? blocks.getLast().blockId()
            : null;
        Long totalRewardJack = blockRepository.sumRewardJackByMinerAddressAndIsMainChainTrue(address);

        return new MiningBlockCursorResponse(page.hasNext(), nextCursor, totalRewardJack, blocks);
    }

    private MiningBlockItemResponse toItem(Block block) {
        return new MiningBlockItemResponse(
            block.getId(),
            block.getHeight(),
            block.getHash(),
            block.getRewardJack(),
            block.getTxCount(),
            block.getMinedAt()
        );
    }

    private void validateAddress(String address) {
        if (!StringUtils.hasText(address) || !walletAuthCrypto.isValidAddress(address)) {
            throw new InvalidMiningRequestException();
        }
    }

    private void validateWalletSubject(String authenticatedWalletAddress, String address) {
        if (!StringUtils.hasText(authenticatedWalletAddress) || !authenticatedWalletAddress.equals(address)) {
            throw new AuthForbiddenException();
        }
    }

    private void validateSize(int size) {
        if (size < 1 || size > 100) {
            throw new InvalidMiningRequestException();
        }
    }

    private void validateCursor(Long lastBlockId) {
        if (lastBlockId != null && lastBlockId < 1) {
            throw new InvalidMiningRequestException();
        }
    }
}
