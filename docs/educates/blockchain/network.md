# JackpotChain 네트워크 아키텍처

> 이 문서는 JackpotChain 실제 코드베이스를 기반으로 작성되었습니다.
> `blockchain/network/node.py`, `blockchain/rpc/server.py`, `blockchain/sync/manager.py` 등을 직접 참조합니다.

---

## Part 1: P2P 노드 간 네트워크

### 왜 이 설계인가 — Server Node vs TUI Mining Node

JackpotChain은 두 종류의 노드가 공존합니다.

```
EC2 서버                              사용자 로컬 PC
┌──────────────────────┐              ┌──────────────┐
│  Server Node         │  P2P :8333   │  TUI 채굴 A  │
│  (Observer)          │◀────────────▶│  (채굴 수행) │
│  - P2P :8333         │              └──────────────┘
│  - RPC :8332         │              ┌──────────────┐
│  - Webhook → Backend │◀────────────▶│  TUI 채굴 B  │
└──────────────────────┘              └──────────────┘
```

Server Node는 **채굴하지 않습니다**. 설계 의도는 명확합니다.

- 채굴은 로컬 PC 사용자들이 경쟁하는 행위 → EC2가 채굴하면 중앙화
- Server Node는 24시간 상시 구동되며 P2P 네트워크의 anchor 역할
- 블록/TX를 수신하면 Backend에 Webhook으로 즉시 통보하는 Observer

```python
# blockchain/network/node.py
@dataclass
class NodeConfig:
    host: str = "0.0.0.0"
    port: int = DEFAULT_PORT
    max_outbound: int = 8
    max_inbound: int = 32
    relay: bool = True
    nat_enabled: bool = True
    holepunch_enabled: bool = True
    is_seed_node: bool = False
```

`max_outbound=8`, `max_inbound=32`이라는 비대칭 구조가 눈에 띕니다. 아웃바운드를 8개로 제한하는 이유는 각 피어가 각자 아웃바운드를 8개씩 유지하면 전체 네트워크가 충분히 연결되기 때문입니다. 반면 인바운드는 32개를 허용해 새로 참여하는 TUI 노드들이 쉽게 연결할 수 있게 합니다.

---

### asyncio 기반 P2P — 왜 스레딩이 아닌가

> **asyncio:** Python의 이벤트 루프 기반 비동기 I/O 프레임워크. 단일 스레드에서 수백 개의 I/O 작업을 동시에 처리할 수 있습니다.

블록체인 노드는 수십 개의 피어와 동시에 통신해야 합니다. 이를 구현하는 방법에는 두 가지가 있습니다.

| 방식 | 피어 10개 연결 시 |
|------|------------------|
| 스레딩 | 스레드 10개 생성 → 각 스레드의 스택 메모리, 컨텍스트 스위칭 비용 |
| asyncio | 코루틴 10개 → 단일 스레드, I/O 대기 중에만 CPU 양보 |

P2P 노드의 대부분 작업은 **I/O 바운드**입니다 — 메시지를 기다리고, 블록을 전송하고, 응답을 기다립니다. CPU 연산이 집중되는 작업(PoW 채굴)이 아닙니다. 따라서 asyncio가 이상적입니다.

실제 코드에서 각 피어 연결은 독립적인 코루틴으로 처리됩니다.

```python
# blockchain/network/node.py
async def connect_to_peer(self, address: PeerAddress) -> bool:
    reader, writer = await asyncio.wait_for(
        asyncio.open_connection(address.ip, address.port),
        timeout=10
    )
    asyncio.create_task(self._handle_peer(address, reader, writer))
    await self._send_version(address)
    return True

async def _handle_peer(self, address: PeerAddress, reader, writer):
    """피어 메시지 처리 루프"""
    buffer = b''
    try:
        while self._running:
            data = await asyncio.wait_for(reader.read(8192), timeout=300)
            if not data:
                break
            buffer += data
            while len(buffer) >= 24:
                header, payload = parse_message(buffer)
                if header is None:
                    break
                msg_len = 24 + header.length
                if len(buffer) < msg_len:
                    break
                buffer = buffer[msg_len:]
                await self._process_message(address, header, payload)
    except asyncio.TimeoutError:
        ...
    finally:
        await self._disconnect(address)
```

