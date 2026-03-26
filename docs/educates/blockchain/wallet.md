# JackpotChain 지갑과 암호화 시스템

> 이 문서는 JackpotChain 실제 코드베이스를 기반으로 작성되었습니다.
> `blockchain/crypto/signature.py`, `blockchain/crypto/address.py`, `blockchain/crypto/encryption.py`, `blockchain/wallet/wallet.py`를 직접 참조합니다.

---

## 왜 이 설계인가 — 블록체인 지갑의 본질

블록체인에서 "지갑을 소유한다"는 것은 곧 **개인키를 소유한다**는 의미입니다. 은행 계좌처럼 서버가 소유권을 관리하는 게 아닙니다. 개인키만 있으면 어디서든 코인을 사용할 수 있고, 개인키를 잃으면 코인도 영구히 잃습니다.

이를 구현하기 위해 블록체인은 수학적으로 연결된 세 가지 요소를 사용합니다.

```
private key (32 bytes, 256-bit 난수)
    │
    │ secp256k1 타원곡선 연산 (단방향, 역산 불가)
    ▼
public key (33 bytes, 압축 형태)
    │
    │ SHA256 → RIPEMD-160 → Base58Check 인코딩 (단방향)
    ▼
address ("JACK..." 형태의 문자열)
```

세 값은 수학적으로 연결되어 있지만 역산이 불가능합니다. address를 알아도 private key를 계산할 수 없고, public key를 알아도 private key를 복원할 수 없습니다.

---

## 키 생성 — secp256k1 곡선

> **secp256k1:** 타원곡선 암호화(ECC)에서 사용하는 특정 곡선의 이름. Bitcoin이 채택하여 블록체인 생태계의 표준이 되었습니다. 곡선 방정식은 y² = x³ + 7 (mod p)이며, p는 256비트 소수입니다.

```python
# blockchain/crypto/signature.py
def generate_keypair() -> Tuple[bytes, bytes]:
    """
    Returns: (private_key: 32 bytes, public_key: 33 bytes compressed)
    """
    # 개인키 생성 (32바이트 랜덤) — secrets 모듈 기반 암호학적 난수
    private_key = SigningKey.generate(curve=SECP256k1)

    # 공개키 (압축 형식)
    public_key = private_key.get_verifying_key()

    return (
        private_key.to_string(),                        # 32 bytes
        compress_public_key(public_key.to_string())     # 33 bytes
    )
```

개인키는 단순히 **32바이트(256비트)의 난수**입니다. 단, 0이거나 secp256k1 곡선의 위수(order) n 이상이면 안 됩니다. `secrets` 모듈은 OS의 암호학적 난수 생성기(CSPRNG)를 사용하므로 `random` 모듈보다 예측 불가능합니다.

공개키는 개인키를 secp256k1 곡선의 **생성점 G**에 스칼라 곱하여 얻습니다.

```
public_key = private_key × G
```

곱하는 방향은 쉽지만 역산(public_key에서 private_key 복원)은 이산 로그 문제로 현재 기술로 불가능합니다.

### 공개키 압축 — 왜 33 bytes인가

타원곡선 위의 점은 (x, y) 좌표로 표현됩니다. 비압축 형식은 x(32 bytes) + y(32 bytes) = 64 bytes입니다. 하지만 곡선 방정식 y² = x³ + 7에서 x를 알면 y² 값을 계산할 수 있고, y의 짝수/홀수만 알면 두 후보 중 하나를 선택할 수 있습니다.

```python
def compress_public_key(pubkey_uncompressed: bytes) -> bytes:
    """비압축 공개키(64 bytes) → 압축 공개키(33 bytes)"""
    x = pubkey_uncompressed[:32]
    y = pubkey_uncompressed[32:]

    # y 좌표의 짝/홀로 prefix 결정
    if y[-1] % 2 == 0:
        prefix = b'\x02'  # y가 짝수
    else:
        prefix = b'\x03'  # y가 홀수

    return prefix + x  # 1 + 32 = 33 bytes
```

