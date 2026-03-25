# 계획: 대시보드·노드·로또 랭킹 개선

> 작성일: 2026-03-26

---

## 1. 영향 레이어 정리

| 작업 | 영향 레이어 |
|------|------------|
| BlockHeight 과거 블록 번호 동적화 | FE: `components/dashboard/BlockHeight.tsx` |
| NodeNetwork 근처 노드 선 연결 | FE: `components/dashboard/NodeNetwork.tsx` |
| 로또 랭킹 BE API | BE: entity/repository/service/controller/security |
| 로또 랭킹 FE 표시 | FE: service/hook/component/page |

---

## 2. 모호한 점 & 가정

- BlockHeight: `stackLayers`가 하드코딩되어 있어 실시간 높이와 괴리. 상위 6개 레이어를 `currentHeight-5 ~ currentHeight` 동적 생성으로 전환.
- NodeNetwork: 현재 모든 peripheral → center(hub-spoke) + ring 존재. 유저는 "근처 노드 간 연결"을 원함 → center를 3개 노드에만 연결, ring 유지.
- 로또 랭킹: `lotto_ranking` 테이블·엔티티 이미 존재하나 쓰기 로직 없음. `syncToTip()` 끝에 refreshRankings() 호출하여 claimed WINNING 엔트리 top 3 기록.
- 랭킹 API는 인증 불필요 (공개 정보).

---

## 3. 변경 범위

### FE

1. `BlockHeight.tsx` — `stackLayers` useMemo로 동적 생성
2. `NodeNetwork.tsx` — links: ring 유지 + center→3개 노드만
3. `lottoService.ts` — `LottoRankingItem` interface + `getLottoRanking()` 추가
4. `useLottoRanking.ts` — 신규 polling hook (10s, 인증 불필요)
5. `LottoTierRanking.tsx` — props를 `winners: LottoWinner[]`로 변경, 실제 당첨자 표시
6. `LottoPage.tsx` — `useLottoRanking` 사용, LottoTierRanking에 전달

### BE

1. `LottoEntryRepository.java` — top3 winners 쿼리 추가
2. `LottoRankingRepository.java` — `@Modifying DELETE` + `findAllByOrderByRankAsc()` 추가
3. `LottoRankingResponse.java` — 신규 DTO
4. `LottoRankingService.java` — 신규 서비스 (`refreshTopRankings`, `getTopRankings`)
5. `BlockchainReadModelSyncService.java` — syncToTip 끝에 rankingService 호출
6. `LottoController.java` — `GET /v1/lotto/ranking` 추가
7. `SecurityConfig.java` — `/v1/lotto/ranking` permitAll 추가

---

## 4. 실패 가능 지점

- `@Modifying DELETE` + `save()` 순서: `clearAutomatically=true` 미설정 시 PC 충돌 가능
- `lotto_ranking.commit_hash` UNIQUE 제약: 동일 entry 재등록 시 삭제 전 삽입되면 위반
- `BlockchainReadModelSyncService` → `LottoRankingService` 주입 시 순환 의존성 없음 확인 (LottoRankingService는 repo만 의존)
- FE: `useLottoRanking` hook은 인증 토큰 불필요 — token 전달 없이 호출
