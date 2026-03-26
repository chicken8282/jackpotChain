# JackpotChain 블록/트랜잭션 전파: P2P 네트워크는 어떻게 작동하는가

## 왜 이 기술/구조인가?

중앙 서버 없이 수십~수백 개의 노드가 동일한 블록체인 상태를 공유하려면, 새 블록과 트랜잭션이 **모든 노드에 빠르고 안정적으로 도달**해야 한다. 그렇다고 발신자가 모든 노드에 직접 전송(브로드캐스트)하면 어떻게 될까?

예를 들어 노드가 100개라면 새 블록 하나를 모두에게 보내려면 99번의 전송이 필요하다. 모든 노드가 이렇게 동작하면 트래픽이 O(n²)으로 폭발한다. 또한 발신자가 모든 노드의 주소를 알고 있어야 하는데, P2P 네트워크에서 이는 불가능하다.

**Gossip Protocol(가십 프로토콜)** 은 이 문제를 해결한다: 각 노드는 메시지를 수신하면 자신이 연결된 이웃 피어에게만 전달(relay)한다. 각 노드의 전파 범위는 작지만, 전체 네트워크는 몇 번의 홉만으로 모든 노드에 도달한다.

> **용어 — Gossip Protocol:** 소문이 퍼지듯 각 노드가 이웃 노드에게 정보를 전달하고, 그 이웃이 또 자신의 이웃에게 전달하는 방식으로 네트워크 전체에 정보를 퍼뜨리는 알고리즘. 중앙 코디네이터 없이 높은 내결함성을 가진다.

### NETWORK_MAGIC 바이트의 역할

JackpotChain의 모든 메시지 헤더에는 4바이트 매직 값이 포함된다:

```python
# constants.py
NETWORK_MAGIC = b'\x4a\x50\x43\x48'  # ASCII: JPCH (JackpotChain)
```

> **용어 — Network Magic:** P2P 메시지 헤더에 포함되는 네트워크 식별자. 다른 블록체인의 노드(예: 비트코인 노드)와 연결됐을 때 메시지를 잘못 처리하는 것을 방지한다. 매직 값이 다른 메시지는 파싱 즉시 폐기된다.

```python
# network/protocol.py — parse_message()
if header.magic != NETWORK_MAGIC:
    return None, b''
```

이 한 줄이 다른 블록체인 네트워크와의 크로스 오염을 막는다. 테스트넷과 메인넷이 서로 다른 매직 값을 쓰면 같은 포트에서 동작해도 혼선이 없다.

---

## 어떻게 동작하는가

### 1. 메시지 포맷: 24바이트 헤더 + 페이로드

모든 P2P 메시지는 고정 24바이트 헤더로 시작한다:

```python
# network/protocol.py
@dataclass
class MessageHeader:
    magic: bytes = NETWORK_MAGIC   # 4 bytes — 네트워크 식별자
    command: bytes = b'\x00' * 12  # 12 bytes — 명령어 (null 패딩)
    length: int = 0                # 4 bytes — 페이로드 크기
    checksum: bytes = b'\x00' * 4  # 4 bytes — SHA256d의 앞 4바이트
```

체크섬은 페이로드의 double SHA-256 해시 앞 4바이트다. TCP는 신뢰성 있는 프로토콜이지만 버퍼 조합 과정에서 데이터가 잘릴 수 있어, `parse_message()`에서 체크섬과 길이를 동시에 검증한다:

```python
# network/protocol.py — parse_message()
checksum = hashlib.sha256(hashlib.sha256(payload).digest()).digest()[:4]
if checksum != header.checksum:
    return None, b''
```

### 2. 핸드셰이크: VERSION → VERACK

두 노드가 처음 연결되면 서로의 프로토콜 버전, 체인 높이, 서비스 플래그를 교환한다:

1. 아웃바운드 노드가 `VERSION` 메시지를 전송한다. `start_height` 필드에 자신의 현재 체인 높이가 포함된다.
2. 상대방이 `VERSION`으로 응답하고 `VERACK`을 전송한다.
3. 아웃바운드 노드도 `VERACK`을 전송하면 핸드셰이크가 완료된다.