복원 시에는 x와 prefix만으로 y를 재계산합니다.

```python
def decompress_public_key(pubkey_compressed: bytes) -> bytes:
    prefix = pubkey_compressed[0]
    x = int.from_bytes(pubkey_compressed[1:], 'big')

    # secp256k1: y^2 = x^3 + 7 (mod p)
    p = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F
    y_squared = (pow(x, 3, p) + 7) % p
    y = pow(y_squared, (p + 1) // 4, p)

    if (prefix == 0x02 and y % 2 != 0) or (prefix == 0x03 and y % 2 == 0):
        y = p - y  # 반대쪽 후보 선택

    return x.to_bytes(32, 'big') + y.to_bytes(32, 'big')
```

---

## 주소 유도 — SHA256 → RIPEMD-160 → Base58Check

### 왜 두 번 해시하는가

> **RIPEMD-160:** 160비트(20 bytes) 출력을 갖는 해시 함수. SHA256(32 bytes)보다 짧아 주소를 간결하게 만들면서도 충분한 보안성을 제공합니다.

```python
# blockchain/crypto/address.py
def pubkey_to_address(pubkey: bytes, version: int = VERSION_PUBKEY) -> str:
    """
    공개키 → 주소
    1. SHA256
    2. RIPEMD160
    3. 버전 바이트 추가
    4. 체크섬 추가
    5. Base58 인코딩
    """
    pubkey_hash = hash160(pubkey)  # SHA256 → RIPEMD160
    return base58check_encode(version, pubkey_hash)
```

공개키(33 bytes)를 직접 주소로 쓰지 않고 두 단계 해시를 거치는 이유:

1. **길이 단축:** SHA256 결과(32 bytes)를 RIPEMD-160으로 한 번 더 해시하면 20 bytes. 주소가 짧아집니다.
2. **양자 컴퓨터 저항:** 공개키를 직접 노출하면 양자 컴퓨터가 공개키에서 개인키를 복원할 수 있다는 이론적 위협이 있습니다. 해시된 주소는 공개키를 숨기므로 한 겹의 보호가 추가됩니다 (TX를 보내기 전까지 공개키가 체인에 노출되지 않습니다).
3. **이중 해시:** SHA256 단독보다 SHA256 → RIPEMD-160 조합이 하나의 해시 알고리즘에 치명적 취약점이 발견되더라도 다른 알고리즘이 보호합니다.

### Base58Check — 왜 Base64가 아닌가

> **Base58Check:** 0, O, I, l 등 시각적으로 혼동되기 쉬운 문자를 제외한 58개 문자로 인코딩하고 4바이트 체크섬을 붙이는 형식입니다.

```python
# blockchain/crypto/address.py
BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
# 제외된 문자: 0 (숫자), O (대문자), I (대문자), l (소문자)

VERSION_PUBKEY = 0x4A  # 'J' — JackpotChain 주소는 'JACK...'으로 시작

def base58check_encode(version: int, payload: bytes) -> str:
    """Base58Check 인코딩 (버전 + 페이로드 + 체크섬)"""
    versioned = bytes([version]) + payload
    checksum = sha256(sha256(versioned))[:4]  # double SHA256 후 앞 4바이트
    return base58_encode(versioned + checksum)
```

체크섬 검증 로직:

```python
def base58check_decode(address: str) -> tuple:
    decoded = base58_decode(address)
    version = decoded[0]
    payload = decoded[1:-4]
    checksum = decoded[-4:]

    expected_checksum = sha256(sha256(decoded[:-4]))[:4]
    if checksum != expected_checksum:
        raise ValueError("Invalid checksum")  # 오타 감지!

    return version, payload
```

Base64와의 비교:

