# Plan: WLT-02 — GET /wallet 404 전파 차단 / 미등록 지갑 graceful 처리

> 작성일: 2026-03-24

---

## 원인

`WalletService.getWallets()` → `loadWalletSummary()` 흐름에서 문제가 발생한다.

```java
// 현재 코드 (문제)
private WalletSummaryResponse loadWalletSummary(String address) {
    Wallet wallet = walletRepository.findByAddress(address)
        .orElseThrow(WalletNotFoundException::new); // DB에 없으면 예외 발생
    ...
}

// getWallets()는 이를 stream().map()으로 순회
List<WalletSummaryResponse> wallets = addresses.stream()
    .map(this::loadWalletSummary) // 하나라도 없으면 전체 404
    .toList();
```

`WalletNotFoundException`은 `BusinessException`을 상속하며 `ErrorCode.WALLET_NOT_FOUND`를 사용한다.
`GlobalExceptionHandler`가 이를 404로 매핑한다.
결과적으로 주소 목록 중 하나라도 DB에 없으면 **전체 요청이 404**가 된다.

---

## 영향 레이어

| 레이어 | 영향 |
|--------|------|
| BE — WalletService | `getWallets()` → all-or-nothing 동작. 수정 필요 |
| BE — WalletController | 변경 없음 (응답 형식 동일) |
| FE — useWalletSummaries | polling 훅. BE가 200을 반환하면 정상 동작. 수정 불필요 |
| FE — WalletPage | `summary?.jackBalance ?? 0` 방어 코드 존재. 수정 불필요 |

---

## 변경 범위

### BE (필수)

파일: `BE-ssatto/src/main/java/ssatto/BE_ssatto/domain/wallet/service/WalletService.java`

`getWallets()` 내부에서 `loadWalletSummary()` 대신 `Optional.stream()` flatMap 패턴 적용:

```java
@Transactional(readOnly = true)
public WalletListResponse getWallets(String addressesQuery) {
    List<String> addresses = parseAddresses(addressesQuery);
    List<WalletSummaryResponse> wallets = addresses.stream()
        .flatMap(addr -> walletRepository.findByAddress(addr).stream())
        .map(wallet -> {
            JackpotChainBalances balances = jackpotChainRpcClient.getBalances(wallet.getAddress());
            return new WalletSummaryResponse(
                wallet.getAddress(),
                wallet.getNickname(),
                wallet.getWalletColor(),
                balances.jackSatoshi(),
                balances.potSatoshi(),
                wallet.getCreatedAt()
            );
        })
        .toList();
    return new WalletListResponse(wallets);
}
```

- `findByAddress()` 가 `Optional.empty()`를 반환하면 `.stream()`이 빈 스트림이 되어 자연스럽게 제외된다.
- 조회된 주소가 0개여도 `WalletListResponse(emptyList)` → 200 + `{"wallets": []}`
- `WalletListResponse` 형식 변경 없음
- `loadWalletSummary()` private 메서드는 더 이상 `getWallets()`에서 호출되지 않으므로 제거한다.

### FE (변경 불필요)

`WalletPage.tsx` 249–266행:
```ts
const summary = walletSummaries.find((item) => item.address === wallet.address);
return {
  jackBalance: Math.floor((summary?.jackBalance ?? 0) / 100_000_000),
  potBalance: Math.floor((summary?.potBalance ?? 0) / 100_000_000),
};
```

BE가 미등록 주소를 응답에서 제외하면 `summary`가 `undefined`가 되고, `?? 0` fallback이 적용된다.
UI는 잔액 0으로 표시되며 렌더링이 깨지지 않는다. **FE 코드 변경 불필요.**

---

## 실패 가능 지점

| 지점 | 위험도 | 설명 |
|------|--------|------|
| `loadWalletSummary` 제거 후 컴파일 오류 | 낮음 | private 메서드라 외부 참조 없음. 제거 안전. |
| 빈 목록 반환 시 FE 렌더링 | 낮음 | `allWallets`가 빈 배열이 돼도 WalletPage는 `wallets.length === 0` 분기를 탄다. 단, `wallets`는 store 기준이라 빈 배열이 되지 않는다. 실제론 `walletSummaries`만 비어 있고, `allWallets`는 store 기반으로 생성되어 잔액 0으로 표시된다. |
| `jackpotChainRpcClient.getBalances()` 실패 | 중간 | 미등록 주소에 대한 RPC 호출은 발생하지 않으므로 범위 외. 등록된 주소의 RPC 실패는 기존과 동일하게 처리된다. |
