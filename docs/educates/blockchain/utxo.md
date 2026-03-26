# JackpotChain UTXO 모델: 잔액을 왜 "목록"으로 관리하는가

## 왜 이 기술/구조인가?

블록체인에서 잔액을 관리하는 방법은 크게 두 가지다. 이더리움 방식의 **계정 모델(Account Model)** 과 비트코인 방식의 **UTXO 모델(Unspent Transaction Output Model)** 이다.

> **용어 — UTXO (Unspent Transaction Output):** 아직 사용되지 않은 트랜잭션 출력. 비트코인 계열 블록체인에서 "잔액"은 하나의 숫자가 아니라, 내 주소로 향하는 미사용 출력들의 집합이다. 지갑의 총 잔액 = 내 주소 소유 UTXO들의 금액 합산.

JackpotChain이 UTXO를 선택한 이유는 세 가지다:

**첫째, 병렬성.** 계정 모델에서는 Alice가 Bob에게 보내는 트랜잭션과 Alice가 Carol에게 보내는 트랜잭션이 동일한 "Alice의 잔액"이라는 전역 상태를 수정하므로 순서가 중요하다. 반면 UTXO 모델에서 각 트랜잭션은 독립된 UTXO 집합을 소비하고 생성한다. 서로 다른 UTXO를 건드리는 트랜잭션들은 병렬 검증이 가능하다.

**둘째, 이중지불 방지의 단순함.** "이 UTXO가 아직 사용 안 됐는가?"라는 단순 집합 조회만으로 이중지불을 막을 수 있다. 계정 모델처럼 시퀀스 번호나 nonce를 별도로 관리할 필요가 없다.

**셋째, 로또 특수 UTXO 처리.** JackpotChain은 잭팟 풀을 특수 `script_pubkey = b'JACKPOT_POOL'`로 마킹된 UTXO로 관리한다. UTXO 모델에서는 이런 특수 목적 잠금 조건을 `script_pubkey`에 자연스럽게 인코딩할 수 있다.

---

## 어떻게 동작하는가

### 1. UTXO 구조체

```python
# core/utxo.py
@dataclass
class UTXO:
    tx_id: bytes           # 생성한 트랜잭션의 ID (32 bytes)
    output_index: int      # 해당 트랜잭션 내 출력 인덱스
    output: TxOutput       # 실제 데이터 (금액, 에셋, 잠금 스크립트)
    block_height: int = 0  # 포함된 블록 높이 (Coinbase 성숙도 체크용)
    is_coinbase: bool = False
```

UTXO의 고유 식별자는 `(tx_id, output_index)` 쌍이다. 이를 **outpoint**라 한다.

> **용어 — Outpoint:** `(트랜잭션 ID, 출력 인덱스)` 쌍으로 이루어진 UTXO의 전역 고유 식별자. 트랜잭션 입력은 항상 이전 트랜잭션의 outpoint를 참조해 "소비할 UTXO"를 지정한다.

### 2. UTXOSet: 두 개의 인덱스

`UTXOSet`은 두 개의 딕셔너리를 동시에 유지한다:

```python
class UTXOSet:
    def __init__(self):
        # 주 인덱스: outpoint → UTXO 객체
        self._utxos: Dict[Tuple[bytes, int], UTXO] = {}
        # 보조 인덱스: 주소 → outpoint 집합 (빠른 잔액 조회)
        self._by_address: Dict[str, Set[Tuple[bytes, int]]] = {}
```

보조 인덱스 `_by_address`가 없으면 특정 주소의 잔액을 조회할 때 전체 UTXO를 선형 스캔해야 한다. 이는 UTXO set이 커질수록 조회 시간이 O(n)으로 증가하는 성능 병목이다. 보조 인덱스를 두면 O(1)에 가까운 조회가 가능하다.

### 3. 트랜잭션 구조: 입력이 출력을 소비하는 체인

```python
# core/transaction.py
@dataclass
class TxInput:
    prev_tx_id: bytes      # 참조할 이전 트랜잭션 ID
    output_index: int      # 해당 트랜잭션의 몇 번째 출력을 소비할지
    script_sig: bytes      # 잠금 해제 스크립트 (서명)
    sequence: int          # 시퀀스 번호 (SEQUENCE_FINAL = 0xFFFFFFFF)

@dataclass
class TxOutput:
    jack_value: int                   # JACK 금액 (satoshi 단위)
    assets: Dict[str, int]            # 추가 에셋 {asset_id: amount}
    script_pubkey: bytes              # 잠금 스크립트
```

