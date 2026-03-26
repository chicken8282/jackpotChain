# JackpotChain 합의 메커니즘: 왜 PoW인가

## 왜 이 기술/구조인가?

JackpotChain은 **복권(Lotto)** 을 블록체인 위에서 구현한 프로젝트다. 당첨 번호는 미래 블록 해시의 마지막 hex 자리를 조합해 결정된다. 이 단순해 보이는 설계가 합의 알고리즘 선택에 결정적인 제약을 가한다.

만약 블록 생산자가 **사전에 누구인지 알 수 있다면**, 그는 자신에게 유리한 해시가 나올 때까지 블록 내용을 조작해 당첨 결과를 조정할 수 있다. 이를 **grinding attack(연마 공격)** 이라고 부른다.

> **용어 — Grinding Attack:** 블록 생산자가 트랜잭션 포함 여부, 타임스탬프, 기타 가변 필드를 조금씩 바꿔가며 자신에게 유리한 블록 해시가 나올 때까지 반복 시도하는 공격. PoS와 PoA에서 특히 위험하다.

### PoA를 선택하지 않은 이유

PoA(Proof of Authority)는 허가된 검증자 목록이 고정되어 있다. 블록 N+3을 어느 검증자가 생산할지 미리 계산 가능하다. 해당 검증자는 자신이 로또에 참여한 상태에서 "내가 원하는 해시가 나오는 블록"을 선택해 제출할 수 있다. 비록 블록 내용 자체를 조작하는 것은 서명으로 막히지만, 타임스탬프나 트랜잭션 순서 변경만으로도 해시가 달라진다. 무엇보다 블록을 아예 **withhold(보류)** 했다가 재시도하는 것도 가능하다.

### PoS를 선택하지 않은 이유

PoS(Proof of Stake)는 스테이크 양에 비례해 블록 제안 확률이 결정된다. 검증자는 여러 가지 미세 조정(nonce, 타임스탬프, 가스 한도 등)을 통해 블록 해시를 다르게 만들고, 자신에게 유리한 결과가 나올 때까지 반복할 수 있다. 이 비용은 이더리움 Beacon Chain도 인정한 문제로, Randao 믹서를 추가해 보완한다. JackpotChain은 그런 복잡한 보조 장치 없이 공정한 난수를 확보해야 하므로 PoS를 채택하지 않았다.

### PoW를 선택한 이유

PoW(Proof of Work)에서는 블록 해시가 **채굴 결과 자체**다. 채굴자는 해시를 조작하는 것이 아니라 해시를 찾아야 한다. 원하는 해시를 "만들려면" 그에 상응하는 연산 비용을 지불해야 한다. 즉, grinding attack의 비용이 경제적으로 비현실적인 수준이 된다.

---

## 어떻게 동작하는가

### 1. 채굴 루프: nonce 탐색

블록 헤더는 80바이트 고정 구조체다. `version(4) + prev_block_hash(32) + merkle_root(32) + timestamp(4) + difficulty_target(4) + nonce(4)`. 채굴자는 이 헤더의 double SHA-256 해시가 목표값(target) 미만이 될 때까지 nonce를 0부터 순차적으로 증가시킨다.

```python
# consensus/miner.py — mine_block()
for nonce in range(max_nonce + 1):
    block.header.nonce = nonce
    block._hash = None
    hash_int = int.from_bytes(block.get_hash(), 'big')
    if hash_int < target:
        return MiningResult(success=True, block=block, nonce=nonce)
```

> **용어 — Double SHA-256:** SHA-256을 두 번 연속 적용하는 해시 함수. `hash = SHA256(SHA256(data))`. 비트코인이 사용하는 방식으로, 단일 해시의 length-extension attack을 차단하고 일부 양자 컴퓨팅 공격에 대한 저항성을 높인다.

