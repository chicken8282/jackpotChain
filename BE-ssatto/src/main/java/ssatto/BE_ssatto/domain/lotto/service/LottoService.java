package ssatto.BE_ssatto.domain.lotto.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainBalances;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainJackpotPool;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainLottoInfo;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainLottoResult;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainRpcClient;
import ssatto.BE_ssatto.domain.lotto.dto.LottoCommitRequest;
import ssatto.BE_ssatto.domain.lotto.dto.LottoEntriesResponse;
import ssatto.BE_ssatto.domain.lotto.dto.LottoEntrySummaryResponse;
import ssatto.BE_ssatto.domain.lotto.dto.LottoOverviewResponse;
import ssatto.BE_ssatto.domain.lotto.dto.LottoResultResponse;
import ssatto.BE_ssatto.domain.lotto.entity.LottoEntry;
import ssatto.BE_ssatto.domain.lotto.entity.LottoEntryStatus;
import ssatto.BE_ssatto.domain.lotto.repository.LottoEntryRepository;
import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;

import java.util.Arrays;
import java.util.List;

/**
 * 로또 direct-pull 조회와 제출을 담당하는 서비스다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LottoService {

    private final JackpotChainRpcClient jackpotChainRpcClient;
    private final LottoEntryRepository lottoEntryRepository;

    /**
     * 로또 페이지 통합 정보를 조회한다.
     *
     * @param address 지갑 주소
     * @return 로또 통합 응답
     */
    @Transactional(readOnly = true)
    public LottoOverviewResponse getOverview(String address) {
        validateAddress(address);

        JackpotChainBalances balances = jackpotChainRpcClient.getBalances(address);
        JackpotChainJackpotPool jackpotPool = jackpotChainRpcClient.getJackpotPool();
        JackpotChainLottoInfo lottoInfo = jackpotChainRpcClient.getLottoInfo();

        return new LottoOverviewResponse(
            balances.jackSatoshi(),
            balances.potSatoshi(),
            jackpotPool.balanceSatoshi(),
            lottoInfo.totalEntries(),
            lottoInfo.payoutCount(),
            List.of()
        );
    }

    /**
     * 서명된 로또 참여 트랜잭션을 제출한다.
     *
     * @param request 로또 참여 요청
     * @return 제출된 트랜잭션 해시
     */
    public String commit(LottoCommitRequest request) {
        validateCommitRequest(request);
        String txId = jackpotChainRpcClient.sendRawTransaction(request.signedTxHex());
        log.info("LOTTO_COMMIT_SUBMITTED txId={} address={}", txId, request.fromAddress());
        return txId;
    }

    /**
     * 로또 커밋 결과를 조회한다.
     *
     * @param commitHash 커밋 해시
     * @return 로또 결과 응답
     */
    @Transactional(readOnly = true)
    public LottoResultResponse getResult(String commitHash) {
        if (!StringUtils.hasText(commitHash)) {
            throw new BusinessException(ErrorCode.COMMON_INVALID_REQUEST);
        }

        JackpotChainLottoResult result = jackpotChainRpcClient.checkLottoResult(commitHash);
        String status = mapStatus(result);

        return new LottoResultResponse(
            commitHash,
            result.chosenNumbers(),
            result.resultNumbers().isEmpty() ? null : result.resultNumbers(),
            result.matches(),
            false,
            status,
            resolveRewardJack(status, result)
        );
    }

    /**
     * 특정 지갑의 로또 참여 내역을 조회한다.
     *
     * @param address 지갑 주소
     * @param status 상태 필터
     * @return 로또 참여 내역 응답
     */
    @Transactional(readOnly = true)
    public LottoEntriesResponse getEntries(String address, String status) {
        validateAddress(address);

        LottoEntryStatus entryStatus = parseEntryStatus(status);
        List<LottoEntry> entries = entryStatus == null
            ? lottoEntryRepository.findByWalletAddressOrderByCreatedAtDesc(address)
            : lottoEntryRepository.findByWalletAddressAndStatusOrderByCreatedAtDesc(address, entryStatus);
        Long currentHeight = jackpotChainRpcClient.getBlockCount();

        return new LottoEntriesResponse(entries.stream()
            .map(entry -> toEntrySummary(entry, currentHeight))
            .toList());
    }

    private void validateCommitRequest(LottoCommitRequest request) {
        validateAddress(request.fromAddress());

        if (!StringUtils.hasText(request.signedTxHex())) {
            throw new BusinessException(ErrorCode.COMMON_INVALID_REQUEST);
        }

        if (request.chosenNumbers() == null || request.chosenNumbers().size() != 6) {
            throw new BusinessException(ErrorCode.LOTTO_INVALID_NUMBERS);
        }

        boolean invalidNumberExists = request.chosenNumbers().stream()
            .anyMatch(number -> number == null || number < 0 || number > 15);
        if (invalidNumberExists) {
            throw new BusinessException(ErrorCode.LOTTO_INVALID_NUMBERS);
        }
    }

    private void validateAddress(String address) {
        if (!StringUtils.hasText(address)) {
            throw new BusinessException(ErrorCode.COMMON_INVALID_REQUEST);
        }
    }

    private String mapStatus(JackpotChainLottoResult result) {
        if (!result.success() || "pending".equalsIgnoreCase(result.status())) {
            return "DRAWING";
        }
        if (result.matches() != null && result.matches() > 0) {
            return "WINNING";
        }
        return "LOSING";
    }

    private Long resolveRewardJack(String status, JackpotChainLottoResult result) {
        if (!"WINNING".equals(status)) {
            return null;
        }
        if (result.matches() != null && result.matches() == 1) {
            return null;
        }
        return result.payoutJack();
    }

    private LottoEntrySummaryResponse toEntrySummary(LottoEntry entry, Long currentHeight) {
        boolean isClaimed = entry.getClaimTransaction() != null || entry.getClaimedAt() != null;
        boolean isClaimable = entry.getStatus() == LottoEntryStatus.WINNING
            && !isClaimed
            && currentHeight >= entry.getClaimableFromHeight()
            && currentHeight <= entry.getClaimableUntilHeight();

        return new LottoEntrySummaryResponse(
            entry.getId(),
            entry.getCommitHash(),
            parseNumbers(entry.getChosenNumbers()),
            entry.getStatus().name(),
            entry.getMatchCount(),
            entry.getRewardJack(),
            isClaimed,
            isClaimable,
            entry.getCreatedAt()
        );
    }

    private List<Integer> parseNumbers(String value) {
        if (!StringUtils.hasText(value)) {
            return List.of();
        }

        try {
            return Arrays.stream(value.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .map(Integer::valueOf)
                .toList();
        } catch (NumberFormatException exception) {
            throw new BusinessException(ErrorCode.COMMON_INTERNAL_SERVER_ERROR);
        }
    }

    private LottoEntryStatus parseEntryStatus(String status) {
        if (!StringUtils.hasText(status) || "ALL".equalsIgnoreCase(status)) {
            return null;
        }

        try {
            return LottoEntryStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new BusinessException(ErrorCode.COMMON_INVALID_REQUEST);
        }
    }
}
