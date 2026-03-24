# 코드 수정 계획
# FE + JackpotChain 정합화 기준

> 작성 기준일: 2026-03-19
> 기준 소스: `FE-ssatto`, `jackpotchain`
> 목적: 실제 구현 기준으로 수정 범위를 다시 줄이고 우선순위를 명확히 한다.

---

## 1. FE 수정 사항

### 1-1. 핵심 방향

FE는 현재 구조를 유지하되 아래 네 축으로 정리하는 것이 맞다.

1. 서비스 레이어 신설 또는 정비
2. API 타입을 실제 응답 계약에 맞게 재정의
3. 로또 상태값과 응답 필드 정합화
4. 클라이언트 서명/키 저장 전략 확정

### 1-2. 우선 수정 대상

| 우선순위 | 대상 | 수정 항목 |
|:--------:|------|------|
| 🔴 1 | `src/services/*` | BE REST 호출 계층 정리 |
| 🔴 2 | `types/index.ts` | API 응답 타입 재정의 |
| 🔴 3 | 대시보드/지갑/로또 페이지 | mock 데이터 제거, 실제 API 연결 |
| 🟡 4 | 상태 enum | `DRAWING/WINNING/LOSING/EXPIRED` 기준 정리 |
| 🟡 5 | 키 저장소 | IndexedDB 기반 개인키 저장 또는 MVP 대안 확정 |

### 1-3. FE에서 특히 주의할 점

- JackpotChain은 직접 REST를 제공하지 않는다.
- FE는 반드시 BE의 `/api/v1/...` 계층을 통해 접근해야 한다.
- `POST /lotto/claim`는 현재 JackpotChain 실제 계약과 충돌 가능성이 있으므로, FE 구현 전에 BE/체인 정책을 확정해야 한다.

---

## 2. JackpotChain 수정 사항

### 2-1. 재검토 결과 요약

기존 문서의 JackpotChain 분석에는 과거 오판이 섞여 있었다. 이번에 다시 확인한 실제 상태는 아래와 같다.

| 항목 | 실제 상태 | 의미 |
|------|---------|------|
| 패키지 구조 | `jackpotchain/` 단일 루트 패키지 | 과거 분산 구조 가정 제거 |
| 핵심 모듈 | `difficulty.py`, `peer.py`, `standard.py`, `tui/app.py` 등 존재 | "누락 모듈 복구"가 핵심 blocker는 아님 |
| RPC | JSON-RPC 구현 다수 존재 | FE/BE는 이 계약 기준으로 재설계 필요 |
| 로또 | 자동 지급 모델 | `lottoclaim` RPC 없음 |
| Docker 산출물 | `jackpotchain/Dockerfile`, `.dockerignore`, `entrypoint.sh` 없음 | 현재 실제 Docker blocker |

### 2-2. 실제로 먼저 손봐야 하는 항목

#### A. `jackpotchain/cli/main.py`

**문제**

- `node` 서브커맨드가 `--rpc-host`를 받지 않는다.
- `RPCServer`는 기본적으로 `127.0.0.1`에 바인드된다.
- 현재 `docker-compose.local.yml`의 `NODE_RPC_HOST=0.0.0.0`는 실제 실행 로직에 반영되지 않는다.

**수정 방향**

```python
node_parser.add_argument('--rpc-host', default='127.0.0.1', help='RPC host')
```

```python
rpc = RPCServer(
    blockchain=blockchain,
    mempool=mempool,
    wallet=wallet,
    node=node,
    data_dir=data_dir,
    wallet_dir=wallet_dir,
    host=args.rpc_host,
    port=args.rpc_port,
)
```

그리고 실행 로그도 실제 bind 주소를 출력하도록 바꾼다.

#### B. `jackpotchain/Dockerfile`

**문제**

- 로컬 compose가 이 파일을 참조하지만 실제 파일이 없다.

**수정 방향**

- Python 런타임 이미지
- `requirements.txt` 설치
- healthcheck용 `curl` 포함
- non-root 사용자
- `ENTRYPOINT` 또는 `CMD`에서 `python -m jackpotchain.cli.main node ...`