`asyncio.create_task()`로 각 피어를 독립적으로 처리하면서도 단일 이벤트 루프에서 실행됩니다. 한 피어가 느리거나 응답이 없어도 `await`가 이벤트 루프를 양보하므로 다른 피어들은 영향받지 않습니다.

---

### 피어 발견 — Seed Node와 Peer Exchange

새로운 노드가 P2P 네트워크에 참여하려면 처음 연결할 피어를 알아야 합니다.

> **시드 노드(Seed Node):** P2P 네트워크의 진입점 역할을 하는 공개 노드. 새 노드가 네트워크에 참여할 때 처음 연결하는 노드입니다.

JackpotChain은 두 단계 발견을 구현합니다.

```python
# blockchain/network/discovery.py

# 1단계: DNS 시드 조회
DNS_SEEDS = [
    "seed1.ssatto777.site",
    "seed2.ssatto777.site",
    "seed3.ssatto777.site",
]

# 2단계: DNS 실패 시 하드코딩된 시드 노드
HARDCODED_SEEDS = [
    ("54.116.13.57", 8777),  # AWS 시드 노드 (seed2)
    ("15.165.75.53", 8777),  # AWS 시드 노드 (seed1)
    ("127.0.0.1", DEFAULT_PORT),  # 로컬 테스트용
]
```

시드 노드에 연결한 뒤에는 **GETADDR/ADDR 메시지**로 피어 목록을 교환합니다.

```python
# 핸드셰이크 완료 후 피어에게 주소 요청
async def _handle_verack(self, address: PeerAddress):
    self.peer_manager.update_peer_state(address, PeerState.READY)
    self.discovery.mark_good(address)
    await self._send_getaddr(address)  # ← 피어 주소 교환 요청

# GETADDR 처리 — 스팸 방지로 24시간에 한 번만 응답
async def _handle_getaddr(self, address: PeerAddress):
    last = self._last_getaddr.get(address, 0)
    if time.time() - last < 86400:
        return
    self._last_getaddr[address] = time.time()
    peers = self.discovery.get_addr_to_send(count=1000)
```

발견된 피어 주소는 `peers.json`에 캐시됩니다. 재시작 시 DNS 조회 없이 즉시 연결 가능합니다.

```python
# PeerCache: 성공률과 최근 접속 기준으로 피어 선택
def get_peers(self, count: int = 100) -> List[PeerAddress]:
    def score(p: CachedPeer) -> tuple:
        success_rate = p.success / max(p.attempts, 1)
        return (success_rate, p.last_seen)
    candidates.sort(key=score, reverse=True)
```

---

### 블록/TX 동기화 — GETBLOCKS Locator 패턴

새로 연결된 노드는 자신이 뒤처진 블록을 받아야 합니다. 이때 핵심 문제는 **어디서부터 요청해야 하는가**입니다. 전체 블록 해시를 전송하면 수십만 개가 넘어 비현실적입니다.

> **Block Locator:** 자신이 보유한 블록 체인의 요약 정보. 최근 블록은 세밀하게, 오래된 블록은 지수적 간격으로 샘플링하여 적은 데이터로 분기점을 빠르게 찾습니다.

```python
# blockchain/consensus/chain.py
def get_block_locator(self) -> List[bytes]:
    """
    최근 10개는 연속, 이후로는 2배씩 간격 증가
    최대 32개 해시
    """
    locator = []
    height = self.get_height()
    step = 1

    while height >= 0:
        if height in self._height_to_hash:
            locator.append(self._height_to_hash[height])

        if len(locator) >= 10:
            step *= 2  # ← 지수적 step-back

        height -= step
        if len(locator) >= 32:
            break

    return locator
```