트랜잭션은 기존 UTXO를 `input`으로 소비하고 새 UTXO를 `output`으로 생성한다. **수수료 = 입력 합계 - 출력 합계**다. 차액이 채굴자 보상에 포함된다.

> **용어 — P2PKH (Pay to Public Key Hash):** "공개키 해시에 지불"의 약자. `script_pubkey`에 수신자의 공개키 해시를 포함시켜, 지불 받은 사람만 서명으로 잠금을 해제할 수 있는 가장 일반적인 잠금 스크립트 형식. `OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG` 구조로 이루어진다.

서명 검증 과정에서 `get_signature_hash()`는 Bitcoin의 SIGHASH_ALL 방식을 따른다: 서명할 입력의 `script_sig` 자리에 이전 출력의 `script_pubkey`를 대입하고, 나머지 입력의 `script_sig`는 비운 뒤 전체 트랜잭션을 직렬화해 해시한다:

```python
# core/transaction.py — get_signature_hash()
preimage = tx_copy.serialize() + struct.pack('<I', sighash_type)
return double_sha256(preimage)
```

### 4. apply_transaction: UTXO set 업데이트와 undo data

블록이 처리될 때 `apply_transaction()`이 호출된다. 이 함수는 두 가지 작업을 한다: 입력의 UTXO를 **제거**하고, 출력을 새 UTXO로 **추가**한다. 그리고 소비된 UTXO 목록을 반환한다.

```python
# core/utxo.py — apply_transaction()
def apply_transaction(self, tx, block_height, get_address_from_script=None):
    spent_utxos = []

    if not tx.is_coinbase():
        for inp in tx.inputs:
            spent = self.remove_utxo(inp.prev_tx_id, inp.output_index)
            if spent:
                spent_utxos.append(spent)  # undo용으로 저장

    for idx, out in enumerate(tx.outputs):
        utxo = UTXO(tx_id=tx.get_txid(), output_index=idx,
                    output=out, block_height=block_height,
                    is_coinbase=tx.is_coinbase())
        address = get_address_from_script(out.script_pubkey) if get_address_from_script else None
        self.add_utxo(utxo, address)

    return spent_utxos
```

반환된 `spent_utxos`는 블록에 `undo_data`로 저장된다. Reorg 발생 시 `revert_transaction()`이 이를 사용해 상태를 정확히 되돌린다.

### 5. Coinbase 트랜잭션: 무에서 코인 생성

Coinbase TX는 블록의 첫 번째 트랜잭션으로, **아무 UTXO도 소비하지 않고 새 코인을 발행**한다. 입력의 `prev_tx_id`가 모두 0으로 된 32바이트, `output_index`가 `0xFFFFFFFF`인 것이 판별 기준이다:

```python
# core/transaction.py
def is_coinbase(self) -> bool:
    return (
        len(self.inputs) == 1 and
        self.inputs[0].is_coinbase()
    )

# TxInput
def is_coinbase(self) -> bool:
    return self.prev_tx_id == bytes(32) and self.output_index == 0xFFFFFFFF
```

Genesis 블록의 Coinbase TX는 두 개의 출력을 가진다:
- **Output 0:** 블록 보상 100 JACK → 채굴자
- **Output 1:** 100만 JACK → `b'JACKPOT_POOL'` 특수 스크립트 (잭팟 초기 자금)

> **용어 — Coinbase 성숙도(Coinbase Maturity):** Coinbase TX의 출력은 즉시 사용할 수 없고, `COINBASE_MATURITY = 100`블록이 쌓인 뒤에야 사용 가능하다. 이는 체인 재조직 시 채굴 보상이 무효화되는 상황에서 이미 사용한 코인이 문제를 일으키는 것을 방지한다.

```python
# core/utxo.py
def is_mature(self, current_height: int, coinbase_maturity: int = 100) -> bool:
    if not self.is_coinbase:
        return True
    return (current_height - self.block_height) >= coinbase_maturity
```

### 6. 이중지불 방지

이중지불 방지는 세 겹의 방어선으로 이루어진다:

**첫 번째 방어선 — Mempool:** 새 트랜잭션이 mempool에 들어올 때 `_spent_outpoints` 딕셔너리를 조회한다. 동일한 outpoint를 참조하는 트랜잭션이 이미 있으면 즉시 거부한다:

