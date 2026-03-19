package ssatto.BE_ssatto.domain.wallet.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainBalances;
import ssatto.BE_ssatto.domain.blockchain.rpc.JackpotChainRpcClient;
import ssatto.BE_ssatto.domain.wallet.dto.CreateWalletRequest;
import ssatto.BE_ssatto.domain.wallet.dto.CreateWalletResponse;
import ssatto.BE_ssatto.domain.wallet.dto.WalletActivityCursorResponse;
import ssatto.BE_ssatto.domain.wallet.dto.WalletActivityItemResponse;
import ssatto.BE_ssatto.domain.wallet.dto.WalletListResponse;
import ssatto.BE_ssatto.domain.wallet.dto.WalletSummaryResponse;
import ssatto.BE_ssatto.domain.wallet.entity.WalletActivity;
import ssatto.BE_ssatto.domain.wallet.entity.WalletActivityType;
import ssatto.BE_ssatto.domain.wallet.entity.Wallet;
import ssatto.BE_ssatto.domain.wallet.repository.WalletActivityRepository;
import ssatto.BE_ssatto.domain.wallet.repository.WalletRepository;
import ssatto.BE_ssatto.global.exception.BusinessException;
import ssatto.BE_ssatto.global.exception.ErrorCode;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

/**
 * 지갑 메타데이터 저장과 on-chain 잔액 조회를 조합하는 서비스다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WalletService {

    private final WalletRepository walletRepository;
    private final WalletActivityRepository walletActivityRepository;
    private final JackpotChainRpcClient jackpotChainRpcClient;

    /**
     * 지갑 메타데이터를 저장한다.
     *
     * @param request 지갑 등록 요청
     * @return 저장된 지갑 정보
     */
    @Transactional
    public CreateWalletResponse createWallet(CreateWalletRequest request) {
        validateAddress(request.address());

        if (walletRepository.findByAddress(request.address()).isPresent()) {
            throw new BusinessException(ErrorCode.WALLET_ADDRESS_DUPLICATED);
        }

        Wallet wallet = walletRepository.save(Wallet.create(
            request.address(),
            request.nickname(),
            request.walletColor(),
            LocalDateTime.now()
        ));

        log.info("WALLET_REGISTERED address={}", wallet.getAddress());

        return new CreateWalletResponse(
            wallet.getAddress(),
            wallet.getNickname(),
            wallet.getWalletColor(),
            wallet.getCreatedAt()
        );
    }

    /**
     * 지갑 메타데이터와 on-chain 잔액을 조합해 반환한다.
     *
     * @param addressesQuery 쉼표 구분 지갑 주소 목록
     * @return 지갑 목록 응답
     */
    @Transactional(readOnly = true)
    public WalletListResponse getWallets(String addressesQuery) {
        List<String> addresses = parseAddresses(addressesQuery);
        List<WalletSummaryResponse> wallets = addresses.stream()
            .map(this::loadWalletSummary)
            .toList();

        return new WalletListResponse(wallets);
    }

    /**
     * 특정 지갑의 활동 내역을 커서 기준으로 조회한다.
     *
     * @param address 지갑 주소
     * @param cursor 마지막으로 읽은 활동 ID
     * @param size 조회 개수
     * @param type 활동 타입
     * @return 활동 커서 페이지 응답
     */
    @Transactional(readOnly = true)
    public WalletActivityCursorResponse getActivities(String address, Long cursor, int size, String type) {
        validateAddress(address);
        validatePageSize(size);
        walletRepository.findByAddress(address)
            .orElseThrow(() -> new BusinessException(ErrorCode.WALLET_NOT_FOUND));

        WalletActivityType activityType = parseActivityType(type);
        PageRequest pageRequest = PageRequest.of(0, size);
        Page<WalletActivity> page = loadActivities(address, cursor, pageRequest, activityType);
        List<WalletActivityItemResponse> activities = page.getContent().stream()
            .map(this::toActivityItem)
            .toList();
        Long nextCursor = page.hasNext() && !activities.isEmpty()
            ? activities.getLast().activityId()
            : null;

        return new WalletActivityCursorResponse(page.hasNext(), nextCursor, activities);
    }

    private WalletSummaryResponse loadWalletSummary(String address) {
        Wallet wallet = walletRepository.findByAddress(address)
            .orElseThrow(() -> new BusinessException(ErrorCode.WALLET_NOT_FOUND));
        JackpotChainBalances balances = jackpotChainRpcClient.getBalances(address);

        return new WalletSummaryResponse(
            wallet.getAddress(),
            wallet.getNickname(),
            wallet.getWalletColor(),
            balances.jackSatoshi(),
            balances.potSatoshi(),
            wallet.getCreatedAt()
        );
    }

    private List<String> parseAddresses(String addressesQuery) {
        if (!StringUtils.hasText(addressesQuery)) {
            throw new BusinessException(ErrorCode.COMMON_INVALID_REQUEST);
        }

        List<String> addresses = Arrays.stream(addressesQuery.split(","))
            .map(String::trim)
            .filter(StringUtils::hasText)
            .distinct()
            .toList();

        if (addresses.isEmpty()) {
            throw new BusinessException(ErrorCode.COMMON_INVALID_REQUEST);
        }

        return addresses;
    }

    private Page<WalletActivity> loadActivities(
        String address,
        Long cursor,
        PageRequest pageRequest,
        WalletActivityType activityType
    ) {
        if (cursor == null) {
            return activityType == null
                ? walletActivityRepository.findByWalletAddressOrderByCreatedAtDesc(address, pageRequest)
                : walletActivityRepository.findByWalletAddressAndTypeOrderByCreatedAtDesc(address, activityType, pageRequest);
        }

        return activityType == null
            ? walletActivityRepository.findByWalletAddressAndIdLessThanOrderByCreatedAtDesc(address, cursor, pageRequest)
            : walletActivityRepository.findByWalletAddressAndTypeAndIdLessThanOrderByCreatedAtDesc(
                address,
                activityType,
                cursor,
                pageRequest
            );
    }

    private WalletActivityItemResponse toActivityItem(WalletActivity activity) {
        return new WalletActivityItemResponse(
            activity.getId(),
            activity.getType().name(),
            activity.getDescription(),
            activity.getTransaction() == null ? null : activity.getTransaction().getTxId(),
            activity.getCreatedAt()
        );
    }

    private WalletActivityType parseActivityType(String type) {
        if (!StringUtils.hasText(type) || "ALL".equalsIgnoreCase(type)) {
            return null;
        }

        try {
            return WalletActivityType.valueOf(type.trim().toUpperCase());
        } catch (IllegalArgumentException exception) {
            throw new BusinessException(ErrorCode.COMMON_INVALID_REQUEST);
        }
    }

    private void validateAddress(String address) {
        if (!StringUtils.hasText(address)) {
            throw new BusinessException(ErrorCode.COMMON_INVALID_REQUEST);
        }
    }

    private void validatePageSize(int size) {
        if (size < 1 || size > 100) {
            throw new BusinessException(ErrorCode.COMMON_INVALID_REQUEST);
        }
    }
}