nonce는 4바이트(0 ~ 4,294,967,295)이므로 약 43억 가지 경우의 수를 탐색할 수 있다. 이 범위를 모두 소진하면 채굴에 실패한다. 이 경우 **타임스탬프를 1초 증가**시켜 헤더 전체가 달라지게 만든 뒤 nonce를 처음부터 다시 탐색한다. 타임스탬프를 바꾸면 merkle root는 그대로지만 헤더 해시 공간 자체가 완전히 달라진다.

### 2. Compact 난이도 포맷

4바이트만으로 256비트 target을 표현하는 것은 불가능하다. 비트코인 방식의 **compact format**을 사용해 이 문제를 해결한다.

```python
# consensus/difficulty.py — compact_to_target()
exponent    = compact >> 24          # 상위 1바이트: 지수
coefficient = compact & 0x00ffffff   # 하위 3바이트: 계수
target = coefficient << (8 * (exponent - 3))
```

예를 들어 초기 난이도 `0x1e200000`의 경우:
- `exponent = 0x1e = 30`
- `coefficient = 0x200000`
- `target = 0x200000 << (8 × 27)` → 매우 큰 256비트 정수

target이 클수록 만족하기 쉬워 난이도가 낮다. 반대로 target이 0에 가까울수록 해시가 그 이하여야 하므로 난이도가 높다.

`BlockHeader.get_target()` 메서드가 동일한 로직을 구현한다:

```python
# core/block.py — BlockHeader.get_target()
exponent = self.difficulty_target >> 24
coefficient = self.difficulty_target & 0x00ffffff
if exponent <= 3:
    target = coefficient >> (8 * (3 - exponent))
else:
    target = coefficient << (8 * (exponent - 3))
```

### 3. 난이도 자동 조절

| 상수 | 값 | 의미 |
|---|---|---|
| `BLOCK_TIME_TARGET` | 30초 | 목표 블록 생성 간격 |
| `DIFFICULTY_ADJUSTMENT_INTERVAL` | 50블록 | 조절 주기 |
| `MAX_DIFFICULTY_CHANGE` | 4배 | 한 번에 변화 가능한 최대 배수 |
| `INITIAL_DIFFICULTY` | `0x1e200000` | 테스트넷 초기 난이도 |

매 50블록마다 직전 50블록이 실제로 걸린 시간과 목표 시간(50 × 30초 = 1,500초)의 비율로 target을 조정한다:

```python
# consensus/difficulty.py — calculate_new_difficulty()
ratio = actual_time / expected_time
ratio = clamp(ratio, 1/MAX_DIFFICULTY_CHANGE, MAX_DIFFICULTY_CHANGE)
new_target = int(prev_target * ratio)
```

**왜 4배로 제한하는가?** 네트워크에서 대다수 채굴자가 갑자기 이탈하거나 진입하면 채굴 속도가 급격히 변한다. 제한 없이 조정하면 단 한 번의 조절로 난이도가 100배 떨어지거나 오를 수 있고, 이는 **블록 시간 폭주** 또는 **채굴 불가 상태**로 이어진다. 4배 제한은 극단적인 변화를 방지하면서도 네트워크가 현실적인 속도로 적응하도록 한다.

### 4. 체인 선택: total_work

두 체인이 경쟁할 때 JackpotChain은 블록 개수가 아니라 **누적 작업량(total_work)** 으로 더 강한 체인을 결정한다.

```python
# consensus/chain.py — add_block() chain selection
new_work = prev_work + (2**256) // (target + 1)
if new_work > self._main_tip.total_work:
    if old_tip.block_hash != prev_hash:
        self._reorganize(old_tip.block_hash, block_hash)
```

> **용어 — Total Work:** 각 블록의 작업 난이도를 `2^256 / (target + 1)`로 환산한 값의 누적 합. target이 낮을수록(난이도가 높을수록) 값이 커진다.

블록 개수로 비교하면 낮은 난이도로 빠르게 많은 블록을 만들어 체인을 교체할 수 있다. total_work를 사용하면 **실제로 더 많은 전기/연산을 투자한 체인이 승리**하므로 이 공격이 차단된다.

### 5. 체인 재조직 (Reorg)

더 긴 체인이 발견되면 `_reorganize()`가 호출된다. 이 함수는:

1. 두 체인의 **공통 조상(common ancestor)** 을 찾는다.
2. 현재 메인 체인의 블록을 공통 조상까지 **역순으로 disconnect** 한다. 이때 각 블록의 `undo_data`에 저장된 소비된 UTXO를 **복원**하고, 새로 생성된 UTXO를 **제거**한다.
3. 새 체인의 블록을 공통 조상부터 순서대로 **connect** 한다.

> **용어 — Undo Data:** 블록을 처리할 때 소비된(제거된) UTXO 목록을 별도로 저장해두는 데이터. Reorg 시 블록을 "되돌리기" 위해 이 목록을 다시 UTXO set에 삽입한다. `UTXOSet.apply_transaction()`이 `spent_utxos`를 반환하는 이유가 이것이다.

`UTXOSet.revert_transaction()`이 이 패턴을 구현한다:

```python
# core/utxo.py — revert_transaction()
def revert_transaction(self, tx, spent_utxos, get_address_from_script=None):
    tx_id = tx.get_txid()
    # 출력 UTXO 제거 (이 블록이 생성한 것)
    for idx in range(len(tx.outputs)):
        self.remove_utxo(tx_id, idx)
    # 입력 UTXO 복원 (이 블록이 소비한 것)
    for utxo in spent_utxos:
        address = None
        if get_address_from_script:
            address = get_address_from_script(utxo.output.script_pubkey)
        self.add_utxo(utxo, address)
```

---

## 한계와 트레이드오프

**에너지 소비:** PoW는 본질적으로 연산 낭비를 통해 신뢰를 확보한다. 테스트넷 수준의 난이도(`0x1e200000`)는 소비 전력이 미미하지만, 실제 네트워크로 확장하면 에너지 문제가 발생한다.

**51% 공격 취약성:** 네트워크 전체 해시레이트의 51% 이상을 장악하면 이중지불이 가능하다. 블록을 비밀리에 채굴해 쌓은 뒤 한꺼번에 공개하면 total_work가 높아 메인 체인을 교체할 수 있다. 단, JackpotChain의 로또 결과는 블록 해시의 **마지막 hex 자리 하나**로만 결정되므로, 51% 공격자도 원하는 정확한 결과를 낼 확률은 1/16에 불과하다. 완전히 막을 수는 없지만 비용 대비 기대 수익이 낮아진다.

**nonce 공간 한계:** 4바이트 nonce는 43억 번밖에 탐색할 수 없다. 고성능 ASIC이 이 범위를 1초 이내에 소진한다. 현재 구현은 타임스탬프를 1초씩 증가시켜 탐색 공간을 확장한다. 이는 실용적이지만 타임스탬프 조작 가능성을 열어두는 트레이드오프다.

**느린 재조직:** Reorg 깊이가 깊을수록 UTXO 되돌리기 비용이 증가한다. 현재 메모리 기반 UTXO set은 50블록 이상의 deep reorg에서 성능 이슈가 발생할 수 있다.

---

## 면접 Q&A

**Q1. JackpotChain이 PoA나 PoS 대신 PoW를 선택한 핵심 이유는 무엇인가?**

A. 당첨 번호가 미래 블록 해시로 결정되기 때문이다. PoA나 PoS에서는 블록 생산자가 사전에 확정되어 있어 자신에게 유리한 블록 해시가 나올 때까지 미세 조정(타임스탬프 변경, 트랜잭션 순서 변경 등)을 반복하는 grinding attack이 가능하다. PoW는 원하는 해시를 "만들기" 위해 그에 비례하는 연산 비용을 지불해야 하므로 이 공격의 경제성을 제거한다.

**Q2. total_work로 체인을 선택하는 이유가 단순히 블록 개수로 선택하는 것과 어떻게 다른가?**