```python
# mempool/pool.py — add_tx()
for inp in tx.inputs:
    outpoint = (inp.prev_tx_id, inp.output_index)
    if outpoint in self._spent_outpoints:
        return False, f"Double spend: conflicts with {conflicting_txid.hex()}"
```

**두 번째 방어선 — 블록 검증:** 블록을 처리할 때 UTXO set에서 해당 outpoint가 실제로 존재하는지 확인한다. 없으면 트랜잭션 자체가 무효다.

**세 번째 방어선 — `has_utxo()` 체크:** `UTXOSet.has_utxo()`로 소비 전 존재 여부를 확인한다.

### 7. TX 버전 시스템

JackpotChain은 트랜잭션 `version` 필드로 용도를 구분한다:

| 버전 | 상수 | 용도 |
|---|---|---|
| 1 | `TX_VERSION_TRANSFER` | 일반 JACK 전송 |
| 2 | `TX_VERSION_EXCHANGE` | JACK → POT 교환 (단방향) |
| 3 | `TX_VERSION_GACHA_COMMIT` | 로또 Commit (번호 선택) |
| 5 | `TX_VERSION_LOTTO_CLAIM` | 로또 Claim (당첨금 수령) |

버전 3(Commit)은 로또 시스템의 핵심이다. 사용자가 번호를 선택해 블록 N에 commit하면, N+3, N+6, N+9, N+12, N+15, N+18 블록의 해시가 당첨 번호를 결정한다. 버전 5(Claim)는 N+18 이후 N+68 사이에 당첨 증명과 함께 제출된다.

### 8. UTXO set 크기 문제

`total_supply()`와 `utxo_count()`를 보면 현재 구현의 한계가 드러난다:

```python
def total_supply(self) -> int:
    return sum(utxo.output.jack_value for utxo in self._utxos.values())

def utxo_count(self) -> int:
    return len(self._utxos)
```

현재 UTXO set은 **완전히 메모리에 올라간다**. 비트코인 메인넷의 UTXO set은 현재 약 5GB에 달한다. 이 프로젝트는 MVP 단계로 메모리 방식을 택했으며, 주석에도 "추후 LevelDB 등으로 교체 가능"이라고 명시되어 있다.

---

## 한계와 트레이드오프

**UTXO set 비대화:** 사용자가 많은 소액 UTXO를 생성하면 set 크기가 선형으로 증가한다. `MIN_JACK_OUTPUT = 0.01 JACK` 제한으로 먼지 UTXO(dust UTXO) 생성을 방지하지만, 장기적으로는 LevelDB 등 영속성 스토리지가 필요하다.

**보조 인덱스 일관성:** `_utxos`와 `_by_address` 두 인덱스를 항상 동기화해야 한다. `remove_utxo()`에서 주소 인덱스 제거 시 전체 주소를 선형 스캔하는 부분이 있어(`for address, outpoints in self._by_address.items()`) 주소 수가 많아지면 성능 병목이 된다.

**멀티에셋 직렬화 비용:** `TxOutput`이 `assets: Dict[str, int]`를 포함하므로 직렬화 크기가 가변적이다. 단순 JACK 전송도 에셋 맵 크기를 포함해야 한다.

**프라이버시 한계:** UTXO 그래프를 추적하면 자금 흐름을 역추적할 수 있다. 현재 구현은 프라이버시 기능(예: CoinJoin, Confidential Transactions)을 제공하지 않는다.

---

## 면접 Q&A

**Q1. UTXO 모델과 계정 모델의 근본적인 차이는 무엇이며, JackpotChain이 UTXO를 선택한 이유는?**

A. 계정 모델은 이더리움처럼 주소마다 잔액 숫자를 저장한다. "Alice의 잔액 = 100"이 전역 상태다. UTXO 모델은 "Alice가 받은 미사용 출력들의 집합"을 관리한다. JackpotChain이 UTXO를 선택한 주된 이유는 세 가지다: 첫째, 서로 다른 UTXO를 소비하는 트랜잭션들은 독립적으로 병렬 검증이 가능하다. 둘째, 이중지불 방지가 단순한 집합 존재 여부 확인으로 가능해 구현이 명확하다. 셋째, 잭팟 풀 같은 특수 잠금 조건을 `script_pubkey`에 자연스럽게 인코딩할 수 있다.

**Q2. 이중지불이 어떻게 발생하며 JackpotChain은 이를 어떻게 방지하는가?**