| 특성 | Base64 | Base58Check |
|------|--------|------------|
| 시각적 혼동 | 0/O, 1/l 구별 어려움 | 제거됨 |
| 오타 감지 | 없음 | 4바이트 체크섬으로 감지 |
| 네트워크 전송 | +, / 는 URL 인코딩 필요 | 없음 |
| 용도 | 바이너리 전송 일반 | 사람이 읽고 입력하는 주소 |

`VERSION_PUBKEY = 0x4A`('J')를 사용하므로 모든 JackpotChain 주소는 'JACK...'으로 시작합니다. 버전 바이트를 변경하면 주소 prefix가 달라지므로 네트워크 구분에 활용할 수 있습니다.

---

## 트랜잭션 서명 — ECDSA

> **ECDSA(Elliptic Curve Digital Signature Algorithm):** 타원곡선을 이용한 디지털 서명 알고리즘. 개인키로 서명하고 공개키로 검증합니다.

### 서명 생성

```python
# blockchain/crypto/signature.py
def sign(message_hash: bytes, private_key: bytes) -> bytes:
    """
    Args:
        message_hash: 32 bytes (SHA256 해시)
        private_key: 32 bytes
    Returns:
        signature: DER 인코딩된 서명 (70-72 bytes)
    """
    sk = SigningKey.from_string(private_key, curve=SECP256k1)
    signature = sk.sign_digest(
        message_hash,
        sigencode=sigencode_der
    )
    return signature
```

서명하는 대상은 TX 전체가 아니라 **TX의 해시**입니다. `wallet.py`에서 서명 해시를 계산하는 방식:

```python
# blockchain/wallet/wallet.py
for i, (inp, utxo) in enumerate(zip(inputs, selected)):
    # Bitcoin SIGHASH_ALL 방식: 모든 입출력을 포함한 해시
    sig_hash = tx.get_signature_hash(i, utxo.output.script_pubkey)

    # 서명
    signature = sign(sig_hash, info.private_key)
    script_sig = create_p2pkh_script_sig(signature, info.public_key)
    inp.script_sig = script_sig
```

`script_sig`에는 `[signature | public_key]`가 담깁니다. 네트워크의 다른 노드는 이 script_sig를 보고 서명을 검증합니다.

> **DER 인코딩:** Distinguished Encoding Rules. ASN.1 표준의 바이너리 인코딩 방식. ECDSA 서명의 두 값 (r, s)를 표준화된 방식으로 직렬화합니다. 서명 길이가 70-72 bytes로 가변적인 이유는 r, s 각각의 첫 비트에 따라 패딩이 달라지기 때문입니다.

### 서명 검증

```python
# blockchain/crypto/signature.py
def verify(message_hash: bytes, signature: bytes, public_key: bytes) -> bool:
    """
    Args:
        message_hash: 32 bytes
        signature: DER 인코딩된 서명
        public_key: 33 bytes (압축) 또는 64 bytes (비압축)
    """
    # 압축 공개키면 비압축으로 변환
    if len(public_key) == 33:
        public_key = decompress_public_key(public_key)

    vk = VerifyingKey.from_string(public_key, curve=SECP256k1)
    return vk.verify_digest(signature, message_hash, sigdecode=sigdecode_der)
```

노드가 TX를 검증할 때 확인하는 것:

1. `script_pubkey`에서 공개키 해시 추출
2. `script_sig`의 공개키를 해시 → `script_pubkey`의 해시와 비교 (주인 확인)
3. 동일한 방식으로 `sig_hash` 재계산
4. `ECDSA_verify(sig_hash, signature, public_key)` 검증

이 세 단계를 통과해야만 UTXO를 소비할 수 있습니다.

---

## 지갑 암호화 — AES-256-GCM + PBKDF2

개인키를 파일에 평문으로 저장하면 파일 탈취 시 즉시 코인을 잃습니다. JackpotChain은 AES-256-GCM과 PBKDF2로 개인키를 암호화합니다.