예를 들어 높이가 500인 노드의 locator는 이렇습니다.

```
높이: 500, 499, 498, ..., 491  (최근 10개, 간격=1)
     489, 485, 477, 461, 429, 365, 237, ...  (이후 간격 2배씩)
```

상대 노드는 이 해시 목록에서 자신의 체인과 분기점을 찾아 그 이후 블록의 INV를 응답합니다.

```python
# node.py - GETBLOCKS 처리
async def _handle_getblocks(self, address: PeerAddress, payload: bytes):
    msg = GetBlocksMessage.deserialize(payload)
    fork_height, _ = self.blockchain.find_fork_point(msg.block_locator)
    hashes = self.blockchain.get_chain_hashes(fork_height + 1, 500)
    items = [InvItem(InvType.BLOCK, h) for h in hashes]
    inv = InvMessage(items)
    await self._send_message(address, MessageType.INV, inv.serialize())
```

---

### Header-First 동기화 — 왜 헤더를 먼저 받는가

JackpotChain은 Bitcoin의 Header-First Sync 전략을 채택했습니다.

> **Header-First Sync:** 블록 전체(수백 KB)를 받기 전에 헤더(80 bytes)만 먼저 수신하여 체인 구조를 파악하는 전략입니다.

```python
# blockchain/sync/manager.py
class SyncManager:
    """
    전략:
    1. GETHEADERS로 헤더 우선 다운로드
    2. 헤더 검증 후 blockchain에 저장
    3. 다중 피어에서 블록 병렬 다운로드
    4. out-of-order 블록 버퍼링 후 순서대로 체인에 추가
    """
    MAX_PER_PEER = 16   # 피어당 최대 동시 블록 요청
    MAX_BLOCK_BUFFER = 1000
    STALL_TIMEOUT = 30  # 초
```

단순 순차 동기화(블록 한 개 받고 → 검증 → 다음 요청)와 비교하면:

| 방식 | 1000개 블록 동기화 |
|------|-------------------|
| 순차 | 각 블록마다 RTT 대기 = N × RTT |
| Header-First | 헤더를 먼저 받고 다중 피어에서 병렬로 블록 요청 |

헤더만으로 작업증명(PoW)을 검증할 수 있습니다. 블록 해시가 난이도 목표값 이하임을 확인하는 데 전체 TX 목록이 필요하지 않습니다. 따라서 헤더 체인을 먼저 확보한 뒤, 블록 바디를 여러 피어에서 동시에 병렬로 다운로드합니다.

```python
async def _request_headers(self):
    """GETHEADERS 요청 — 마지막 헤더 해시를 locator 선두에 포함"""
    if self._request_headers_callback:
        locator = self.blockchain.get_block_locator()
        if self._last_header_hash and self._last_header_hash not in locator:
            locator = [self._last_header_hash] + locator
        await self._request_headers_callback(locator)
```

상대 노드는 한 번에 최대 2000개 헤더를 응답합니다.

```python
# node.py - GETHEADERS 처리
for height in range(start_height, min(start_height + 2000, current_height + 1)):
    block = self.blockchain.get_block_by_height(height)
    headers.append(block.header.serialize())
```

---

### NAT 통과 — Hole Punching과 Rendezvous

TUI 노드는 가정용 공유기 뒤에서 실행됩니다. 공유기는 NAT로 사설 IP를 사용하므로 인터넷에서 직접 접근이 불가능합니다.

> **NAT(Network Address Translation):** 공유기가 사설 IP(192.168.x.x)를 공인 IP로 변환하는 기술. 외부에서 NAT 뒤 기기에 직접 연결하기 어렵습니다.