#### C. `jackpotchain/entrypoint.sh`

**문제**

- Compose 환경변수를 실제 CLI 인자로 바꿔주는 계층이 없다.
- `NODE_DATA_DIR`, `NODE_WALLET_DIR`, `NODE_RPC_HOST`, `NODE_RPC_PORT`, `NODE_P2P_PORT`가 현재는 사실상 죽은 설정이다.

**수정 방향**

- 환경변수를 `node` 실행 인자로 변환
- wallet 파일은 `/wallets/default.json`처럼 명시 경로로 고정
- seed, mine 옵션도 후속 확장 가능하게 구성

#### D. `jackpotchain/.dockerignore`

**문제**

- 빌드 컨텍스트가 불필요하게 커질 수 있다.

**수정 방향**

- `.venv`, `__pycache__`, `.pytest_cache`, `data`, `build`, `dist` 제외

### 2-3. 기존 노드 통신 상태 판단

질문하신 1번에 대해서는, 현재 코드를 기준으로 보면 **기존 블록체인 네트워크 통신이 바로 깨져 있다고 볼 근거는 부족하지만, 완전히 안전하다고 단정할 단계도 아니다.**

| 영역 | 현재 코드 근거 | 판단 |
|------|---------------|------|
| 지갑 생성/선택 | `wallet/wallet.py`, `rpc/server.py`의 `getnewaddress`, `listwallets`, `setwallet`, `getactivewallet` | 기본 지갑 생성/선택 경로는 구현되어 있음 |
| 로또 참여/조회 | `rpc/server.py`의 `lottocommit`, `lottocheckresult`, `listlottocommits`, `tests/test_e2e_lotto.py` | 참여와 결과 조회의 핵심 경로는 구현 및 테스트 흔적이 있음 |
| 피어 연결/주소 교환 | `network/node.py`, `tests/test_network.py`, `tests/test_peer_discovery.py` | 기본 P2P 메시지 처리와 peer discovery 흐름은 구현되어 있음 |
| 블록 동기화/재조직 | `network/node.py`, `sync/manager.py`, `tests/test_reorg.py` | 기본 sync 경로는 있으나 장기 안정성은 추가 확인 필요 |

특히 주의할 부분은 아래 두 가지다.

1. `sync/manager.py`의 `on_headers_received()`에는 아직 `# TODO: 헤더 검증 및 저장`이 남아 있다.
2. `tests/test_reorg.py`에는 reorg 이후 UTXO 기대값이 "현재 구현에서 실패할 것"이라는 주석이 남아 있다.

즉, **지갑 생성, 로또 참여, 기본 peer 통신은 당장 전면 재작업 대상으로 보이지 않지만**, 다중 노드 장기 동기화와 reorg 안정성은 "문제 없음"이라고 확정하기 전에 반드시 재검증해야 한다.

### 2-4. 문서/계약 정합화가 필요한 항목

#### 1. 로또 Claim 방식

현재 실제 RPC:

- `lottocommit`
- `lottocheckresult`
- `listlottocommits`

없는 것:

- `lottoclaim`

즉, 현재 체인 모델은 자동 지급이다. 따라서 아래 둘 중 하나를 선택해야 한다.

1. FE/BE도 자동 지급 UX로 맞춘다.
2. 수동 Claim을 유지하려면 JackpotChain에 신규 RPC와 플로우를 추가한다.

#### 2. 토크노믹스

현재 실제 코드:

- `BLOCK_REWARD = 50 JACK`
- 블록 수수료 분배 = 채굴자 50% / 잭팟풀 30% / 소각 20%
- 로또 참여비 분배 = 80% / 19% / 1%

따라서 과거 문서의 "100 JACK, 블록 수수료 100% 채굴자" 가정은 현재 코드와 다르다. 이 항목은 즉시 수정 대상이 아니라 **제품 규칙 재확정 후 반영할 스펙 갭**으로 보는 것이 맞다.

#### 3. Webhook 연동