A. 이중지불은 동일한 UTXO(outpoint)를 두 개 이상의 트랜잭션에서 입력으로 사용하려는 시도다. 방어는 세 단계에서 이루어진다. (1) Mempool에 트랜잭션이 들어올 때 `_spent_outpoints` 딕셔너리로 같은 outpoint를 이미 참조하는 트랜잭션이 있는지 확인해 즉시 거부한다. (2) 블록 처리 시 UTXO set에서 해당 outpoint가 실제 존재하는지 확인한다. (3) `apply_transaction()`이 입력의 UTXO를 제거하므로, 동일 outpoint를 사용하는 다음 트랜잭션은 UTXO를 찾지 못해 실패한다.

**Q3. Coinbase 성숙도(Coinbase Maturity)는 왜 필요한가?**

A. 블록 보상은 Coinbase TX를 통해 발행된다. 그런데 블록체인은 항상 재조직(Reorg) 가능성이 있다. 만약 채굴자가 보상을 받자마자 즉시 사용한다면, 이후 해당 블록이 포함된 체인이 더 강한 체인으로 대체되어 Coinbase TX 자체가 무효화될 수 있다. 이미 소비된 Coinbase 출력은 UTXO set에 없지만, 그것을 사용해 생성된 다른 UTXO들은 남아 있어 불일치가 발생한다. 100블록 성숙도는 이 깊이의 Reorg가 실용적으로 불가능하다는 경험적 기준이다.

**Q4. UTXO를 병렬로 검증할 수 있다는 것이 실제로 어떤 의미인가?**

A. 블록 내 트랜잭션 TX1이 outpoint A를 소비하고, TX2가 outpoint B를 소비한다면, 두 트랜잭션은 완전히 독립적이다. 서로 다른 UTXO를 건드리므로 어느 쪽이 먼저 처리되어도 결과가 같다. 멀티코어 환경에서 각 코어가 독립적인 트랜잭션 집합을 병렬 검증할 수 있다. 계정 모델에서 Alice가 Bob에게 보내고 Bob이 Carol에게 보내는 두 트랜잭션은 순서가 중요하다. Bob의 잔액이 첫 번째 트랜잭션 이후에 갱신되어야 두 번째가 유효하기 때문이다.

**Q5. UTXO set은 시간이 지날수록 어떻게 변화하며, 이를 관리하기 위한 전략은?**

A. 트랜잭션이 발생할 때마다 소비된 UTXO가 제거되고 새 UTXO가 추가된다. 일반적으로 입력 수 < 출력 수인 트랜잭션(예: 하나를 보내고 거스름돈이 생기는 경우)은 UTXO set을 증가시킨다. 반면 여러 UTXO를 합치는 트랜잭션은 감소시킨다. 현재 JackpotChain은 전체 UTXO set을 메모리에 올리는 MVP 구현이다. 실용적 확장을 위해서는 LevelDB 같은 key-value DB에 영속화하고, 자주 접근하는 UTXO만 캐싱하는 구조가 필요하다. `MIN_JACK_OUTPUT` 제한으로 의미없는 소액 UTXO 생성을 억제하는 것도 관리 전략의 일부다.

**Q6. apply_transaction()이 spent_utxos를 반환하는 이유는 무엇인가?**

A. Reorg 안전성을 위한 설계다. 블록체인에서 어느 블록이든 나중에 재조직으로 제거될 수 있다. 블록을 제거하려면 해당 블록이 UTXO set에 적용한 변경사항을 정확히 되돌려야 한다. `apply_transaction()`이 소비한 UTXO 목록을 반환하면, 이를 `undo_data`로 저장해두었다가 `revert_transaction()` 호출 시 그대로 복원할 수 있다. 이 패턴이 없으면 블록을 되돌리기 위해 제거 전 상태를 통째로 스냅샷으로 저장해야 하므로 메모리 비용이 훨씬 크다.

**Q7. JackpotChain의 TX 버전 시스템에서 버전 2(JACK→POT 교환)가 단방향인 이유는?**

A. POT는 로또 참가권으로 사용되며 소비되면 사라지는 토큰이다. POT를 JACK으로 역교환할 수 있다면 당첨 결과 확인 후 유리할 때만 교환하고 불리하면 POT를 유지하는 차익거래가 가능해진다. 단방향 교환은 로또 참가 결정을 되돌릴 수 없게 만들어 게임의 공정성을 유지한다. `constants.py`의 주석에도 "JACK → POT exchange (one-way only; reverse is not supported)"라고 명시되어 있다.
