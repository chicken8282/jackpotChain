#!/usr/bin/env python3
"""
성능 테스트용 lotto/commit 사전 TX 생성 스크립트

기능:
  1. 각 지갑에 JACK 지급 (grantlocaljack RPC — 로컬 dev 전용)
  2. JACK → POT 교환 TX 빌드 + BE API 제출
  3. 블록 확정 대기 (폴링)
  4. POT UTXO로 lotto commit TX 빌드 (서명 포함)
  5. perf/fixtures/commit-payloads.json 저장 → k6가 읽어서 replay

사전 조건:
  - perf/fixtures/test-wallets.json 존재 (prepare_wallets.py 실행 후)
  - 로컬 docker-compose.local.yml 스택 실행 중
  - pip install ecdsa requests

사용법:
  cd S14P21E202
  python perf/setup/prepare_commit_txs.py \\
    --base-url http://localhost:8080 \\
    --node-rpc-url http://localhost:8776 \\
    --jack-per-wallet 200 \\
    --commits-per-wallet 1
"""

import argparse
import json
import struct
import sys
import time
from pathlib import Path
from typing import List, Optional, Tuple

import requests

# blockchain 모듈 import (repo root → sys.path 추가)
REPO_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(REPO_ROOT))

try:
    from blockchain.constants import (
        ASSET_ID_POT,
        COIN,
        EXCHANGE_RATE,
        LOTTO_COST_POT,
        LOTTO_DIGIT_BASE,
        LOTTO_DIGIT_COUNT,
        MIN_TX_FEE,
        SEQUENCE_FINAL,
        TX_VERSION_EXCHANGE,
        TX_VERSION_GACHA_COMMIT,
    )
    from blockchain.core.transaction import TxInput, TxOutput, Transaction
    from blockchain.core.utxo import UTXO
    from blockchain.crypto.hash import double_sha256
    from blockchain.crypto.signature import sign
    from blockchain.crypto.address import address_to_pubkey_hash
    from blockchain.script.standard import (
        create_p2pkh_script_pubkey,
        create_p2pkh_script_sig,
        create_commit_script,
    )
    from blockchain.asset.exchange import create_exchange_tx, calculate_exchange
    from blockchain.gacha.game import LottoGame
except ImportError as e:
    print(f"[ERROR] blockchain 모듈 임포트 실패: {e}")
    print(f"  REPO_ROOT={REPO_ROOT}")
    print("  pip install ecdsa 후 repo root에서 실행하세요.")
    sys.exit(1)


# ─────────────────────────────────────────────
# 유틸
# ─────────────────────────────────────────────

def api(base_url: str, method: str, path: str, token: str = None, **kwargs):
    """간단한 API 호출 래퍼"""
    url = f"{base_url}/api/v1{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    resp = getattr(requests, method)(url, headers=headers, timeout=15, **kwargs)
    return resp


def rpc_call(node_url: str, method: str, params: list = None) -> dict:
    """JackpotChain 노드 JSON-RPC 호출"""
    r = requests.post(
        node_url,
        json={"jsonrpc": "2.0", "method": method, "params": params or [], "id": 1},
        timeout=10,
    )
    r.raise_for_status()
    data = r.json()
    if "error" in data:
        raise RuntimeError(f"RPC error [{method}]: {data['error']}")
    return data.get("result", {})


def build_utxo_from_api(api_utxo: dict, wallet_address: str) -> Tuple[TxInput, UTXO]:
    """BE API UTXO 응답 → (TxInput, blockchain.UTXO)"""
    pubkey_hash = address_to_pubkey_hash(wallet_address)
    script_pubkey = create_p2pkh_script_pubkey(pubkey_hash)

    tx_input = TxInput(
        prev_tx_id=bytes.fromhex(api_utxo["txId"]),
        output_index=api_utxo["vout"],
        script_sig=b"",
        sequence=SEQUENCE_FINAL,
    )
    utxo = UTXO(
        tx_id=bytes.fromhex(api_utxo["txId"]),
        output_index=api_utxo["vout"],
        output=TxOutput(
            jack_value=api_utxo.get("jackAmount", 0),
            assets={k: v for k, v in api_utxo.get("assets", {}).items()},
            script_pubkey=script_pubkey,
        ),
        block_height=0,
        is_coinbase=False,
    )
    return tx_input, utxo