```python
# network/node.py — _handle_verack()
async def _handle_verack(self, address: PeerAddress):
    self.peer_manager.update_peer_state(address, PeerState.READY)
    self.discovery.mark_good(address)  # 연결 성공 기록
    await self._send_getaddr(address)   # 피어 주소 요청
    await self._check_sync(address)    # 동기화 필요 여부 확인
```

`VERACK` 완료 시 `PeerState.READY`로 전환된다. 이 상태가 아닌 피어와는 실질적 데이터 교환을 하지 않는다.

### 3. INV → GETDATA → DATA 흐름

트랜잭션이나 블록의 존재를 알리는 것(announce)과 실제 데이터를 전송하는 것은 분리되어 있다. 이 2단계 구조가 **Gossip 프로토콜의 핵심 효율화 기법**이다.

> **용어 — INV (Inventory) 메시지:** "내가 다음 해시의 트랜잭션/블록을 갖고 있다"는 존재 알림 메시지. 상대방이 이미 알고 있다면 데이터 요청을 하지 않으므로 불필요한 중복 전송이 없다.

```
[Node A가 새 TX를 받았을 때]
  A → B: INV(tx_hash)         # "이 TX 있어"
  B → A: GETDATA(tx_hash)     # "그거 줘" (없는 경우만)
  A → B: TX(실제 데이터)       # 실제 전송
  B → C: INV(tx_hash)         # B가 다시 이웃에게 전파
```

블록도 동일한 패턴이다. 이미 해당 해시의 블록/TX를 가진 노드는 GETDATA를 보내지 않으므로 동일 데이터가 같은 연결로 두 번 전송되는 일이 없다:

```python
# network/node.py — _handle_inv()
for item in inv_msg.items:
    if item.inv_type == InvType.TX:
        if self.mempool and not self.mempool.has_tx(item.hash):
            tx_to_fetch.append(item)  # mempool에 없을 때만 요청
```

### 4. Mempool: 블록에 포함되기 전 대기실

> **용어 — Mempool (Memory Pool):** 아직 블록에 포함되지 않은 트랜잭션의 임시 저장소. "미확인 트랜잭션 풀"이라고도 한다. 채굴자는 mempool에서 트랜잭션을 골라 다음 블록을 구성한다.

Mempool은 단순한 저장소가 아니다. 여러 역할을 한다:

**수수료 기반 우선순위 정렬:** 채굴자는 `get_txs_for_block()`을 호출해 수수료율(satoshi/byte) 높은 순으로 정렬된 트랜잭션 목록을 받는다:

```python
# mempool/pool.py — get_txs_for_block()
sorted_entries = sorted(
    self._entries.values(),
    key=lambda e: e.fee_rate,
    reverse=True
)
```

**의존성 해결:** TX-A의 출력을 참조하는 TX-B는 TX-A가 먼저 블록에 포함되어야 한다. `depends_on` 집합으로 의존 관계를 추적하고, 부모가 포함되지 않은 자식은 `deferred`로 미뤄두었다가 부모 포함 후 재시도한다.

**용량 관리:** `MAX_MEMPOOL_SIZE = 300MB`. 한계에 도달하면 수수료율이 가장 낮은 트랜잭션부터 제거한다(`_evict_low_fee()`). 이는 스팸 방지와 함께 이용자들이 자연스럽게 적정 수수료를 설정하도록 유도한다.

**이중지불 방지:** `_spent_outpoints` 딕셔너리로 mempool 내에서도 같은 UTXO를 소비하려는 두 번째 트랜잭션을 거부한다.

### 5. 블록 전파: 수신 → 검증 → 체인 추가 → 릴레이

새 블록을 받으면 즉시 릴레이하지 않는다. **검증 후 릴레이**가 원칙이다. 검증하지 않고 릴레이하면 악의적인 노드가 유효하지 않은 블록을 온 네트워크에 퍼뜨릴 수 있다.

```python
# network/node.py — _handle_block() (SYNCED 상태)
# 1. 블록 파싱 (역직렬화)
block, _ = Block.deserialize(payload)

# 2. 이전 블록이 메인 체인에 없으면 버퍼에 저장 (orphan 처리)
if prev_hash != bytes(32) and not self.blockchain.is_in_main_chain(prev_hash):
    self._block_buffer[block_hash] = block
    return

# 3. 체인에 추가 (내부적으로 PoW 검증, Merkle 검증 수행)
if self._on_block:
    self._on_block(block, peer)

# 4. 블록에 포함된 TX를 mempool에서 제거
for tx in block.transactions[1:]:
    self.mempool.remove_tx(tx.get_txid())

# 5. 다른 피어들에게 릴레이 (보낸 피어 제외)
await self._relay_block(block, exclude=address)
```