> **Hole Punching:** 양쪽 NAT에 동시에 연결 시도를 하여 NAT 테이블에 구멍을 뚫는 기술. 랑데부 서버의 중재가 필요합니다.

```
TUI 노드 A (NAT 뒤)          랑데부 서버 (Server Node)      TUI 노드 B (NAT 뒤)
     │                               │                              │
     │── REGISTER ──────────────────▶│                              │
     │◀─ REGISTER_ACK (외부 IP:port) │                              │
     │                               │◀────────── REGISTER ─────────│
     │                               │── PUNCH_INITIATE ───────────▶│
     │◀─ PUNCH_INITIATE ─────────────│                              │
     │                               │                              │
     │────── 동시 TCP connect ────────────────────────────────────▶│
     │◀─────────────────────────────────────────────────────────────│
     │              직접 P2P 연결 성공                               │
```

```python
# NodeConfig
is_seed_node: bool = False  # True면 랑데부 서버도 실행
rendezvous_port: int = DEFAULT_RENDEZVOUS_PORT  # 8334
rendezvous_seeds: list = None

# 직접 연결 실패 시 홀펀칭 자동 시도
async def connect_to_peer(self, address: PeerAddress) -> bool:
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(address.ip, address.port), timeout=10
        )
    except Exception as e:
        # 직접 연결 실패 - 홀펀칭 시도
        if self._holepunch_client and self._holepunch_client.is_registered:
            hp_result = await self._holepunch_client.request_punch(
                address.ip, address.port
            )
            if hp_result.success:
                ...
```

NAT 통과 시도 순서는 `PCP → NAT-PMP → UPnP → HolePunch → 수동 감지` 순으로 진행됩니다.

---

### 한계와 트레이드오프

**asyncio의 한계:** CPU 집약 작업(예: 블록 검증)이 길어지면 이벤트 루프가 블락됩니다. JackpotChain은 검증을 동기 함수로 처리하므로, 악의적으로 검증 비용이 큰 블록을 보내면 다른 피어들에 대한 응답이 지연될 수 있습니다.

**Hole Punching의 한계:** Symmetric NAT에서는 홀펀칭이 실패합니다. 이 경우 아웃바운드 전용 모드로 전락하며 피어에서 먼저 연결해줘야 합니다.

**Sync Watchdog:** 블록 다운로드가 30초(STALL_TIMEOUT) 이상 멈추면 stale 요청을 재분배합니다. 네트워크 상태에 따라 이 임계값이 너무 짧을 수 있습니다.

---

## Part 2: 백엔드와의 JSON-RPC 통신

### 왜 REST가 아닌 JSON-RPC인가

> **JSON-RPC 2.0:** 메서드 이름과 파라미터를 JSON으로 전달하는 원격 프로시저 호출 프로토콜. 단일 엔드포인트에 메서드명으로 구분합니다.

블록체인 노드와의 통신에 REST가 부적합한 이유가 있습니다.

| 특성 | REST | JSON-RPC |
|------|------|----------|
| 설계 패러다임 | 리소스 중심 (명사) | 프로시저 중심 (동사) |
| 엔드포인트 | 여러 URL | 단일 URL (`POST /`) |
| 블록체인 적합성 | `getblockcount`는 리소스가 아님 | `getblockcount`를 메서드명으로 직접 표현 |
| 표준화 | 설계마다 다름 | Bitcoin Core 호환 메서드명 재사용 가능 |

`getblockcount`, `sendrawtransaction`, `listunspent`는 작업의 이름이지 리소스의 이름이 아닙니다. JSON-RPC가 이 의미를 직접 표현합니다.

```python
# blockchain/rpc/server.py
class RPCServer:
    def __init__(self, host: str = "127.0.0.1", port: int = DEFAULT_RPC_PORT):
        self._app = web.Application()
        self._app.router.add_post('/', self._handle_request)  # 단일 엔드포인트
```

요청/응답 형식은 JSON-RPC 2.0 표준을 따릅니다.