현재 `network/node.py`는 block callback 구조는 갖고 있지만 backend webhook push는 없다.

권장 판단:

- 1차는 backend가 RPC polling + DB read model 방식으로 구현
- webhook은 후속 고도화에서 선택 적용

### 2-5. plan.md 2단계 이후 작업에서 추가 블록체인 수정 필요 여부

질문하신 2번에 대한 답은 **"아직 일부는 더 수정해야 한다"** 이다. 다만 과거 문서처럼 대규모 재구현이 필요한 것은 아니고, 범위가 더 명확해졌다.

#### 반드시 반영해야 하는 수정

1. `cli/main.py`
   - `node` 서브커맨드에 `--rpc-host` 추가
   - 현재는 `tui`에만 있고 `node`에는 없어 Docker 환경의 `0.0.0.0` 바인드가 직접 연결되지 않는다.
2. `jackpotchain/Dockerfile`
   - 현재 compose가 참조할 실제 이미지 정의가 없다.
3. `jackpotchain/entrypoint.sh`
   - Compose 환경변수와 실제 CLI 인자를 연결하는 계층이 필요하다.
4. `jackpotchain/.dockerignore`
   - 빌드 컨텍스트 최소화가 필요하다.

#### 설계 결정을 먼저 해야 하는 수정

1. 로또 Claim 모델
   - 현재 체인은 자동 지급 모델이다.
   - `POST /lotto/claim`를 유지하려면 BE 계약 변경 또는 체인 RPC 확장이 필요하다.
2. 토크노믹스 변경 여부
   - 현재 코드는 일정한 분배 규칙을 이미 갖고 있다.
   - 이 부분은 즉시 수정이라기보다 제품 정책 확정 후 변경 여부를 판단해야 한다.

#### 지금 당장 blocker는 아니지만, 이후 안정성을 위해 재검토가 필요한 수정

1. 동기화 보강
   - `sync/manager.py`의 헤더 검증/저장 TODO 정리 여부 검토
2. reorg 회귀 검증
   - `tests/test_reorg.py`와 실제 `consensus/chain.py` 동작이 현재도 일치하는지 확인

정리하면, **plan.md의 3단계와 4단계를 진행하는 동안에는 블록체인 코드 수정이 더 필요하다.** 다만 그 수정은 "네트워크 전체를 뜯어고치는 작업"이 아니라, Docker 실행 경로 정리와 RPC/REST 계약 정합화, 그리고 sync/reorg 리스크 점검 쪽에 집중된다.

### 2-6. 수정 시 기존 노드 통신 영향 및 주의사항

이번에 반영해야 하는 수정이 기존 네트워크 노드 통신에 미칠 수 있는 영향은 위험도별로 나눠서 보는 것이 맞다.

#### 저위험 수정

- `--rpc-host` 추가
- `Dockerfile`, `entrypoint.sh`, `.dockerignore` 추가

이 변경들은 **합의, 지갑, peer 통신 로직 자체를 바꾸는 수정은 아니므로 원칙적으로는 저위험**이다.  
다만 아래 조건을 지키지 않으면 실제 운영에서는 기존 통신 문제가 새로 생길 수 있다.

1. 기본값 유지
   - 기본 RPC host는 계속 `127.0.0.1`
   - 기존 wallet/data 기본 경로는 유지
2. Docker 전용 오버라이드만 추가
   - 로컬 CLI 사용자가 쓰던 실행 방식이 깨지지 않아야 한다.
3. startup 로그 확인
   - 실제 bind host/port, wallet path, data dir가 로그에 명확히 보여야 한다.

이 조건을 어기면 아래 문제가 생길 수 있다.

- RPC가 외부에서 아예 열리지 않음
- 잘못된 wallet path로 인해 지갑 생성/조회가 실패함
- 다른 노드와는 정상 연결되는데 backend만 RPC 접속 실패

#### 중위험 이상 수정

- `lottoclaim` 신규 도입 등 로또 플로우 자체 변경
- sync/reorg 로직 수정
- 토크노믹스 및 수수료 분배 규칙 변경

