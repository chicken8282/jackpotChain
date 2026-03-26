#!/usr/bin/env python3
"""
성능 테스트용 지갑 준비 스크립트

기능:
  - ECDSA 키페어 생성 (secp256k1)
  - BE API를 통해 지갑 등록
  - 인증 토큰(accessToken) 발급
  - perf/fixtures/test-wallets.json 저장

사전 조건:
  pip install ecdsa requests

사용법:
  cd S14P21E202
  python perf/setup/prepare_wallets.py --count 50 --base-url http://localhost:8080
  python perf/setup/prepare_wallets.py --count 100 --base-url http://ssatto777.site/api/v1 --prefix dev
"""

import argparse
import hashlib
import json
import sys
import time
from pathlib import Path
from typing import Optional, Tuple

import requests

try:
    from ecdsa import SigningKey, SECP256k1
    from ecdsa.util import sigencode_der
except ImportError:
    print("[ERROR] ecdsa 라이브러리 필요: pip install ecdsa requests")
    sys.exit(1)

# ─────────────────────────────────────────────
# Crypto helpers (blockchain/crypto/ 인라인)
# ─────────────────────────────────────────────

BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
VERSION_PUBKEY = 0x4A  # JackpotChain 주소 prefix ('J' 계열)


def _sha256(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()


def _hash160(data: bytes) -> bytes:
    sha = hashlib.sha256(data).digest()
    ripemd = hashlib.new("ripemd160")
    ripemd.update(sha)
    return ripemd.digest()


def _base58_encode(data: bytes) -> str:
    leading = len(data) - len(data.lstrip(b"\x00"))
    num = int.from_bytes(data, "big")
    result = ""
    while num > 0:
        num, rem = divmod(num, 58)
        result = BASE58_ALPHABET[rem] + result
    return "1" * leading + result


def _base58check_encode(version: int, payload: bytes) -> str:
    versioned = bytes([version]) + payload
    checksum = _sha256(_sha256(versioned))[:4]
    return _base58_encode(versioned + checksum)


def _compress_pubkey(raw: bytes) -> bytes:
    """비압축(64B) → 압축(33B) 공개키"""
    if len(raw) == 33:
        return raw
    if len(raw) == 65:
        raw = raw[1:]
    x, y = raw[:32], raw[32:]
    return (b"\x02" if y[-1] % 2 == 0 else b"\x03") + x


def generate_keypair() -> Tuple[bytes, bytes]:
    """(private_key: 32B, public_key: 33B compressed)"""
    sk = SigningKey.generate(curve=SECP256k1)
    return sk.to_string(), _compress_pubkey(sk.get_verifying_key().to_string())


def pubkey_to_address(pubkey: bytes) -> str:
    return _base58check_encode(VERSION_PUBKEY, _hash160(pubkey))


def sign_message(message: str, private_key: bytes) -> bytes:
    """SHA256(message) → DER-encoded ECDSA signature"""
    msg_hash = _sha256(message.encode("utf-8"))
    sk = SigningKey.from_string(private_key, curve=SECP256k1)
    return sk.sign_digest(msg_hash, sigencode=sigencode_der)


# ─────────────────────────────────────────────
# API helpers
# ─────────────────────────────────────────────

COLORS = ["RED", "BLUE", "GREEN", "YELLOW", "PURPLE", "ORANGE"]


def register_wallet(base_url: str, address: str, idx: int) -> bool:
    try:
        r = requests.post(
            f"{base_url}/v1/wallet",
            json={
                "address": address,
                "nickname": f"perf-{idx:04d}",
                "walletColor": COLORS[idx % len(COLORS)],
            },
            timeout=10,
        )
        # 409 = already registered (idempotent)
        return r.status_code in (200, 201, 409)
    except Exception as e:
        print(f"  [WARN] register: {e}")
        return False


def get_access_token(
    base_url: str,
    address: str,
    private_key: bytes,
    public_key: bytes,
) -> Optional[str]:
    # Step 1: challenge
    try:
        r = requests.post(
            f"{base_url}/v1/auth/challenge",
            json={"address": address},
            timeout=10,
        )
        if r.status_code != 200:
            print(f"  [WARN] challenge {r.status_code}: {r.text[:120]}")
            return None
        d = r.json()["data"]
        challenge_id, message = d["challengeId"], d["message"]
    except Exception as e:
        print(f"  [WARN] challenge error: {e}")
        return None

    # Step 2: sign + verify
    try:
        sig = sign_message(message, private_key)
        r = requests.post(
            f"{base_url}/v1/auth/verify",
            json={
                "challengeId": challenge_id,
                "address": address,
                "publicKey": public_key.hex(),
                "signature": sig.hex(),
            },
            timeout=10,
        )
        if r.status_code != 200:
            print(f"  [WARN] verify {r.status_code}: {r.text[:120]}")
            return None
        return r.json()["data"]["accessToken"]
    except Exception as e:
        print(f"  [WARN] verify error: {e}")
        return None


# ─────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="성능 테스트용 지갑 준비")
    parser.add_argument("--count", type=int, default=50, help="생성할 지갑 수 (기본: 50)")
    parser.add_argument("--base-url", default="http://localhost:8080", help="BE base URL")
    parser.add_argument("--out", default="perf/fixtures/test-wallets.json")
    parser.add_argument("--prefix", default="perf", help="지갑 닉네임 prefix")
    args = parser.parse_args()

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # 기존 fixtures 유지 (증분 추가)
    existing = []
    if out_path.exists():
        existing = json.loads(out_path.read_text())
        existing_addrs = {w["address"] for w in existing}
        print(f"기존 지갑 {len(existing)}개 로드 (증분 추가 모드)")
    else:
        existing_addrs = set()

    wallets = list(existing)
    print(f"지갑 {args.count}개 생성 시작 (base-url: {args.base_url})")

    success, skip, fail = 0, 0, 0

    for i in range(args.count):
        priv, pub = generate_keypair()
        addr = pubkey_to_address(pub)

        if addr in existing_addrs:
            skip += 1
            continue

        print(f"  [{i+1:3d}/{args.count}] {addr[:24]}...", end=" ", flush=True)

        if not register_wallet(args.base_url, addr, len(wallets)):
            print("등록 실패")
            fail += 1
            continue

        token = get_access_token(args.base_url, addr, priv, pub)
        if not token:
            print("인증 실패")
            fail += 1
            continue

        wallets.append(
            {
                "address": addr,
                "privateKeyHex": priv.hex(),
                "publicKeyHex": pub.hex(),
                "accessToken": token,
            }
        )
        existing_addrs.add(addr)
        success += 1
        print("OK")

        # rate-limit 방지
        if i > 0 and i % 10 == 0:
            time.sleep(0.3)

    out_path.write_text(json.dumps(wallets, indent=2, ensure_ascii=False))

    print(f"\n완료: 성공 {success}개  실패 {fail}개  스킵 {skip}개")
    print(f"저장: {out_path}  (총 {len(wallets)}개)")
    print()
    print("다음 단계:")
    print(f"  # POT 시드 (로컬 dev 환경)")
    print(f"  python perf/setup/prepare_commit_txs.py --base-url {args.base_url}")
    print()
    print("  # k6 읽기 부하 테스트")
    print(f"  bash perf/run.sh read {args.base_url}")


if __name__ == "__main__":
    main()