```json
// 요청
{"jsonrpc": "2.0", "method": "getblockcount", "params": [], "id": 1}

// 성공 응답
{"jsonrpc": "2.0", "id": 1, "result": 1042}

// 에러 응답
{"jsonrpc": "2.0", "id": 1, "error": {"code": -32601, "message": "Method not found"}}
```

```python
async def _process_request(self, data: dict) -> dict:
    method = data['method']
    params = data.get('params', [])

    if method not in self._methods:
        return self._error_dict(req_id, RPC_METHOD_NOT_FOUND)

    result = await self._call_method(handler, *params)
    return {
        'jsonrpc': '2.0',
        'id': req_id,
        'result': result
    }
```

배치 요청도 지원합니다 — 여러 메서드를 한 번의 HTTP 요청으로 호출 가능합니다.

---

### 노출된 RPC 메서드

```python
# blockchain/rpc/server.py - _register_methods()

# Blockchain
'getblockchaininfo', 'getblock', 'getblockhash', 'getblockcount', 'getbestblockhash'

# Mempool
'getmempoolinfo', 'getrawmempool', 'sendrawtransaction'

# Wallet
'getbalance', 'getbalances',   # JACK + POT 동시 조회
'listunspent',                  # UTXO 목록
'sendtoaddress'

# Network
'getnetworkinfo', 'getpeerinfo'

# Mining
'getmininginfo', 'startmining', 'stopmining'

# Lotto
'lottocommit', 'lottocheckresult', 'listlottocommits'
```

`getbalances`는 Bitcoin에 없는 JackpotChain 고유 메서드입니다. JACK과 POT 두 자산을 한 번에 조회합니다.

```python
def _getbalances(self, address: str = None) -> dict:
    """JACK + POT 잔액 조회"""
    return {
        'jack': jack_balance / COIN,
        'pot': pot_balance / COIN,
        'jack_satoshi': jack_balance,
        'pot_satoshi': pot_balance,
    }
```

---

### Webhook 패턴 — 새 블록 발생 시 Backend 통보

> **Webhook:** 이벤트 발생 시 미리 등록된 URL로 HTTP POST를 보내는 패턴. 수신자가 반복 폴링하는 대신 발신자가 이벤트를 밀어넣습니다.

Server Node는 블록을 수신할 때마다 Backend에 알려야 합니다. Backend는 이를 받아 DB에 인덱싱합니다. 이를 구현하는 두 가지 방법을 비교합니다.

| 방식 | 설명 | 문제점 |
|------|------|--------|
| **Polling** | Backend가 주기적으로 RPC `getblockcount`를 호출하여 새 블록 여부 확인 | 새 블록이 없어도 계속 요청 발생. 폴링 간격만큼 지연 |
| **Webhook** | Server Node가 블록 수신 즉시 Backend에 POST | 이벤트 발생 시에만 트래픽. 실시간 처리 |

`node.py`에는 블록 수신 콜백 메커니즘이 이미 구현되어 있습니다.

```python
# blockchain/network/node.py
def set_block_callback(self, callback: Callable):
    """블록 수신 콜백 설정"""
    self._on_block = callback

# _handle_block 내부
if self._on_block:
    self._on_block(block, peer)  # ← 블록 수신 즉시 실행
```

이 콜백에 aiohttp로 Backend에 POST를 보내는 함수를 등록합니다.

```python
# Server Node 실행 시 설정
import aiohttp

async def notify_backend(block: Block, peer: PeerInfo):
    payload = serialize_block_to_json(block)
    async with aiohttp.ClientSession() as session:
        await session.post(
            "http://localhost:8080/internal/new-block",
            json=payload
        )

node.set_block_callback(notify_backend)
```

Backend는 이 Webhook을 받아 블록을 파싱하고 DB에 저장합니다.