이 변경들은 **기존 로또 참여, 잔액 계산, 블록 동기화, 재조직 후 상태 일관성에 직접 영향을 줄 수 있으므로 주의 필요**라고 문서에 명시해야 한다.

따라서 modify 단계에서 아래 경고를 함께 유지하는 것이 맞다.

> 동기화, reorg, 로또 지급 플로우를 건드리는 수정은 기존 노드 간 통신과 상태 일관성에 영향을 줄 수 있으므로, Docker 실행 확인만으로 완료 처리하면 안 된다. 네트워크/로또 회귀 테스트와 다중 노드 수동 검증을 함께 수행해야 한다.

### 2-7. 권장 테스트

#### RPC 스모크 테스트

```bash
python -m jackpotchain.cli.main node --port 18333 --rpc-port 18332 --data-dir tmp/jackpotchain-data
```

```bash
curl -X POST http://127.0.0.1:18332/ -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"method\":\"help\",\"params\":[],\"id\":1}"
```

```bash
curl -X POST http://127.0.0.1:18332/ -H "Content-Type: application/json" -d "{\"jsonrpc\":\"2.0\",\"method\":\"getlottoinfo\",\"params\":[],\"id\":1}"
```

#### 테스트 코드 재검증

```bash
pytest jackpotchain/tests/test_network.py jackpotchain/tests/test_peer_discovery.py jackpotchain/tests/test_e2e_lotto.py
```

```bash
pytest jackpotchain/tests/test_reorg.py -v -s
```

```bash
python -m jackpotchain.scripts.test_multinode all
```

#### Docker 스모크 테스트

```bash
docker compose -f docker-compose.local.yml config
docker compose -f docker-compose.local.yml up -d jackpotchain-node
docker compose -f docker-compose.local.yml logs -f jackpotchain-node
```

확인 포인트:

- node 컨테이너가 즉시 종료되지 않음
- `getblockcount` healthcheck 통과
- backend에서 `JACKPOTCHAIN_RPC_URL` 접근 가능

추가 확인 포인트:

- 로또 참여 후 commit 조회와 결과 조회가 계속 정상 동작하는지
- 지갑 생성 후 재기동해도 wallet 파일이 유지되는지
- 2개 이상 노드에서 블록 높이 차이가 줄어드는지
- reorg 또는 장기 sync 시 잔액/UTXO 불일치가 없는지

### 2-8. 우선순위 요약

| 우선순위 | 파일 | 항목 | 난이도 |
|:--------:|------|------|:------:|
| 🔴 1 | `jackpotchain/cli/main.py` | `node`용 `--rpc-host` 지원 추가 | ⭐ |
| 🔴 2 | `jackpotchain/Dockerfile` | 이미지 빌드 정의 | ⭐⭐ |
| 🔴 3 | `jackpotchain/entrypoint.sh` | 환경변수 → CLI 인자 연결 | ⭐⭐ |
| 🔴 4 | `jackpotchain/.dockerignore` | 빌드 컨텍스트 최적화 | ⭐ |
| 🟡 5 | API/BE 설계 | 자동 지급 모델과 REST 계약 정리 | ⭐ |
| 🟠 6 | `sync/manager.py`, `tests/test_reorg.py` | sync/reorg 안정성 재검증 및 필요 시 보강 | ⭐⭐ |
| 🟠 7 | `constants.py`, `consensus/miner.py` | 토크노믹스 재확정 후 변경 여부 결정 | ⭐⭐ |
| 🟢 8 | `network/node.py` | webhook push는 후속 선택 과제 | ⭐⭐ |

---

## 결론

JackpotChain 수정 계획의 핵심은 과거처럼 "없는 모듈을 채우는 것"이 아니라, **실제 존재하는 코드가 Docker와 BE 연동 환경에서 그대로 동작하도록 실행 경로와 계약을 정리하는 것**이다. 당장 필요한 수정은 `cli/main.py`, Docker 산출물, 그리고 API 문서 정합화다.