> **AES-256-GCM:** 256비트 키를 사용하는 대칭키 암호화(AES) + 인증(GCM) 모드. 암호화와 동시에 무결성 검증(인증 태그 16 bytes)을 제공합니다. 비밀번호가 틀리면 복호화 자체가 실패합니다.

> **PBKDF2(Password-Based Key Derivation Function 2):** 사용자 비밀번호(짧고 예측 가능)를 암호화에 사용할 256비트 키로 변환합니다. 반복 횟수(iterations)를 높여 브루트포스를 느리게 만듭니다.

```python
# blockchain/crypto/encryption.py
SALT_SIZE = 16
NONCE_SIZE = 12
KEY_SIZE = 32    # AES-256
ITERATIONS = 100_000  # PBKDF2 반복 횟수

def derive_key(password: str, salt: bytes) -> bytes:
    """비밀번호 + salt → 32바이트 AES 키"""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=KEY_SIZE,
        salt=salt,
        iterations=ITERATIONS,
    )
    return kdf.derive(password.encode('utf-8'))

def encrypt_private_key(private_key: bytes, password: str) -> bytes:
    """
    저장 형식: salt (16) + nonce (12) + ciphertext + tag (16)
    """
    salt = os.urandom(SALT_SIZE)    # 매번 새로운 salt
    nonce = os.urandom(NONCE_SIZE)  # 매번 새로운 nonce
    key = derive_key(password, salt)

    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, private_key, None)

    return salt + nonce + ciphertext  # 총 16 + 12 + 32 + 16 = 76 bytes
```

매번 새로운 `salt`와 `nonce`를 생성하는 이유: 같은 비밀번호로 두 개의 지갑을 암호화해도 결과가 다릅니다. Rainbow table 공격을 막고, Nonce 재사용으로 인한 AES-GCM 취약점을 방지합니다.

복호화 시 잘못된 비밀번호는 GCM 인증 태그 불일치로 즉시 감지됩니다.

```python
def decrypt_private_key(encrypted_data: bytes, password: str) -> bytes:
    salt = encrypted_data[:SALT_SIZE]
    nonce = encrypted_data[SALT_SIZE:SALT_SIZE + NONCE_SIZE]
    ciphertext = encrypted_data[SALT_SIZE + NONCE_SIZE:]

    key = derive_key(password, salt)

    try:
        aesgcm = AESGCM(key)
        return aesgcm.decrypt(nonce, ciphertext, None)
    except Exception:
        raise ValueError("잘못된 비밀번호이거나 데이터가 손상되었습니다")
```

---

## 지갑의 잠금/해제 생명주기

```python
# blockchain/wallet/wallet.py
def unlock(self, password: str) -> bool:
    """지갑 잠금 해제"""
    self._password = password
    try:
        self._load()  # 파일에서 개인키 복호화하여 메모리에 로드
        self._locked = False
        return True
    except ValueError:
        self._password = None
        return False

def lock(self):
    """지갑 잠금 — 메모리에서 개인키 제거"""
    for info in self._addresses.values():
        info.private_key = b''  # 메모리에서 즉시 삭제

    self._password = None
    self._locked = True
```

잠금 상태에서는 공개키만 메모리에 남습니다. 잔액 조회와 주소 확인은 가능하지만 TX 서명은 불가능합니다. `create_transaction`은 `self._locked` 체크를 먼저 수행합니다.

```python
def create_transaction(self, ...):
    if self._locked:
        return None, "지갑이 잠금 상태입니다. unlock() 후 사용하세요."
```

---

## FE(TypeScript)와 블록체인 노드(Python)의 암호 호환성

JackpotChain의 핵심 도전 중 하나는 브라우저의 TypeScript 코드와 Python 노드가 **동일한 암호 프리미티브**를 사용해야 한다는 것입니다.

브라우저에서 생성한 지갑으로 서명한 TX를 Python 노드가 검증할 수 있어야 합니다. 이를 위해 다음이 일치해야 합니다.