```java
// Backend - 내부 수신 전용 (외부 노출 X)
@PostMapping("/internal/new-block")
public void receiveNewBlock(@RequestBody BlockPayload payload) {
    blockService.save(payload);
    indexingService.indexBlock(payload);  // TX, lotto_entry, activity 등 인덱싱
}
```

---

### RPC Bind Host — 127.0.0.1과 Docker의 0.0.0.0

```python
# blockchain/rpc/server.py
class RPCServer:
    def __init__(self, host: str = "127.0.0.1", ...):
        ...
```

기본값이 `127.0.0.1`(루프백)인 이유: RPC는 Backend → Node 단방향 통신입니다. 외부 인터넷에서 RPC에 접근하면 임의의 TX를 브로드캐스트하거나 노드를 제어할 수 있습니다. 로컬호스트로 바인딩하면 같은 머신의 프로세스만 접근 가능합니다.

Docker 환경에서는 Backend 컨테이너와 Node 컨테이너가 별도의 네트워크 네임스페이스에 있습니다. 컨테이너 간 통신은 루프백이 아닌 Docker 내부 네트워크를 사용하므로 `0.0.0.0`으로 오버라이드합니다.

```
로컬 환경: Backend → localhost:8332 → Node (127.0.0.1)
Docker:    Backend → node:8332 → Node (0.0.0.0, Docker network)
```

Nginx는 `/internal/*` 경로를 외부에서 차단합니다.

```nginx
location /internal/ {
    deny all;  # 외부 접근 차단
}
```

---

### Webhook 실패 시 처리

Webhook이 실패하면 Backend는 해당 블록의 TX를 DB에 저장하지 못합니다. JackpotChain의 현재 구현에서 이는 알려진 한계입니다.

실제 시스템에서는 다음 전략으로 보완합니다.

1. **재시도:** Webhook 실패 시 exponential backoff로 재시도
2. **보정 폴링:** Backend가 주기적으로 `getblockcount`와 DB의 최신 블록 높이를 비교하여 누락 감지
3. **체크포인트:** Server Node가 Webhook 전송 성공 여부를 로컬에 기록

---

### 한계와 트레이드오프

**단일 엔드포인트의 단점:** 모든 RPC 요청이 `POST /`로 들어오므로 HTTP 레이어에서 메서드별 인증/권한 제어가 어렵습니다. 현재 구현에는 인증이 없어 RPC 포트에 접근 가능한 주체는 모든 메서드를 호출할 수 있습니다.

**Webhook의 신뢰성:** HTTP POST는 at-most-once 보장입니다. 네트워크 오류 시 Webhook이 유실될 수 있습니다. 현재 재시도 로직은 구현되어 있지 않습니다.

---

## 면접 Q&A

**Q1. P2P 노드에 asyncio를 선택한 이유가 무엇인가요? 멀티스레딩과 비교해서 설명해주세요.**

A. P2P 노드의 작업 대부분은 I/O 바운드입니다 — 피어로부터 메시지를 기다리고, 블록을 전송하고, 응답을 기다립니다. 멀티스레딩을 사용하면 피어 수만큼 스레드가 생성되고 각 스레드는 대부분의 시간을 I/O 대기에 소비합니다. asyncio는 단일 이벤트 루프에서 `await` 지점마다 CPU를 다른 코루틴에 양보하므로 수십 개의 피어를 스레드 생성 비용 없이 동시에 처리할 수 있습니다. 다만 블록 검증처럼 CPU 집약적인 동기 함수가 길어지면 이벤트 루프 전체가 블락되는 것이 asyncio의 근본적인 한계입니다.

**Q2. JSON-RPC와 REST의 차이가 무엇이며, 블록체인 노드에 JSON-RPC를 선택한 이유는 무엇인가요?**