A. 블록 개수로 비교하면 낮은 난이도에서 빠르게 많은 블록을 생산해 메인 체인을 교체하는 공격이 가능하다. `total_work = Σ(2^256 / (target+1))`은 각 블록 생산에 실제로 투입된 연산량을 수치화한 것이다. 높은 난이도 블록 하나가 낮은 난이도 블록 여러 개보다 높은 total_work를 가질 수 있어, 체인 선택이 실제 투입 자원을 정확히 반영한다.

**Q3. 난이도 조절에 4배 제한을 두는 이유는 무엇인가?**

A. 급격한 해시레이트 변화(예: 대형 채굴 풀의 갑작스런 이탈)가 발생할 때 무제한 조절을 허용하면 단 한 번의 조절 주기에 난이도가 수십 배 변할 수 있다. 이는 블록 생성 시간이 수 분에서 수 시간으로 폭주하거나 반대로 거의 0에 가까워지는 불안정 상태를 만든다. 4배 제한은 극단적 상황에서도 네트워크가 점진적으로 균형을 찾도록 한다.

**Q4. 51% 공격이란 무엇이고, JackpotChain에서 공격자가 로또 결과를 조작하려면 어느 정도의 비용이 필요한가?**

A. 전체 네트워크 해시레이트의 51% 이상을 확보하면 비밀리에 더 빠르게 블록을 쌓아 어느 시점에 공개해 메인 체인을 교체할 수 있다. 이를 통해 이미 사용한 트랜잭션을 없었던 것으로 만드는 이중지불이 가능하다. 그러나 JackpotChain의 로또 결과는 블록 해시의 마지막 hex 자리(0~15)로 결정되므로, 51% 공격자가 특정 결과를 만들 확률은 `1/16 = 6.25%`다. 6자리 모두를 맞추려면 `(1/16)^6 ≈ 0.000023%`의 확률이므로 공격 비용 대비 기대 수익이 극히 낮다.

**Q5. nonce가 소진되면 어떻게 처리하는가?**

A. 4바이트 nonce(0 ~ 2^32-1)를 모두 소진해도 유효한 해시를 찾지 못하면, 타임스탬프를 1초 증가시켜 헤더 전체를 변경한 뒤 nonce를 처음(0)부터 다시 시작한다. 타임스탬프가 바뀌면 헤더 직렬화 결과가 완전히 달라지므로, 실질적으로 새로운 해시 공간에서 탐색을 시작하는 효과가 있다. 단, 타임스탬프를 지나치게 앞으로 설정하면 노드가 블록을 거부할 수 있으므로(최대 미래 허용: 2시간) 실질적인 nonce 확장 범위에는 한계가 있다.

**Q6. compact 포맷은 왜 사용하는가? 256비트 target을 그대로 저장하면 안 되는가?**

A. 블록 헤더는 80바이트 고정 구조여야 한다. 모든 노드가 헤더만으로 PoW를 빠르게 검증할 수 있고, 네트워크 전송 효율도 높다. 256비트(32바이트) target을 그대로 저장하면 헤더 크기가 108바이트로 늘어난다. compact 포맷은 부동소수점 표현 방식과 유사하게 `계수 × 2^지수`로 256비트 범위를 4바이트에 표현한다. 정밀도 손실이 있지만 난이도 조절 단위가 충분히 세밀하므로 실용적인 트레이드오프다.

**Q7. Reorg 시 UTXO 안전성은 어떻게 보장하는가? undo data 패턴을 설명하라.**

A. `apply_transaction()`은 트랜잭션을 UTXO set에 적용하면서 소비한 UTXO 목록(`spent_utxos`)을 반환한다. 체인이 블록을 저장할 때 이 목록을 `undo_data`로 함께 기록한다. Reorg가 발생하면 `_reorganize()`가 분기점부터 현재 tip까지의 블록을 역순으로 순회하며 각 블록의 `undo_data`를 사용해 `revert_transaction()`을 호출한다. 이 함수는 해당 블록이 생성한 UTXO를 삭제하고, 소비한 UTXO를 복원한다. 이 과정이 정확하게 역순으로 수행되어야 이중지불이나 UTXO 누락 없이 이전 상태로 되돌아갈 수 있다.