체인에 블록을 추가하는 단계(`_on_block` 콜백)에서 PoW 검증(해시 < target), Merkle root 검증, 트랜잭션 유효성 검증이 모두 수행된다. 이 중 하나라도 실패하면 해당 블록은 버려지고 릴레이되지 않는다.

### 6. Orphan Block: 부모 없는 블록

네트워크 지연으로 블록 N+1이 블록 N보다 먼저 도착할 수 있다. 이 경우 N+1은 메인 체인에 연결할 수 없는 **고아 블록(orphan block)** 이 된다.

> **용어 — Orphan Block:** 참조하는 이전 블록이 아직 자신의 체인에 없는 블록. 부모 블록이 도착하면 연결될 수 있어 즉시 버리지 않고 임시 버퍼에 보관한다.

JackpotChain은 `_block_buffer` 딕셔너리로 orphan block을 관리한다:

```python
# network/node.py
MAX_BLOCK_BUFFER_SIZE = 1000  # 메모리 누수 방지

# 부모가 없으면 버퍼에 저장
self._block_buffer[block_hash] = block

# 새 블록이 처리될 때마다 버퍼를 순회해 연결 가능한 블록 처리
processed = True
while processed:
    processed = False
    for buf_hash, buf_block in list(self._block_buffer.items()):
        if self.blockchain.is_in_main_chain(buf_block.header.prev_block_hash):
            if self._on_block:
                self._on_block(buf_block, peer)
            del self._block_buffer[buf_hash]
            processed = True
            break
```

버퍼 크기가 1000에 도달하면 가장 오래된 블록부터 제거해 메모리 누수를 방지한다.

### 7. 헤더 우선 동기화 (Header-First Sync)

처음 네트워크에 참여하거나 오래 오프라인 상태였던 노드는 수백~수천 개의 블록을 다운로드해야 한다. 이를 **IBD(Initial Block Download)** 라 한다.

> **용어 — IBD (Initial Block Download):** 노드가 최초 참여하거나 오랜 오프라인 후 재연결 시 전체 블록체인을 동기화하는 과정. 수 GB의 데이터를 다운로드해야 할 수 있다.

단순히 모든 블록을 순서대로 받으면 한 피어의 속도에 종속된다. JackpotChain은 **헤더 우선 동기화**를 사용한다:

1. `GETHEADERS` 메시지로 먼저 **80바이트 헤더만** 최대 2000개씩 받는다.
2. 헤더의 PoW 검증만으로 "이 헤더가 올바른 체인에 속하는지" 빠르게 확인한다.
3. 검증된 헤더 목록을 확보한 뒤, 여러 피어로부터 블록 데이터를 **병렬 다운로드**한다.

```python
# network/node.py — _handle_getheaders()
# 공통 블록 찾기
for block_hash in msg.block_locator:
    index = self.blockchain.get_block_index(block_hash)
    if index and index.is_in_main_chain:
        start_height = index.height + 1
        break

# 헤더만 수집 (최대 2000개)
for height in range(start_height, min(start_height + 2000, current_height + 1)):
    block = self.blockchain.get_block_by_height(height)
    headers.append(block.header.serialize())  # 80바이트만 전송
```

> **용어 — Block Locator:** `GETHEADERS`/`GETBLOCKS` 메시지에 포함되는 자신이 알고 있는 블록 해시 목록. 최근 블록부터 점점 간격을 늘려 포크 분기점을 효율적으로 찾는다.

### 8. Webhook: 새 블록 확정 시 백엔드 알림

JackpotChain의 서버 노드(EC2)는 **채굴하지 않는 관찰자(Observer)** 다. 새 블록이 도착해 체인에 추가되면 백엔드 서버에 HTTP POST로 알림을 보낸다. 이것이 `set_block_callback()` 메커니즘이다:

