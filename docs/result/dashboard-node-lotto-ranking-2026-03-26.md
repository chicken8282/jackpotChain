# dashboard-node-lotto-ranking 결과

> 작성일: 2026-03-26

---

## Overview

대시보드 UI 개선과 로또 랭킹 실시간 표시 기능을 구현했다.

1. **BlockHeight 과거 블록 번호 동적화**: 하드코딩된 stackLayers를 `currentHeight` 기반 동적 생성으로 전환. 현재 높이가 1030이면 `[1025, 1026, 1027, 1028, 1029, 1030]`이 표시됨.
2. **NodeNetwork 링크 구조 변경**: center → 모든 peripheral 연결(hub-spoke) 구조에서 center → 최대 3개 노드 + 인접 ring 연결(mesh) 구조로 변경. P2P 네트워크 특성에 맞는 시각적 표현.
3. **로또 당첨자 Top 3 랭킹 실시간 표시**: `lotto_ranking` 테이블에 claim 완료 시마다 top 3를 갱신하고, 전용 API(`GET /v1/lotto/ranking`)와 FE polling hook으로 실시간 반영.

---

## Changed Files

| 파일 | 변경 이유 |
|------|----------|
| `FE-ssatto/src/components/dashboard/BlockHeight.tsx` | stackLayers useMemo 동적 생성 |
| `FE-ssatto/src/components/dashboard/NodeNetwork.tsx` | links 로직: hub-spoke → ring+center(3개) |
| `BE-ssatto/.../repository/LottoRankingRepository.java` | `@Modifying DELETE` + `findAllByOrderByRankAsc()` 추가 |
| `BE-ssatto/.../repository/LottoEntryRepository.java` | `findTop3ByStatus...OrderByRewardJackDesc()` 추가 |
| `BE-ssatto/.../dto/LottoRankingResponse.java` | 신규 DTO (rank, walletAddress, rewardJack, matchCount, claimedAt) |
| `BE-ssatto/.../service/LottoRankingService.java` | 신규 서비스: refreshTopRankings + getTopRankings |
| `BE-ssatto/.../service/BlockchainReadModelSyncService.java` | syncToTip에 lottoRankingService.refreshTopRankings() 호출 추가 |
| `BE-ssatto/.../controller/LottoController.java` | `GET /v1/lotto/ranking` 엔드포인트 추가 |
| `BE-ssatto/.../config/SecurityConfig.java` | `/v1/lotto/ranking` permitAll 추가 |
| `FE-ssatto/src/services/lottoService.ts` | `LottoRankingItem` 인터페이스 + `getLottoRanking()` 추가 |
| `FE-ssatto/src/hooks/useLottoRanking.ts` | 신규 polling hook (10s interval) |
| `FE-ssatto/src/components/lotto/LottoTierRanking.tsx` | props `winners: LottoRankingItem[]`로 변경, 실제 당첨자 표시 |
| `FE-ssatto/src/pages/LottoPage.tsx` | `useLottoRanking` 연결, `LottoTierRanking`에 `winners` 전달 |

---

## Tests Run

docker-compose.local.yml 기반 통합 테스트 미실행 (로컬 Docker 환경 확인 필요).

---

## Failed / Unresolved

- **BE 컴파일 확인 필요**: `BlockchainReadModelSyncService`에 `LottoRankingService` 주입 시 순환 의존성 없음을 코드 레벨에서 확인했으나, 빌드 실행 전까지 최종 확인 불가.
- **@Modifying + 동일 트랜잭션 내 save()**: `clearAutomatically = true` 설정으로 PC 충돌을 방지했으나, syncToTip의 REQUIRES_NEW 트랜잭션 내에서 정상 동작하는지 실행 테스트 필요.
- **LottoController의 `@RequiredArgsConstructor`**: `lottoRankingService` 필드를 추가했으므로 Lombok이 자동으로 생성자에 포함시킴. 기존 `lottoService` 단일 주입 방식과 호환됨.

---

## Next Steps

1. `docker-compose.local.yml`로 스택 기동 후 BE 빌드 및 startup 정상 확인
2. 로또 Commit → 결과 대기 → Claim 시나리오 실행 후 `/v1/lotto/ranking` 응답 확인
3. FE 로또 페이지에서 Tier 컴포넌트 실시간 갱신 확인 (10초 polling)
4. BlockHeight 컴포넌트가 실시간 높이 반영 후 `#(N-1)` 레이블 표시 확인
5. NodeNetwork 7~10개 노드 상황에서 링크가 올바르게 렌더링되는지 확인
