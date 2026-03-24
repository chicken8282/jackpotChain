# Docker 포트 및 시드노드 설정 수정 사항

## 배경

`constants.py`에 정의된 포트(RPC: 9776, P2P: 9777)와 Docker 관련 파일들의 포트(8332, 8333)가 불일치.
비트코인 기본 포트가 그대로 남아있던 상태. 시드노드 전용 실행 옵션(`--seed-node`)도 Docker에서 사용 불가.
시드노드 인바운드 연결 수 확장 필요 (기본 32 → 128).

---

## 변경 파일 목록

### 1. `blockchain/Dockerfile.fixed` (원본: `blockchain/Dockerfile`)

| 항목 | 변경 전 | 변경 후 |
|------|--------|--------|
| EXPOSE | `8332 8333` | `9776 9777 9778` |
| HEALTHCHECK 포트 | `localhost:8332` | `localhost:9776` |

- 9776: RPC 포트
- 9777: P2P 포트
- 9778: 랑데부 서버 포트 (시드노드 홀펀칭용)

---

### 2. `blockchain/entrypoint.fixed.sh` (원본: `blockchain/entrypoint.sh`)

| 항목 | 변경 전 | 변경 후 |
|------|--------|--------|
| RPC_PORT 기본값 | `8332` | `9776` |
| P2P_PORT 기본값 | `8333` | `9777` |
| NODE_SEED_NODE 환경변수 | 없음 | 추가 |
| NODE_RENDEZVOUS_PORT 환경변수 | 없음 | 추가 (기본값 9778) |

추가된 로직:
```sh
NODE_SEED_NODE_VALUE="${NODE_SEED_NODE:-false}"
NODE_RENDEZVOUS_PORT_VALUE="${NODE_RENDEZVOUS_PORT:-9778}"

if [ "${NODE_SEED_NODE_VALUE}" = "true" ]; then
  set -- "$@" --seed-node
  set -- "$@" --rendezvous-port "${NODE_RENDEZVOUS_PORT_VALUE}"
fi
```

`NODE_SEED_NODE=true`로 설정하면 `--seed-node --rendezvous-port 9778` 플래그가 전달됨.
채굴 없이 시드노드 + 랑데부 서버로 실행.

---

### 3. `docker-compose.prod.fixed.yml` (원본: `docker-compose.prod.yml`)

#### jackpotchain-node 서비스

| 항목 | 변경 전 | 변경 후 |
|------|--------|--------|
| NODE_RPC_PORT | `"8332"` | `"9776"` |
| NODE_P2P_PORT | `"8333"` | `"9777"` |
| NODE_SEED_NODE | 없음 | `"true"` |
| NODE_RENDEZVOUS_PORT | 없음 | `"9778"` |
| NODE_MINE | 없음 | `"false"` |
| NODE_MAX_INBOUND | 없음 | `"128"` |
| NODE_MAX_OUTBOUND | 없음 | `"16"` |
| ports | `8332:8332`, `8333:8333` | `9776:9776`, `9777:9777`, `9778:9778` |
| healthcheck 포트 | `localhost:8332` | `localhost:9776` |
| ulimits | 없음 | `nofile: 65536` (soft/hard) |

ulimits 추가 이유: 인바운드 128개 연결 시 기본 파일 디스크립터 한도(1024)를 초과할 수 있음.

#### spring-blue / spring-green 서비스

| 항목 | 변경 전 | 변경 후 |
|------|--------|--------|
| JACKPOTCHAIN_RPC_URL | `http://jackpotchain-node:8332` | `http://jackpotchain-node:9776` |

---

### 4. `constants.py` 코드 변경 필요 (별도 작업)

`NODE_MAX_INBOUND`, `NODE_MAX_OUTBOUND` 환경변수를 Python 코드에서 읽도록 수정 필요:

```python
# 현재
MAX_OUTBOUND_CONNECTIONS = 8
MAX_INBOUND_CONNECTIONS = 32

# 변경
MAX_OUTBOUND_CONNECTIONS = int(os.environ.get('NODE_MAX_OUTBOUND', 8))
MAX_INBOUND_CONNECTIONS = int(os.environ.get('NODE_MAX_INBOUND', 32))
```

Docker가 아닌 환경에서는 환경변수가 없으므로 기존 기본값(8/32) 그대로 동작.

---

## 포트 정리

| 용도 | 포트 | 정의 위치 |
|------|------|----------|
| JSON-RPC API | 9776 | `constants.py` → `DEFAULT_RPC_PORT` |
| P2P 네트워크 | 9777 | `constants.py` → `DEFAULT_PORT` |
| 랑데부 서버 | 9778 | `constants.py` → `DEFAULT_RENDEZVOUS_PORT` (DEFAULT_PORT + 1) |

---

## EC2 보안 그룹 (인바운드 규칙)

### 기존 규칙 (HUB 시드노드)

| 프로토콜 | 포트 | 소스 | 용도 |
|---------|------|------|------|
| UDP | 9777 | 0.0.0.0/0 | P2P (UDP) |
| TCP | 9777 | 0.0.0.0/0 | P2P (TCP) |
| TCP | 22 | 0.0.0.0/0 | SSH |

### 추가 필요 규칙

| 프로토콜 | 포트 | 소스 | 용도 |
|---------|------|------|------|
| TCP | 9776 | VPC 내부 또는 BE 서버 IP | RPC API (Spring → Node 통신). 외부 노출 금지 |
| TCP | 9778 | 0.0.0.0/0 | 랑데부 서버 (홀펀칭 중개) |

> **주의**: 9776(RPC)은 블록체인 제어 API이므로 0.0.0.0/0으로 열면 안 됨.
> 같은 VPC 내 BE 서버에서만 접근하거나, 특정 IP만 허용할 것.

---

## 적용 방법

각 `.fixed` 파일을 원본 파일명으로 교체:

```
blockchain/Dockerfile.fixed       → blockchain/Dockerfile
blockchain/entrypoint.fixed.sh    → blockchain/entrypoint.sh
docker-compose.prod.fixed.yml     → docker-compose.prod.yml
```

`constants.py`는 위 "4. constants.py 코드 변경 필요" 섹션 참고하여 별도 수정.