def sign_tx(tx: Transaction, inputs_with_utxo: List[Tuple[TxInput, UTXO]], private_key: bytes, public_key: bytes) -> str:
    """TX의 모든 입력에 서명하고 hex 문자열 반환"""
    for i, (_, utxo) in enumerate(inputs_with_utxo):
        sig_hash = tx.get_signature_hash(i, utxo.output.script_pubkey)
        signature = sign(sig_hash, private_key)
        tx.inputs[i].script_sig = create_p2pkh_script_sig(signature, public_key)
    return tx.serialize().hex()


def get_utxos(base_url: str, address: str, token: str) -> List[dict]:
    r = api(base_url, "get", f"/wallet/{address}/utxos", token=token)
    if r.status_code != 200:
        return []
    return r.json().get("data", {}).get("utxos", [])


def wait_for_block(base_url: str, current_height: int, timeout_s: int = 120) -> bool:
    """블록 높이가 current_height+1 이상이 될 때까지 대기"""
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            r = requests.get(f"{base_url}/api/v1/blockchain/dashboard?limit=1", timeout=5)
            if r.status_code == 200:
                new_height = r.json()["data"]["height"]
                if new_height > current_height:
                    return True
        except Exception:
            pass
        time.sleep(3)
    return False


def get_chain_height(base_url: str) -> int:
    try:
        r = requests.get(f"{base_url}/api/v1/blockchain/dashboard?limit=1", timeout=5)
        return r.json()["data"]["height"]
    except Exception:
        return 0


# ─────────────────────────────────────────────
# 핵심 로직
# ─────────────────────────────────────────────

def grant_jack(node_rpc_url: str, address: str, jack_amount: float) -> bool:
    """grantlocaljack RPC로 JACK 지급 (로컬 dev 전용)"""
    try:
        result = rpc_call(node_rpc_url, "grantlocaljack", [address, jack_amount])
        return result.get("success", False)
    except Exception as e:
        print(f"  [WARN] grantlocaljack 실패 ({address[:16]}...): {e}")
        return False


def build_exchange_tx_hex(wallet: dict, jack_utxos: List[dict], jack_amount: int) -> Optional[str]:
    """JACK → POT 교환 TX 빌드 + 서명"""
    priv = bytes.fromhex(wallet["privateKeyHex"])
    pub = bytes.fromhex(wallet["publicKeyHex"])
    addr = wallet["address"]

    calc = calculate_exchange(jack_amount)
    if not calc.success:
        print(f"  [WARN] exchange 계산 실패: {calc.error}")
        return None

    inputs_with_utxo = [build_utxo_from_api(u, addr) for u in jack_utxos]

    tx, err = create_exchange_tx(
        inputs=inputs_with_utxo,
        exchange_jack=jack_amount,
        sender_address=addr,
        change_address=addr,
    )
    if not tx:
        print(f"  [WARN] exchange TX 빌드 실패: {err}")
        return None

    return sign_tx(tx, inputs_with_utxo, priv, pub)


def build_commit_tx_hex(wallet: dict, pot_utxos: List[dict], chosen_numbers: List[int]) -> Optional[str]:
    """로또 commit TX 빌드 + 서명"""
    priv = bytes.fromhex(wallet["privateKeyHex"])
    pub = bytes.fromhex(wallet["publicKeyHex"])
    addr = wallet["address"]

    inputs_with_utxo = [build_utxo_from_api(u, addr) for u in pot_utxos]

    game = LottoGame()
    tx, numbers, err = game.create_commit_tx(
        inputs=inputs_with_utxo,
        player_address=addr,
        chosen_numbers=chosen_numbers,
        change_address=addr,
    )
    if not tx:
        print(f"  [WARN] commit TX 빌드 실패: {err}")
        return None

    return sign_tx(tx, inputs_with_utxo, priv, pub)