| 항목 | TypeScript (FE) | Python (노드) |
|------|----------------|---------------|
| 곡선 | @noble/secp256k1 | ecdsa (SECP256k1) |
| 공개키 압축 형식 | 33 bytes, prefix 02/03 | 동일 |
| 서명 인코딩 | DER | DER (sigencode_der) |
| 주소 유도 | SHA256 → RIPEMD160 → Base58Check | 동일 |
| 해시 함수 | noble/hashes SHA256 | hashlib SHA256 |

```
[브라우저]
  1. @noble/secp256k1으로 키쌍 생성
  2. SHA256 → RIPEMD160 → Base58Check로 주소 유도
  3. IndexedDB에 개인키 저장 (AES-GCM 암호화)
  4. TX 직렬화 → double SHA256 → ECDSA 서명
  5. script_sig = [DER서명 | 압축공개키]
  6. signed TX hex → Backend → RPC sendrawtransaction

[Python 노드]
  7. TX 역직렬화
  8. script_pubkey에서 공개키 해시 추출
  9. script_sig의 공개키 → hash160 → 비교 (주인 검증)
  10. sig_hash 동일한 방식으로 재계산
  11. ECDSA verify(sig_hash, DER서명, 압축공개키) → True/False
```

호환성의 근거는 secp256k1 곡선 자체가 표준이고, DER 인코딩도 표준이며, SHA256과 RIPEMD160도 표준이기 때문입니다. 라이브러리마다 구현이 달라도 동일한 수학적 결과를 만들어냅니다.

### 웹 환경의 Challenge-Response 인증

FE는 서버에 로그인할 때 비밀번호 대신 개인키로 서버 챌린지에 서명합니다.

```
[브라우저]
  1. POST /auth/challenge → 서버로부터 nonce(랜덤값) 수신
  2. nonce를 SHA256 해시
  3. 해시에 개인키로 ECDSA 서명
  4. POST /auth/login { address, signature }

[Backend]
  5. address의 공개키를 DB에서 조회
  6. ECDSA verify(SHA256(nonce), signature, public_key)
  7. 검증 성공 → JWT 발급
```

비밀번호 없이 암호학적으로 신원을 증명합니다. 개인키는 브라우저 밖으로 나가지 않고, 서버는 공개키만 알면 됩니다.

---

## 이 프로젝트는 HD 지갑이 아닌 이유

> **HD 지갑(Hierarchical Deterministic Wallet, BIP32):** 하나의 마스터 시드(12~24개 단어 니모닉)에서 계층적으로 무한한 키쌍을 결정론적으로 생성하는 방식입니다. 시드 하나만 백업하면 모든 주소를 복원할 수 있습니다.

JackpotChain의 `wallet.py`는 HD 지갑이 아닙니다.

```python
# blockchain/wallet/wallet.py
def generate_address(self, label: str = "", is_change: bool = False) -> str:
    """새 주소 생성"""
    private_key, public_key = generate_keypair()  # ← 매번 독립적인 랜덤 키
    address = pubkey_to_address(public_key)
    self._addresses[address] = AddressInfo(...)
    self._save()  # 파일에 저장
    return address
```

`generate_keypair()`는 매번 독립적인 난수에서 키쌍을 생성합니다. 공통 마스터 시드가 없습니다.

이 설계의 트레이드오프:

| 특성 | HD 지갑 (BIP32) | JackpotChain 현재 |
|------|----------------|-------------------|
| 백업 | 시드 12단어만 | 모든 개인키 파일 |
| 키 관계 | 수학적으로 연결됨 | 완전 독립 |
| 복원 | 시드로 전체 복원 | 파일 분실 시 복원 불가 |
| 구현 복잡도 | BIP32/39/44 구현 필요 | 단순 |