A. REST는 리소스 중심 설계로 URL이 명사를 표현하고 HTTP 메서드(GET, POST, DELETE 등)가 동사 역할을 합니다. 반면 JSON-RPC는 프로시저 중심으로 호출하고자 하는 함수 이름과 파라미터를 JSON 본문에 직접 담습니다. `getblockcount`, `sendrawtransaction`은 리소스가 아니라 행위입니다. JSON-RPC를 사용하면 이런 메서드명을 자연스럽게 표현하고, 단일 엔드포인트로 모든 호출을 처리하며, Bitcoin Core와 동일한 메서드명을 재사용할 수 있어 기존 도구와의 호환성을 얻습니다.

**Q3. Webhook vs Polling, 왜 Webhook을 선택했나요? Webhook이 실패하면 어떻게 되나요?**

A. Polling은 Backend가 주기적으로 RPC를 호출하므로 새 블록이 없어도 지속적으로 트래픽이 발생하고 폴링 간격만큼 지연이 생깁니다. Webhook은 블록 수신 이벤트 발생 시에만 HTTP POST가 발생하므로 효율적이고 실시간 처리가 가능합니다. `node.py`의 `_on_block` 콜백 메커니즘이 이미 구현되어 있어 자연스럽게 통합됩니다. 실패 시에는 현재 구현에서 해당 블록의 TX가 DB에 인덱싱되지 않는 문제가 발생합니다. 프로덕션에서는 재시도 로직과 보정 폴링(DB 최신 높이와 체인 높이 비교)을 병행해야 합니다.

**Q4. Header-First Sync가 왜 필요하고 어떤 이점을 주나요?**

A. 단순 순차 동기화는 블록 하나를 받고 → 검증하고 → 다음 블록을 요청하는 방식으로 N × RTT의 시간이 걸립니다. Header-First는 80바이트 헤더만으로 PoW 검증이 가능하다는 점을 활용합니다. 헤더 체인을 먼저 수신(최대 2000개 헤더/요청)하여 체인 구조를 파악한 뒤, 다중 피어에서 블록 바디를 병렬로 다운로드합니다. `SyncManager`는 `MAX_PER_PEER=16`으로 피어당 동시 16개 블록을 요청합니다. 또한 헤더 다운로드 중 가장 긴 체인을 먼저 식별하여 잘못된 체인에 블록 다운로드 대역폭을 낭비하는 것을 방지합니다.

**Q5. Server Node와 TUI Mining Node를 왜 분리했나요? 하나로 합치면 안 되나요?**

A. 역할과 환경이 근본적으로 다릅니다. Server Node는 EC2에서 24시간 안정적으로 구동되며 P2P 네트워크의 anchor이자 Backend의 데이터 소스 역할을 합니다. 채굴은 CPU 집약적이고 사용자가 원할 때만 수행하는 행위입니다. 만약 Server Node가 채굴을 겸한다면, 운영자가 채굴 보상을 독점하게 되어 탈중앙화 원칙이 훼손됩니다. 분리를 통해 네트워크 안정성(Server Node)과 채굴 공정성(TUI 다수)을 동시에 달성합니다.

**Q6. RPC 기본 바인딩이 127.0.0.1인데 Docker에서는 왜 0.0.0.0으로 바꾸나요? 보안 위험은 없나요?**

A. 로컬 환경에서 RPC는 같은 머신의 Backend만 접근하면 되므로 127.0.0.1로 충분합니다. Docker에서는 컨테이너가 별도의 네트워크 네임스페이스를 가지므로 Backend 컨테이너와 Node 컨테이너 사이의 통신은 루프백이 아닌 Docker 내부 네트워크를 거쳐야 합니다. 따라서 0.0.0.0이 필요합니다. 보안 위험은 Nginx가 `/internal/*`를 외부에서 차단하고, Docker 네트워크가 컨테이너 간 격리를 제공하므로 실질적으로 RPC 포트가 인터넷에 노출되지 않습니다. 다만 Docker 네트워크 내의 다른 컨테이너는 RPC에 접근 가능하므로 추가 인증 레이어를 고려해야 합니다.