# ─────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="commit TX 사전 생성")
    parser.add_argument("--base-url", default="http://localhost:8080")
    parser.add_argument("--node-rpc-url", default="http://localhost:8776",
                        help="JackpotChain 노드 RPC URL")
    parser.add_argument("--jack-per-wallet", type=float, default=200.0,
                        help="지갑당 지급할 JACK (기본: 200)")
    parser.add_argument("--commits-per-wallet", type=int, default=1,
                        help="지갑당 commit TX 수 (기본: 1)")
    parser.add_argument("--wallets-in", default="perf/fixtures/test-wallets.json")
    parser.add_argument("--out", default="perf/fixtures/commit-payloads.json")
    args = parser.parse_args()

    wallets_path = Path(args.wallets_in)
    if not wallets_path.exists():
        print(f"[ERROR] {wallets_path} 없음. prepare_wallets.py 먼저 실행하세요.")
        sys.exit(1)

    wallets = json.loads(wallets_path.read_text())
    print(f"지갑 {len(wallets)}개 로드")

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    # ── Step 1: JACK 지급 ──────────────────────
    print(f"\n[1/4] JACK 지급 ({args.jack_per_wallet} JACK / 지갑)...")
    for i, w in enumerate(wallets):
        ok = grant_jack(args.node_rpc_url, w["address"], args.jack_per_wallet)
        status = "OK" if ok else "FAIL"
        print(f"  [{i+1:3d}/{len(wallets)}] {w['address'][:24]}... {status}")
        time.sleep(0.05)

    # ── Step 2: 블록 대기 (grantlocaljack TX 확정) ──
    print("\n[2/4] grantlocaljack TX 확정 대기 (블록 1개)...")
    h0 = get_chain_height(args.base_url)
    if wait_for_block(args.base_url, h0, timeout_s=180):
        print(f"  블록 확정 완료 (높이: {get_chain_height(args.base_url)})")
    else:
        print("  [WARN] 타임아웃 — 채굴 중인지 확인하세요.")

    # ── Step 3: JACK → POT 교환 TX 제출 ─────────
    print(f"\n[3/4] JACK → POT 교환 TX 제출...")
    exchange_jack = int(args.jack_per_wallet * COIN * 0.5)  # 보유 JACK의 50%를 POT으로 교환

    for i, w in enumerate(wallets):
        utxos = get_utxos(args.base_url, w["address"], w["accessToken"])
        jack_utxos = [u for u in utxos if u.get("jackAmount", 0) >= exchange_jack + MIN_TX_FEE]

        if not jack_utxos:
            print(f"  [{i+1:3d}] {w['address'][:24]}... JACK UTXO 없음 — 스킵")
            continue

        signed_hex = build_exchange_tx_hex(w, jack_utxos, exchange_jack)
        if not signed_hex:
            continue

        r = api(
            args.base_url, "post", "/exchange/jack-to-pot",
            token=w["accessToken"],
            json={
                "address": w["address"],
                "signedTxHex": signed_hex,
                "jackAmount": exchange_jack,
            },
        )
        status = "OK" if r.status_code == 200 else f"FAIL({r.status_code})"
        print(f"  [{i+1:3d}] {w['address'][:24]}... {status}")
        time.sleep(0.1)

    # ── Step 4: 블록 대기 (POT 확정) ─────────────
    print("\n[4/4] 교환 TX 확정 대기 (블록 1개)...")
    h1 = get_chain_height(args.base_url)
    if wait_for_block(args.base_url, h1, timeout_s=180):
        print(f"  블록 확정 완료 (높이: {get_chain_height(args.base_url)})")
    else:
        print("  [WARN] 타임아웃 — 수동으로 블록 채굴 후 재실행하세요.")

    # ── Step 5: commit TX 빌드 ────────────────────
    print(f"\n[5/5] commit TX 빌드 ({args.commits_per_wallet}개 / 지갑)...")
    payloads = []

    for i, w in enumerate(wallets):
        utxos = get_utxos(args.base_url, w["address"], w["accessToken"])
        pot_utxos = [u for u in utxos if u.get("assets", {}).get(ASSET_ID_POT, 0) >= LOTTO_COST_POT]

        if not pot_utxos:
            print(f"  [{i+1:3d}] {w['address'][:24]}... POT UTXO 없음 — 스킵")
            continue

        for j in range(args.commits_per_wallet):
            # 랜덤 6자리 (0~15)
            import os
            chosen = [int.from_bytes(os.urandom(1), "big") % LOTTO_DIGIT_BASE
                      for _ in range(LOTTO_DIGIT_COUNT)]

            signed_hex = build_commit_tx_hex(w, pot_utxos[:1], chosen)  # 1 POT UTXO 사용
            if not signed_hex:
                continue

            payloads.append({
                "address": w["address"],
                "accessToken": w["accessToken"],
                "signedTxHex": signed_hex,
                "commitNumbers": chosen,
            })

        print(f"  [{i+1:3d}] {w['address'][:24]}... {min(args.commits_per_wallet, len(pot_utxos))}개 빌드")

    out_path.write_text(json.dumps(payloads, indent=2, ensure_ascii=False))
    print(f"\n완료: commit TX {len(payloads)}개 저장 → {out_path}")
    print("\nk6 commit 부하 테스트 실행:")
    print(f"  bash perf/run.sh commit {args.base_url}")


if __name__ == "__main__":
    main()