MVP 단계에서 HD 지갑을 구현하지 않은 것은 의도적 단순화입니다. 프로젝트 범위(블록체인 네트워크, 로또 게임, 교환 기능)에 집중하기 위해 지갑 구현을 단순하게 유지했습니다. 실제 서비스라면 반드시 BIP32/39 기반 HD 지갑으로 교체해야 합니다.

---

## 한계와 트레이드오프

**평문 지갑 하위 호환:** `_load()`에서 `encrypted=False`인 경우 개인키를 그대로 읽습니다. 개발 편의를 위한 설계지만 프로덕션에서는 모든 지갑에 암호화를 강제해야 합니다.

**잠금 해제 시간:** 현재 24시간 잠금 해제 설정이 있습니다. 장시간 잠금 해제 상태에서 프로세스 메모리가 덤프되면 개인키가 노출될 수 있습니다. 이상적으로는 서명 직전에만 잠금을 해제하고 즉시 잠가야 합니다.

**PBKDF2 반복 100,000회:** 2025년 기준으로 충분히 느리지만, GPU 병렬 공격에는 Argon2id나 scrypt가 더 강합니다.

---

## 면접 Q&A

**Q1. secp256k1이 무엇이고, 왜 RSA가 아닌 secp256k1을 사용하나요?**

A. secp256k1은 y² = x³ + 7 (mod p) 형태의 타원곡선입니다. Bitcoin이 2009년에 채택하면서 블록체인 생태계의 사실상 표준이 되었습니다. RSA 대신 ECC(타원곡선 암호화)를 선택한 이유는 키 크기 때문입니다. RSA 2048비트와 동등한 보안 수준을 secp256k1은 256비트로 달성합니다. 공개키가 33 bytes, 서명이 70-72 bytes에 불과하여 TX 크기가 작아집니다. TX 크기는 수수료와 직결되므로 중요합니다. 또한 ECC의 서명과 검증 연산이 RSA보다 빠릅니다. secp256k1은 특히 배경이 없는 랜덤한 파라미터를 사용하여 백도어 삽입 의혹을 피할 수 있도록 설계되었습니다.

**Q2. 주소 유도 시 SHA256 후에 RIPEMD-160을 왜 한 번 더 해시하나요?**

A. 두 가지 이유가 있습니다. 첫째, 길이 단축입니다. SHA256은 32 bytes인데 RIPEMD-160은 20 bytes입니다. 블록체인에 수백만 개의 UTXO가 저장되므로 주소 길이가 짧을수록 저장 효율이 높습니다. 둘째, 보안 중첩입니다. 만약 SHA256에서 충돌 취약점이 발견되더라도 RIPEMD-160이 추가 보호를 제공하고, 반대로 RIPEMD-160에 취약점이 생겨도 SHA256이 먼저 입력을 변환합니다. 또한 이 이중 해시는 공개키를 직접 노출하지 않습니다. TX를 보내기 전에는 주소(해시)만 체인에 공개되므로, 공개키에서 개인키를 복원하는 미래의 양자 컴퓨터 공격에 대한 한 겹의 보호막이 됩니다.

**Q3. Base58Check의 체크섬이 무엇을 탐지하나요?**

A. 4바이트 체크섬은 double SHA256(버전 + 공개키 해시)의 앞 4바이트입니다. 주소를 수동으로 입력할 때 발생하는 오타를 거의 모두 잡아냅니다. 단 한 문자가 바뀌어도 체크섬이 달라지므로 디코딩 시 ValueError가 발생합니다. 실제로 코인 전송 시 주소 한 글자를 잘못 입력했을 때 체크섬 불일치로 전송 자체가 거부됩니다. 다만 동일한 체크섬을 갖는 다른 유효한 주소가 우연히 존재할 확률은 1/2³²(약 43억 분의 1)로 사실상 불가능합니다.

**Q4. ECDSA 서명이 어떻게 동작하나요? 개인키 없이 서명을 위조할 수 없는 이유는 무엇인가요?**

