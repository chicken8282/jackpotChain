# Changelog

All notable changes to JackpotChain will be documented in this file.

Format: [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)

---

## [1.1.0] - 2026-03-27

### Fixed
- HEADERS 동기화 타임아웃 처리 추가 (10초 타임아웃, 최대 2회 재시도 후 INV 모드 전환)
- 고아 블록 수신 시 GETDATA로 이전 블록 역추적 동기화 (전체 헤더 재동기화 대신 직접 요청)
- 리오그 미발동 버그 수정: `is_in_main_chain` → `_block_index` 체크 변경 (사이드체인 블록 허용)

### Changed
- 헤더 동기화 실패 시 자동으로 SYNCED 상태 전환 및 INV 기반 블록 수신 모드 폴백

---

## [1.0.8] - 2026-03-26

### Fixed
- 리오그 미발동 버그 수정: `is_in_main_chain` → `_block_index` 체크 변경 (사이드체인 블록 허용)
- 경쟁 체인 감지 시 자동 GETHEADERS 트리거 추가 (경쟁 블록 전체 동기화)

---

## [1.0.7] - 2026-03-26

### Fixed
- Reorg 시 새 체인 블록이 스토리지에 저장되지 않는 버그 수정 (재시작 시 체인 끊어짐 방지)
- Header-First Sync: VERACK 후 모든 피어에 대해 동기화 체크 (outbound 포함)
- Header-First Sync: 헤더 수신 후 블록 다운로드 전환 안 되는 버그 수정
- FE coinbase 미성숙 UTXO 사용 방지 (confirmations 기반 필터)

### Changed
- 메인넷 전환: 상수 변경 + 리오그 동기화 코드 수정
- P2P 포트 8777, RPC 포트 8776

## [1.0.6] - 2026-03-24

### Added
- 채굴 블록에 지갑 닉네임 기록 (coinbase extra_data)
- Headers-First Sync 적용 (GETBLOCKS IBD 대체)

### Fixed
- IBD 중 다른 피어 INV가 _last_inv_count 덮어쓰는 버그 수정
- Header-First Sync 동기화 버그 수정

## [1.0.5] - 2026-03-22

### Added
- JACK -> POT 교환 시스템 (100 JACK = 1 POT)
- 온체인 로또: Commit-Reveal + 자동 Payout
- 로또 클레임 TX (version 5)
- 잭팟 풀 UTXO 관리

### Changed
- PyInstaller spec 파일 갱신 (신규 모듈 반영)

## [1.0.4] - 2026-03-21

### Added
- 멀티 에셋 지원 (POT 토큰)
- 교환 트랜잭션 (TX version 2)
- 로또 커밋 트랜잭션 (TX version 3)

### Fixed
- 지갑 생성 수정
- docker-compose.local 수정

## [1.0.3] - 2026-03-20

### Added
- Simple TUI (자동 지갑 생성, 노드 자동 시작, 채굴 자동)
- 대시보드 RECENT BLOCKS 섹션 (최근 블록 가로 배치, 로또 숫자 표시)
- History 탭 (Claims 탭 대체, 로컬 저장소 기반 결과 영구 보관)
- 미확인 잔돈 UTXO 지원 (연속 로또 커밋 가능)
- Mempool TX 의존성 체인 해결 (부모->자식 순서 보장)
- 블록 내 TX 체인 검증 (`_BlockTxTracker`)
- Orphan TX 대기열 (부모 TX 도착 시 자동 재시도)
- 피어 끊김 시 3초 후 즉시 재연결

### Fixed
- 로또 자동 지급 N+28로 변경 (N+18 블록 해시 미확정 버그)
- `payout_height` 갱신 (chain.py `_connect_block`에서 payout TX 감지)
- 시드 노드 즉시 연결 (시작 시 30초 대기 제거)
- 피어 높이 실시간 갱신 (블록 수신 시 `update_peer_height`)
- TUI 지갑 선택 시 노드 활성 지갑 동기화 (`setwallet` RPC 호출)
- Simple TUI 방화벽 팝업 차단 해결 (`CREATE_NO_WINDOW` 제거)
- PyInstaller spec 파일 갱신 (history, simple 모듈 추가)

### Changed
- Claim TX 제거 -> 자동 Payout 시스템 (채굴자가 N+28 블록에 자동 포함)
- `LOTTO_PAYOUT_GAP = 28` (18 + 10블록 포크 대비)
- CLI 기본 실행 -> Simple TUI, `tui` 명령 -> 고급 TUI

## [1.0.2] - 2026-03-20

### Fixed
- 500개 블록 동기화 후 멈추는 버그 해결 (watchdog 추가)

### Changed
- P2P 포트 8333 -> 9777, RPC 포트 8332 -> 9776 (Bitcoin/Litecoin 충돌 방지)
- 도메인 jackpotchain.io -> ssatto777.site
- 블록 동기화 High/Low Watermark 방식 적용

## [1.0.1] - 2026-03-18

### Fixed
- TX 전파 버그 수정 (`node.py:_handle_tx` 파라미터 누락)
- 연속 commit UTXO 충돌 방지 (`_reserved_utxos` 추적)

### Added
- TUI Send 버튼 및 송금 패널

## [1.0.0] - 2026-03-17

### Added
- 초기 릴리스
- UTXO 기반 블록체인 (PoW, SHA-256)
- 온체인 로또 시스템 (Commit-Reveal)
- P2P 네트워크 (NAT traversal, 피어 발견)
- TUI 클라이언트
- Windows 인스톨러 (PyInstaller + Inno Setup)