```python
# network/node.py
def set_block_callback(self, callback: Callable):
    """블록 수신 콜백 설정"""
    self._on_block = callback

# 블록 처리 시
if self._on_block:
    self._on_block(block, peer)
```

백엔드는 이 콜백을 통해 새 블록이 확정됐음을 알고, 로또 당첨 여부 계산, 프론트엔드 업데이트, 데이터베이스 기록 등을 수행한다. 블록체인 노드와 백엔드가 폴링(주기적 조회) 대신 이벤트 기반으로 통신하므로 응답 지연이 최소화된다.

### 9. 피어 관리: Ban Score와 연결 한계

악의적이거나 불안정한 피어에 대응하는 두 가지 메커니즘이 있다:

**Ban Score:** 잘못된 데이터를 보내는 피어에게 점수를 누적한다. 100점에 도달하면 24시간 동안 해당 IP를 차단한다:

```python
# network/peer.py — add_ban_score()
def add_ban_score(self, address, score, threshold=100):
    if address in self._peers:
        self._peers[address].ban_score += score
        if self._peers[address].ban_score >= threshold:
            self.ban_peer(address.ip)  # 24시간 ban
            return True
    return False
```

**연결 한계:** `MAX_OUTBOUND_CONNECTIONS = 8`, `MAX_INBOUND_CONNECTIONS = 32` (환경변수로 오버라이드 가능). 무한 연결을 막아 DDoS와 리소스 고갈을 방지한다. 아웃바운드 8개는 자신이 적극적으로 연결 유지하는 "신뢰할 피어" 수이고, 인바운드 32개는 다른 노드의 연결 요청을 수용하는 상한선이다.

---

## 한계와 트레이드오프

**검증 전 릴레이 불가:** 모든 블록을 검증 후 릴레이하므로 전파가 느릴 수 있다. 비트코인의 Compact Block 릴레이처럼 헤더만 먼저 릴레이하고 바디를 병렬 요청하는 최적화가 가능하지만 현재 미구현이다.

**Orphan Block 메모리:** `_block_buffer`가 1000개로 제한되어 있지만, 악의적인 노드가 고의로 연결 불가능한 블록을 다량 전송해 버퍼를 채울 수 있다. PoW 검증을 먼저 수행해 최소한의 작업량이 증명된 블록만 버퍼에 넣는 보완이 필요하다.

**NAT 환경:** 대부분의 사용자는 NAT 뒤에 있어 직접 인바운드 연결이 불가능하다. JackpotChain은 PCP/NAT-PMP/UPnP/Hole Punching을 순서대로 시도하는 `NATManager`를 구현했지만, 일부 환경에서는 아웃바운드 전용으로 동작한다.

**Observer 노드 단일 장애점:** Webhook 알림이 EC2 단일 노드에 의존하므로 해당 노드가 다운되면 백엔드가 새 블록을 알지 못한다. 다중 Observer 노드와 폴백 메커니즘이 필요하다.

---

## 면접 Q&A

**Q1. 두 노드가 동시에 서로 다른 블록을 전파하면 네트워크는 어떻게 반응하는가?**

A. 각 노드는 먼저 받은 블록을 자신의 체인에 추가하고 이웃에게 릴레이한다. 따라서 네트워크가 일시적으로 두 개의 경쟁 체인으로 분리된다. 이후 어느 한쪽에서 다음 블록이 채굴되면 그 체인의 total_work가 높아진다. 다른 쪽 체인을 따르던 노드들은 더 높은 total_work의 체인을 수신하면 `_reorganize()`를 통해 자신의 체인을 전환한다. 결국 네트워크는 하나의 체인으로 수렴한다. 이런 일시적 분기를 **자연 포크(Natural Fork)** 라 하며 PoW에서 정상적인 현상이다.

**Q2. Mempool에 있는 트랜잭션과 블록에 포함된 트랜잭션의 차이는?**

A. Mempool의 트랜잭션은 "아직 블록체인에 영구 기록되지 않은" 상태다. UTXO set에 아직 반영되지 않았으며, 언제든 거부되거나 대체될 수 있다. 반면 블록에 포함된 트랜잭션은 UTXO set에 적용되었고, 이후 블록이 쌓일수록 되돌리기가 어려워진다(확인 수 = confirmation). 블록이 체인에 추가될 때 `mempool.remove_confirmed_txs()`가 호출되어 포함된 트랜잭션들이 mempool에서 제거된다.