A. ECDSA 서명 과정은 이렇습니다. 1) 서명자가 난수 k를 선택하고 k × G = R을 계산합니다. 2) r = R.x mod n (R의 x좌표)을 구합니다. 3) s = k⁻¹ × (hash + r × private_key) mod n을 계산합니다. 서명은 (r, s) 쌍입니다. 검증자는 공개키 Q = private_key × G를 알고 있으며, u₁ = hash × s⁻¹, u₂ = r × s⁻¹를 계산하고 u₁ × G + u₂ × Q의 x좌표가 r과 같은지 확인합니다. 위조가 불가능한 이유는 private_key 없이 s를 올바르게 계산할 수 없기 때문입니다. private_key를 구하려면 이산 로그 문제(Q = private_key × G에서 private_key 복원)를 풀어야 하는데, 이는 현재 기술로 불가능합니다.

**Q5. 이 프로젝트가 HD 지갑이 아닌 이유는 무엇이고, HD 지갑과 어떻게 다른가요?**

A. JackpotChain의 `generate_address()`는 매번 독립적인 `generate_keypair()`를 호출합니다. 키들 사이에 수학적 연결이 없습니다. HD 지갑(BIP32)은 하나의 마스터 시드(128~256 비트 엔트로피)에서 결정론적으로 키를 유도합니다. `child_key = HMAC-SHA512(parent_key + child_index)`처럼 계층적으로 파생하므로, 시드 12단어만 백업하면 모든 주소를 복원할 수 있습니다. 현재 구현의 문제는 지갑 파일을 잃으면 복원이 불가능하다는 점입니다. MVP 타협으로 단순 구현을 선택했지만, 실제 서비스에서는 BIP39(니모닉) + BIP32(계층 파생) + BIP44(경로 표준) 조합이 필수입니다.

**Q6. FE(TypeScript)와 Python 노드의 암호 호환성을 어떻게 보장하나요?**

A. 핵심은 표준 프리미티브만 사용하는 것입니다. secp256k1 곡선, DER 서명 인코딩, SHA256, RIPEMD-160, Base58Check는 모두 수학적으로 정의된 표준입니다. TypeScript의 `@noble/secp256k1`과 Python의 `ecdsa` 라이브러리는 다른 코드이지만 동일한 수학을 구현합니다. 브라우저에서 생성한 32 bytes 개인키를 Python에서 `SigningKey.from_string(private_key, curve=SECP256k1)`으로 로드하면 동일한 공개키와 주소를 만들어냅니다. 서명도 마찬가지입니다. FE에서 DER 인코딩으로 서명하면 Python의 `verify_digest(sigdecode=sigdecode_der)`가 검증합니다. 호환성 검증을 위해 알려진 벡터(테스트용 개인키, 서명, 주소)로 크로스 검증하는 것이 중요합니다.

**Q7. 지갑 암호화에 AES-GCM을 선택한 이유는 무엇이고, 비밀번호를 직접 AES 키로 쓰지 않는 이유는 무엇인가요?**

A. AES-GCM은 기밀성(AES-CTR)과 무결성 검증(GHASH 인증 태그)을 동시에 제공합니다. 단순 AES-CBC였다면 잘못된 비밀번호로 복호화해도 쓰레기 값이 나올 뿐 오류를 알 수 없습니다. GCM은 인증 태그 불일치로 즉시 실패하므로 비밀번호 오류를 정확히 감지합니다. 비밀번호를 직접 키로 쓰지 않는 이유는 비밀번호가 너무 짧고 예측 가능하기 때문입니다. "password123" 같은 비밀번호를 직접 32 bytes로 패딩하면 수십만 개의 후보를 빠르게 시도하는 dictionary 공격에 취약합니다. PBKDF2(반복 100,000회)는 매 시도에 CPU 연산을 강제하여 초당 시도 횟수를 극적으로 줄입니다. 랜덤 salt를 매번 생성하므로 같은 비밀번호로 암호화된 두 지갑도 다른 키를 갖습니다.