**Q3. 검증 전 릴레이를 하지 않는 이유는 무엇인가?**

A. 악의적인 노드가 유효하지 않은 블록(예: 잘못된 PoW, 이중지불 포함)을 생성해 네트워크에 유포하려 한다고 가정하자. 모든 노드가 검증 없이 즉시 릴레이하면 단 하나의 악의적 노드가 연결된 모든 노드에 쓰레기 데이터를 퍼뜨릴 수 있다. 이는 정상 블록의 전파를 방해하고 네트워크 자원을 낭비시키는 DoS 공격으로 이어진다. 검증 후 릴레이는 전파 속도를 약간 희생하는 대신 네트워크 전체의 무결성을 보호한다.

**Q4. Orphan Block은 어떻게 처리되며, 무한히 쌓이지 않도록 어떻게 관리하는가?**

A. 이전 블록 해시가 자신의 메인 체인에 없는 블록이 도착하면 `_block_buffer` 딕셔너리에 임시 저장한다. 새 블록이 정상 처리될 때마다 버퍼를 순회해 이제 연결 가능해진 블록이 있는지 확인하고 처리한다. 메모리 누수를 방지하기 위해 `MAX_BLOCK_BUFFER_SIZE = 1000`로 제한하며, 초과 시 가장 오래된 블록부터 제거한다. 이상적으로는 PoW 검증을 먼저 수행해 작업량이 증명되지 않은 고아 블록은 버퍼에 넣지 않아야 하지만, 현재 구현에서는 먼저 버퍼에 넣는다.

**Q5. INV-GETDATA-DATA의 2단계 흐름을 왜 사용하는가? 처음부터 데이터를 전송하면 안 되는가?**

A. 네트워크에서 하나의 트랜잭션은 여러 경로로 전파된다. 예를 들어 Alice의 노드가 Bob과 Carol 모두에게 연결되어 있다면, Alice에서 Bob으로, Bob에서 Alice로, Alice에서 Carol로 같은 트랜잭션이 전달될 수 있다. INV를 먼저 보내면 수신자가 "이미 가지고 있으면 GETDATA 안 보냄"으로 중복 데이터 전송을 차단한다. 직접 데이터를 전송하면 이미 알고 있는 트랜잭션도 반복해서 수신하게 되어 대역폭이 낭비된다. 특히 1MB 블록을 중복 수신하는 것은 수백 KB의 낭비다.

**Q6. NETWORK_MAGIC 바이트만으로 네트워크 격리가 충분한가? 추가적인 보호 수단은?**

A. NETWORK_MAGIC은 서로 다른 블록체인 간의 우발적 혼선을 막는 1차 방어선이다. 하지만 동일한 매직 값을 사용하는 악의적 클라이언트가 연결을 시도할 수 있다. 추가 보호 수단으로: `VersionMessage`의 `user_agent` 필드(`/JackpotChain:0.1.0/`)로 클라이언트 식별, Ban Score 시스템으로 반복적으로 잘못된 데이터를 보내는 피어 차단, 연결 수 제한(`max_outbound`, `max_inbound`)으로 DDoS 방어가 있다. 근본적인 보호는 블록과 트랜잭션의 구조적 검증에서 온다.

**Q7. Webhook 패턴을 사용하는 이유는 무엇이며 어떻게 구현되어 있는가?**

A. 서버 노드는 새 블록을 즉시 알아야 하는 백엔드 서버와 통신해야 한다. 백엔드가 주기적으로 노드에 "새 블록 있어요?" 폴링하는 방식은 짧은 간격으로 폴링하면 불필요한 네트워크 부하가 발생하고, 긴 간격이면 응답 지연이 생긴다. Webhook은 이벤트 발생 시 즉시 통보하는 **push 방식**이다. 구현은 간단하다: `node.set_block_callback(notify_backend)`으로 콜백 함수를 등록하면, `_handle_block()`의 `if self._on_block: self._on_block(block, peer)` 호출 시 백엔드로 HTTP POST 요청이 전송된다. 블록체인 노드 코드는 콜백이 무엇을 하는지 알 필요 없어 결합도가 낮다.
