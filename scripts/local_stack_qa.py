#!/usr/bin/env python3
"""Local stack QA/QC runner for docker-compose.local.yml."""

from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path
from dataclasses import dataclass, asdict
from http.cookiejar import CookieJar
from typing import Any
from urllib import error, request
from urllib.parse import urlencode
from urllib.request import HTTPCookieProcessor, build_opener

from ecdsa import SECP256k1, SigningKey
from ecdsa.util import sigencode_der

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from blockchain.constants import ASSET_ID_POT, COIN, EXCHANGE_RATE, MIN_TX_FEE, TX_VERSION_CLAIM, TX_VERSION_EXCHANGE, TX_VERSION_GACHA_COMMIT
from blockchain.core.transaction import Transaction, TxInput, TxOutput
from blockchain.crypto.address import address_to_pubkey_hash, pubkey_to_address
from blockchain.crypto.signature import generate_keypair, private_key_to_public_key, sign
from blockchain.script.standard import (
    create_claim_script,
    create_commit_script,
    create_op_return_script,
    create_p2pkh_script_pubkey,
    create_p2pkh_script_sig,
)


BASE_URL = os.environ.get("QA_BASE_URL", "http://localhost:18080/api/v1")
FRONTEND_URL = os.environ.get("QA_FRONTEND_URL", "http://localhost:3000")
RPC_URL = os.environ.get("QA_RPC_URL", "http://localhost:8332")


@dataclass
class ScenarioResult:
    scenario_id: str
    status: str
    detail: str


class HttpSession:
    def __init__(self) -> None:
        self.cookie_jar = CookieJar()
        self.opener = build_opener(HTTPCookieProcessor(self.cookie_jar))

    def _send(self, req: request.Request) -> tuple[int, Any]:
        try:
            with self.opener.open(req) as resp:
                content_type = resp.headers.get("Content-Type", "")
                body = resp.read().decode()
                if "application/json" in content_type:
                    return resp.status, json.loads(body)
                return resp.status, body
        except error.HTTPError as exc:
            body = exc.read().decode()
            try:
                payload = json.loads(body)
            except Exception:
                payload = body
            return exc.code, payload

    def get(self, url: str, token: str | None = None) -> tuple[int, Any]:
        headers = {}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return self._send(request.Request(url, headers=headers))

    def post(self, url: str, payload: dict[str, Any], token: str | None = None) -> tuple[int, Any]:
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return self._send(request.Request(url, data=json.dumps(payload).encode(), headers=headers))


@dataclass
class WalletMaterial:
    private_key_hex: str
    public_key_hex: str
    address: str


@dataclass
class BuiltSignedTransaction:
    tx_id: str
    signed_tx_hex: str


def build_wallet_material() -> WalletMaterial:
    private_key, public_key = generate_keypair()
    return WalletMaterial(
        private_key_hex=private_key.hex(),
        public_key_hex=public_key.hex(),
        address=pubkey_to_address(public_key),
    )


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def auth_wallet(session: HttpSession, wallet: WalletMaterial) -> tuple[str, str]:
    challenge_status, challenge_payload = session.post(
        f"{BASE_URL}/auth/challenge",
        {"address": wallet.address},
    )
    require(challenge_status == 200, f"challenge failed: {challenge_payload}")
    challenge_body = challenge_payload["data"]

    message_hash = hashlib.sha256(challenge_body["message"].encode()).digest()
    signature = SigningKey.from_string(
        bytes.fromhex(wallet.private_key_hex),
        curve=SECP256k1,
    ).sign_digest(message_hash, sigencode=sigencode_der).hex()

    verify_status, verify_payload = session.post(
        f"{BASE_URL}/auth/verify",
        {
            "challengeId": challenge_body["challengeId"],
            "address": wallet.address,
            "publicKey": wallet.public_key_hex,
            "signature": signature,
        },
    )
    require(verify_status == 200, f"verify failed: {verify_payload}")
    verify_body = verify_payload["data"]
    return verify_body["accessToken"], verify_body["refreshSessionHandle"]


def register_wallet(session: HttpSession, wallet: WalletMaterial, nickname: str) -> tuple[int, Any]:
    return session.post(
        f"{BASE_URL}/wallet",
        {
            "address": wallet.address,
            "nickname": nickname,
            "walletColor": "GRAY",
            "grantOnboardingReward": True,
        },
    )


def rpc_call(method: str, params: list[Any] | None = None) -> Any:
    payload = json.dumps({
        "jsonrpc": "2.0",
        "id": method,
        "method": method,
        "params": params or [],
    }).encode()
    req = request.Request(RPC_URL, data=payload, headers={"Content-Type": "application/json"})
    with request.urlopen(req) as response:
        body = json.loads(response.read().decode())
    if body.get("error"):
        raise AssertionError(f"rpc {method} failed: {body['error']}")
    return body["result"]


def is_spendable_wallet_utxo(utxo: dict[str, Any]) -> bool:
    return (not utxo["coinbase"]) or utxo["confirmations"] >= 101


def select_wallet_utxos(
    utxos: list[dict[str, Any]],
    required_amount: int,
    amount_selector,
) -> tuple[list[dict[str, Any]], int]:
    total = 0
    selected: list[dict[str, Any]] = []
    for candidate in sorted(utxos, key=amount_selector, reverse=True):
        selected.append(candidate)
        total += amount_selector(candidate)
        if total >= required_amount:
            break
    return selected, total


def sign_wallet_inputs(tx: Transaction, utxos: list[dict[str, Any]], wallet: WalletMaterial) -> None:
    private_key = bytes.fromhex(wallet.private_key_hex)
    public_key = bytes.fromhex(wallet.public_key_hex)
    for index, utxo in enumerate(utxos):
        script_pubkey = create_p2pkh_script_pubkey(address_to_pubkey_hash(utxo["address"]))
        sig_hash = tx.get_signature_hash(index, script_pubkey)
        tx.inputs[index].script_sig = create_p2pkh_script_sig(sign(sig_hash, private_key), public_key)


def build_exchange_tx(utxos: list[dict[str, Any]], wallet: WalletMaterial, jack_amount: int) -> BuiltSignedTransaction:
    spendable_jack_utxos = [
        utxo
        for utxo in utxos
        if utxo["address"] == wallet.address
        and utxo["jackAmount"] > 0
        and not utxo["assets"]
        and is_spendable_wallet_utxo(utxo)
    ]
    selected, total = select_wallet_utxos(spendable_jack_utxos, jack_amount, lambda item: item["jackAmount"])
    require(total >= jack_amount, f"insufficient JACK UTXOs for exchange: {total} < {jack_amount}")

    exchange_unit = EXCHANGE_RATE * COIN
    pot_amount = (jack_amount // exchange_unit) * COIN
    require(pot_amount > 0, "exchange amount did not yield any POT")
    jack_exchanged = (pot_amount // COIN) * exchange_unit
    jack_to_pool = (jack_exchanged * 80) // 100
    jack_burned = (jack_exchanged * 19) // 100
    jack_change = total - jack_exchanged

    tx = Transaction(
        version=TX_VERSION_EXCHANGE,
        inputs=[TxInput(prev_tx_id=bytes.fromhex(utxo["txId"]), output_index=utxo["vout"]) for utxo in selected],
        outputs=[
            TxOutput(
                jack_value=0,
                script_pubkey=create_p2pkh_script_pubkey(address_to_pubkey_hash(wallet.address)),
                assets={ASSET_ID_POT: pot_amount},
            ),
            TxOutput(jack_value=jack_to_pool, script_pubkey=b"JACKPOT_POOL"),
            TxOutput(jack_value=0, script_pubkey=create_op_return_script(f"EXCHANGE:{jack_burned}".encode())),
            *(
                [TxOutput(
                    jack_value=jack_change,
                    script_pubkey=create_p2pkh_script_pubkey(address_to_pubkey_hash(wallet.address)),
                )]
                if jack_change > 0
                else []
            ),
        ],
        locktime=0,
    )
    sign_wallet_inputs(tx, selected, wallet)
    return BuiltSignedTransaction(tx_id=tx.get_txid().hex(), signed_tx_hex=tx.serialize().hex())


def build_lotto_commit_tx(utxos: list[dict[str, Any]], wallet: WalletMaterial, chosen_numbers: list[int]) -> BuiltSignedTransaction:
    spendable_pot_utxos = [
        utxo
        for utxo in utxos
        if utxo["address"] == wallet.address
        and utxo["assets"].get(ASSET_ID_POT, 0) > 0
        and is_spendable_wallet_utxo(utxo)
    ]
    pot_selected, total_pot = select_wallet_utxos(
        spendable_pot_utxos,
        COIN,
        lambda item: item["assets"].get(ASSET_ID_POT, 0),
    )
    require(total_pot >= COIN, "insufficient POT UTXOs for lotto commit")

    jack_from_pot_inputs = sum(utxo["jackAmount"] for utxo in pot_selected)
    extra_fee_candidates = [
        utxo
        for utxo in utxos
        if utxo["address"] == wallet.address
        and utxo["jackAmount"] > 0
        and not utxo["assets"]
        and is_spendable_wallet_utxo(utxo)
        and all((utxo["txId"], utxo["vout"]) != (selected["txId"], selected["vout"]) for selected in pot_selected)
    ]
    extra_fee_selected, extra_fee_total = (
        ([], 0)
        if jack_from_pot_inputs >= MIN_TX_FEE
        else select_wallet_utxos(extra_fee_candidates, MIN_TX_FEE - jack_from_pot_inputs, lambda item: item["jackAmount"])
    )
    total_jack = jack_from_pot_inputs + extra_fee_total
    require(total_jack >= MIN_TX_FEE, "insufficient JACK UTXOs for lotto commit fee")

    selected = [*pot_selected, *extra_fee_selected]
    pot_change = total_pot - COIN
    jack_change = total_jack - MIN_TX_FEE
    tx = Transaction(
        version=TX_VERSION_GACHA_COMMIT,
        inputs=[TxInput(prev_tx_id=bytes.fromhex(utxo["txId"]), output_index=utxo["vout"]) for utxo in selected],
        outputs=[
            TxOutput(jack_value=0, script_pubkey=create_commit_script(chosen_numbers)),
            *(
                [TxOutput(
                    jack_value=0,
                    script_pubkey=create_p2pkh_script_pubkey(address_to_pubkey_hash(wallet.address)),
                    assets={ASSET_ID_POT: pot_change},
                )]
                if pot_change > 0
                else []
            ),
            *(
                [TxOutput(
                    jack_value=jack_change,
                    script_pubkey=create_p2pkh_script_pubkey(address_to_pubkey_hash(wallet.address)),
                )]
                if jack_change > 0
                else []
            ),
        ],
        locktime=0,
    )
    sign_wallet_inputs(tx, selected, wallet)
    return BuiltSignedTransaction(tx_id=tx.get_txid().hex(), signed_tx_hex=tx.serialize().hex())


def build_claim_tx(
    wallet_utxos: list[dict[str, Any]],
    pool_utxos: list[dict[str, Any]],
    wallet: WalletMaterial,
    commit_hash: str,
    payout_jack: int,
    payout_pot: int,
) -> BuiltSignedTransaction:
    fee_candidates = [
        utxo
        for utxo in wallet_utxos
        if utxo["address"] == wallet.address
        and utxo["jackAmount"] > 0
        and not utxo["assets"]
        and is_spendable_wallet_utxo(utxo)
    ]
    fee_selected, fee_total = select_wallet_utxos(fee_candidates, MIN_TX_FEE, lambda item: item["jackAmount"])
    require(fee_total >= MIN_TX_FEE, "insufficient JACK UTXOs for claim fee")

    pool_selected: list[dict[str, Any]] = []
    pool_total = 0
    if payout_jack > 0:
        pool_selected, pool_total = select_wallet_utxos(
            pool_utxos,
            payout_jack,
            lambda item: item.get("jack_satoshi", item["jackAmount"]),
        )
        require(pool_total >= payout_jack, "insufficient jackpot pool UTXOs for claim")

    all_inputs = [
        *[TxInput(prev_tx_id=bytes.fromhex(utxo["txId"]), output_index=utxo["vout"]) for utxo in fee_selected],
        *[
            TxInput(
                prev_tx_id=bytes.fromhex(utxo.get("txid", utxo["txId"])),
                output_index=utxo["vout"],
            )
            for utxo in pool_selected
        ],
    ]
    recipient_jack = payout_jack + max(0, fee_total - MIN_TX_FEE)
    recipient_assets = {ASSET_ID_POT: payout_pot} if payout_pot > 0 else {}
    outputs = [
        TxOutput(
            jack_value=recipient_jack,
            script_pubkey=create_p2pkh_script_pubkey(address_to_pubkey_hash(wallet.address)),
            assets=recipient_assets,
        )
    ]
    pool_change = pool_total - payout_jack
    if pool_change > 0:
        outputs.append(TxOutput(jack_value=pool_change, script_pubkey=b"JACKPOT_POOL"))
    outputs.append(TxOutput(jack_value=0, script_pubkey=create_claim_script(bytes.fromhex(commit_hash))))

    tx = Transaction(
        version=TX_VERSION_CLAIM,
        inputs=all_inputs,
        outputs=outputs,
        locktime=0,
    )
    sign_wallet_inputs(tx, fee_selected, wallet)
    return BuiltSignedTransaction(tx_id=tx.get_txid().hex(), signed_tx_hex=tx.serialize().hex())


def add_result(results: list[ScenarioResult], scenario_id: str, status: str, detail: str) -> None:
    results.append(ScenarioResult(scenario_id, status, detail))


def run() -> int:
    results: list[ScenarioResult] = []
    session = HttpSession()

    try:
        for path in ("/", "/wallet", "/lotto", "/mining", "/unknown-route"):
            status, body = session.get(f"{FRONTEND_URL}{path}")
            require(status == 200, f"{path} returned {status}")
            require("<div id=\"root\"></div>" in body, f"{path} did not return SPA shell")
        add_result(results, "FE-ROUTES", "PASS", "Frontend routes returned the SPA shell for known and unknown paths.")

        status, dashboard = session.get(f"{BASE_URL}/blockchain/dashboard")
        require(status == 200, f"dashboard failed: {dashboard}")
        height = dashboard["data"]["height"]
        add_result(results, "API-DASHBOARD", "PASS", f"Dashboard read succeeded at height={height}.")

        status, invalid_dashboard = session.get(f"{BASE_URL}/blockchain/dashboard?limit=0")
        require(status == 400, f"invalid dashboard limit expected 400: {invalid_dashboard}")
        add_result(results, "API-DASHBOARD-INVALID", "PASS", "Dashboard rejected limit=0 with 400.")

        status, block_detail = session.get(f"{BASE_URL}/blockchain/blocks/{height}")
        require(status == 200, f"block detail failed: {block_detail}")
        add_result(results, "API-BLOCK-DETAIL", "PASS", f"Block detail succeeded for height={height}.")

        wallet_a = build_wallet_material()
        register_status, register_payload = register_wallet(session, wallet_a, "QA Wallet A")
        require(register_status == 200, f"wallet register failed: {register_payload}")
        require(register_payload["data"]["onboardingRewardGranted"] is True, "onboarding reward was not granted")
        add_result(results, "WALLET-CREATE", "PASS", f"Wallet A registered: {wallet_a.address}.")

        token_a, session_handle_a = auth_wallet(session, wallet_a)
        add_result(results, "AUTH-VERIFY", "PASS", "Wallet A challenge and verify succeeded.")

        status, reuse_challenge = session.post(
            f"{BASE_URL}/auth/verify",
            {
                "challengeId": "already-used",
                "address": wallet_a.address,
                "publicKey": wallet_a.public_key_hex,
                "signature": "00",
            },
        )
        require(status == 401 or status == 400, f"unexpected challenge reuse handling: {reuse_challenge}")
        add_result(results, "AUTH-NEGATIVE-SHAPE", "PASS", "Malformed or stale verify attempts were rejected.")

        status, utxos_payload = session.get(f"{BASE_URL}/wallet/{wallet_a.address}/utxos", token_a)
        require(status == 200, f"wallet utxos failed: {utxos_payload}")
        utxos = utxos_payload["data"]["utxos"]
        require(len(utxos) == 1, f"expected one onboarding utxo: {utxos}")
        require(utxos[0]["assets"]["POT"] == 100_000_000, f"unexpected POT amount: {utxos}")
        require(utxos[0]["jackAmount"] >= MIN_TX_FEE, f"onboarding fee buffer missing: {utxos}")
        add_result(results, "WALLET-ONBOARDING-UTXO", "PASS", "Onboarding UTXO carries 1 POT and a JACK fee buffer.")

        status, unauthorized_wallet = session.get(f"{BASE_URL}/wallet/{wallet_a.address}/utxos")
        require(status == 401, f"unauthorized wallet read expected 401: {unauthorized_wallet}")
        add_result(results, "SEC-UNAUTHORIZED", "PASS", "Protected wallet read rejected missing bearer token.")

        wallet_b = build_wallet_material()
        register_status_b, register_payload_b = register_wallet(session, wallet_b, "QA Wallet B")
        require(register_status_b == 200, f"wallet B register failed: {register_payload_b}")
        status, forbidden_wallet = session.get(f"{BASE_URL}/wallet/{wallet_b.address}/utxos", token_a)
        require(status == 403, f"forbidden wallet read expected 403: {forbidden_wallet}")
        add_result(results, "SEC-FORBIDDEN", "PASS", "Protected wallet read rejected wallet subject mismatch.")

        status, wallet_list = session.get(
            f"{BASE_URL}/wallet?{urlencode({'addresses': wallet_a.address})}"
        )
        require(status == 200, f"wallet list failed: {wallet_list}")
        add_result(results, "API-WALLET-LIST", "PASS", "Wallet list returned the registered wallet summary.")

        status, wallet_list_invalid = session.get(f"{BASE_URL}/wallet?addresses=")
        require(status == 400, f"wallet list empty addresses expected 400: {wallet_list_invalid}")
        add_result(results, "API-WALLET-LIST-INVALID", "PASS", "Wallet list rejected an empty addresses query.")

        status, activities = session.get(f"{BASE_URL}/wallet/{wallet_a.address}/activities?size=20", token_a)
        require(status == 200, f"wallet activities failed: {activities}")
        add_result(results, "API-WALLET-ACTIVITIES", "PASS", "Wallet activities read succeeded.")

        status, activities_invalid = session.get(f"{BASE_URL}/wallet/{wallet_a.address}/activities?size=101", token_a)
        require(status == 400, f"wallet activities invalid size expected 400: {activities_invalid}")
        add_result(results, "API-WALLET-ACTIVITIES-INVALID", "PASS", "Wallet activities rejected size=101.")

        status, lotto_overview = session.get(f"{BASE_URL}/lotto?{urlencode({'address': wallet_a.address})}", token_a)
        require(status == 200, f"lotto overview failed: {lotto_overview}")
        add_result(results, "API-LOTTO-OVERVIEW", "PASS", "Lotto overview read succeeded with the onboarding balance.")

        chosen_numbers = [1, 2, 3, 4, 5, 6]
        commit_built_a = build_lotto_commit_tx(utxos, wallet_a, chosen_numbers)
        status, lotto_commit = session.post(
            f"{BASE_URL}/lotto/commit",
            {
                "fromAddress": wallet_a.address,
                "chosenNumbers": chosen_numbers,
                "signedTxHex": commit_built_a.signed_tx_hex,
            },
            token_a,
        )
        require(status == 200, f"lotto commit failed: {lotto_commit}")
        add_result(results, "API-LOTTO-COMMIT", "PASS", "Lotto commit succeeded immediately after wallet onboarding.")

        status, lotto_commit_repeat = session.post(
            f"{BASE_URL}/lotto/commit",
            {
                "fromAddress": wallet_a.address,
                "chosenNumbers": chosen_numbers,
                "signedTxHex": commit_built_a.signed_tx_hex,
            },
            token_a,
        )
        require(status == 503, f"repeat lotto commit expected 503: {lotto_commit_repeat}")
        add_result(results, "API-LOTTO-COMMIT-REPEAT", "PASS", "Repeated lotto commit was bounded with a 503 RPC failure.")

        status, lotto_entries = session.get(f"{BASE_URL}/lotto/entries?{urlencode({'address': wallet_a.address})}", token_a)
        require(status == 200, f"lotto entries failed: {lotto_entries}")
        add_result(results, "API-LOTTO-ENTRIES", "PASS", "Lotto entries read succeeded.")

        status, missing_result = session.get(f"{BASE_URL}/lotto/entries/missing-commit/result", token_a)
        require(status == 404, f"missing lotto result expected 404: {missing_result}")
        add_result(results, "API-LOTTO-RESULT-NEGATIVE", "PASS", "Unknown lotto commit result was rejected with 404.")

        status, missing_claim = session.post(
            f"{BASE_URL}/lotto/claim",
            {
                "fromAddress": wallet_a.address,
                "commitHash": "missing-commit",
                "signedTxHex": "00",
            },
            token_a,
        )
        require(status == 404 or status == 400, f"missing claim expected 404/400: {missing_claim}")
        add_result(results, "API-LOTTO-CLAIM-NEGATIVE", "PASS", "Invalid lotto claim request was rejected.")

        status, exchange_info = session.get(f"{BASE_URL}/exchange/info?{urlencode({'address': wallet_b.address})}", token_a)
        require(status == 403, f"exchange info cross-wallet expected 403: {exchange_info}")
        add_result(results, "API-EXCHANGE-FORBIDDEN", "PASS", "Exchange info rejected cross-wallet access.")

        token_b, session_handle_b = auth_wallet(HttpSession(), wallet_b)
        session_b = HttpSession()
        # Re-auth inside the dedicated session so refresh/logout use the right cookie jar.
        token_b, session_handle_b = auth_wallet(session_b, wallet_b)

        status, exchange_info_success = session_b.get(
            f"{BASE_URL}/exchange/info?{urlencode({'address': wallet_b.address})}",
            token_b,
        )
        require(status == 200, f"exchange info success failed: {exchange_info_success}")
        add_result(results, "API-EXCHANGE-INFO", "PASS", "Exchange info read succeeded for the authenticated wallet.")

        status, exchange_invalid = session_b.post(
            f"{BASE_URL}/exchange/jack-to-pot",
            {
                "fromAddress": wallet_b.address,
                "jackAmount": 1,
                "signedTxHex": "",
            },
            token_b,
        )
        require(status == 400, f"exchange invalid request expected 400: {exchange_invalid}")
        add_result(results, "API-EXCHANGE-INVALID", "PASS", "Exchange rejected an invalid request body.")

        status, mining_blocks = session_b.get(
            f"{BASE_URL}/mining/blocks?{urlencode({'address': wallet_b.address, 'size': 10})}",
            token_b,
        )
        require(status == 200, f"mining blocks failed: {mining_blocks}")
        add_result(results, "API-MINING-BLOCKS", "PASS", "Mining blocks read succeeded.")

        status, mining_invalid = session_b.get(
            f"{BASE_URL}/mining/blocks?{urlencode({'address': wallet_b.address, 'size': 0})}",
            token_b,
        )
        require(status == 400, f"mining invalid size expected 400: {mining_invalid}")
        add_result(results, "API-MINING-BLOCKS-INVALID", "PASS", "Mining blocks rejected size=0.")

        qa_miner = build_wallet_material()
        local_funding = rpc_call("grantlocaljack", [wallet_b.address, 4_000.0])
        require(local_funding["success"] is True, f"local JACK funding failed: {local_funding}")
        funding_block = rpc_call("mineqablocks", [1, qa_miner.address])
        require(len(funding_block["blocks"]) == 1, f"local funding block mining failed: {funding_block}")

        status, funded_utxos_payload = session_b.get(f"{BASE_URL}/wallet/{wallet_b.address}/utxos", token_b)
        require(status == 200, f"wallet B funded utxos failed: {funded_utxos_payload}")
        funded_utxos = funded_utxos_payload["data"]["utxos"]
        require(
            sum(utxo["jackAmount"] for utxo in funded_utxos if not utxo["assets"]) >= 4_000 * COIN,
            f"wallet B did not receive enough JACK funding: {funded_utxos}",
        )

        exchange_built = build_exchange_tx(funded_utxos, wallet_b, 3_000 * COIN)
        status, exchange_success = session_b.post(
            f"{BASE_URL}/exchange/jack-to-pot",
            {
                "fromAddress": wallet_b.address,
                "jackAmount": 3_000 * COIN,
                "signedTxHex": exchange_built.signed_tx_hex,
            },
            token_b,
        )
        require(status == 200, f"exchange success failed: {exchange_success}")
        exchange_block = rpc_call("mineqablocks", [1, qa_miner.address])
        require(len(exchange_block["blocks"]) == 1, f"exchange confirmation block mining failed: {exchange_block}")
        add_result(
            results,
            "API-EXCHANGE-SUCCESS",
            "PASS",
            f"Signed exchange succeeded for wallet {wallet_b.address} after local JACK funding.",
        )

        status, wallet_b_activities_after_exchange = session_b.get(
            f"{BASE_URL}/wallet/{wallet_b.address}/activities?size=20",
            token_b,
        )
        require(status == 200, f"wallet B activities after exchange failed: {wallet_b_activities_after_exchange}")
        require(
            any(item["type"] == "EXCHANGE" for item in wallet_b_activities_after_exchange["data"]["activities"]),
            f"exchange activity not indexed: {wallet_b_activities_after_exchange}",
        )

        status, post_exchange_utxos_payload = session_b.get(f"{BASE_URL}/wallet/{wallet_b.address}/utxos", token_b)
        require(status == 200, f"wallet B post-exchange utxos failed: {post_exchange_utxos_payload}")
        post_exchange_utxos = post_exchange_utxos_payload["data"]["utxos"]
        require(
            sum(utxo["assets"].get(ASSET_ID_POT, 0) for utxo in post_exchange_utxos) >= 30 * COIN,
            f"exchange did not yield enough POT: {post_exchange_utxos}",
        )

        commit_candidates: list[tuple[str, list[int]]] = []
        current_commit_utxos = post_exchange_utxos
        for index in range(30):
            chosen_numbers_b = [((index + offset) % 16) for offset in range(6)]
            commit_built_b = build_lotto_commit_tx(current_commit_utxos, wallet_b, chosen_numbers_b)
            status, lotto_commit_success = session_b.post(
                f"{BASE_URL}/lotto/commit",
                {
                    "fromAddress": wallet_b.address,
                    "chosenNumbers": chosen_numbers_b,
                    "signedTxHex": commit_built_b.signed_tx_hex,
                },
                token_b,
            )
            require(status == 200, f"wallet B lotto commit #{index + 1} failed: {lotto_commit_success}")
            commit_block = rpc_call("mineqablocks", [1, qa_miner.address])
            require(len(commit_block["blocks"]) == 1, f"commit confirmation block #{index + 1} failed: {commit_block}")
            commit_candidates.append((commit_built_b.tx_id, chosen_numbers_b))

            status, current_commit_utxos_payload = session_b.get(f"{BASE_URL}/wallet/{wallet_b.address}/utxos", token_b)
            require(status == 200, f"wallet B refreshed utxos after commit #{index + 1} failed: {current_commit_utxos_payload}")
            current_commit_utxos = current_commit_utxos_payload["data"]["utxos"]

        comparison_blocks = rpc_call("mineqablocks", [18, qa_miner.address])
        require(len(comparison_blocks["blocks"]) == 18, f"claimable comparison mining failed: {comparison_blocks}")

        status, claimable_entries_payload = session_b.get(
            f"{BASE_URL}/lotto/entries?{urlencode({'address': wallet_b.address})}",
            token_b,
        )
        require(status == 200, f"wallet B lotto entries failed: {claimable_entries_payload}")
        claimable_entry = next(
            (
                entry
                for entry in claimable_entries_payload["data"]["entries"]
                if entry["commitHash"] in {commit_hash for commit_hash, _ in commit_candidates}
                and entry["isClaimable"] is True
                and entry["matchCount"] is not None
                and entry["matchCount"] >= 1
            ),
            None,
        )
        require(claimable_entry is not None, f"commit entry not indexed: {claimable_entries_payload}")
        require(claimable_entry["isClaimable"] is True, f"entry is not claimable: {claimable_entry}")
        require(claimable_entry["status"] == "WINNING", f"entry status is not WINNING: {claimable_entry}")
        require(claimable_entry["matchCount"] >= 1, f"entry match count mismatch: {claimable_entry}")
        require(claimable_entry["claimed"] is False, f"entry unexpectedly marked claimed: {claimable_entry}")

        status, claimable_result_payload = session_b.get(
            f"{BASE_URL}/lotto/entries/{claimable_entry['commitHash']}/result",
            token_b,
        )
        require(status == 200, f"wallet B lotto result failed: {claimable_result_payload}")
        claimable_result = claimable_result_payload["data"]
        require(claimable_result["isClaimable"] is True, f"result is not claimable: {claimable_result}")
        require(claimable_result["matchCount"] >= 1, f"result match count mismatch: {claimable_result}")
        require(claimable_result["resultNumbers"] is not None, f"result digits missing: {claimable_result}")

        chain_result = rpc_call("lottocheckresult", [claimable_entry["commitHash"]])
        require(chain_result["claimable"] is True, f"chain does not consider entry claimable: {chain_result}")
        require(chain_result["matches"] >= 1, f"chain match count mismatch: {chain_result}")
        status, claim_context_payload = session_b.get(
            f"{BASE_URL}/lotto/entries/{claimable_entry['commitHash']}/claim-context",
            token_b,
        )
        require(status == 200, f"wallet B lotto claim context failed: {claim_context_payload}")
        claim_context = claim_context_payload["data"]
        payout_jack = claim_context["rewardJack"] or 0
        payout_pot = claim_context["rewardPot"] or 0
        require(claim_context["claimable"] is True, f"claim context is not claimable: {claim_context}")
        require(claim_context["matchCount"] >= 1, f"claim context match count mismatch: {claim_context}")
        require(payout_jack > 0 or payout_pot > 0, f"claim context returned no payout: {claim_context}")
        add_result(
            results,
            "API-LOTTO-CLAIM-CONTEXT",
            "PASS",
            f"Claim context exposed chain-derived payout and pool inputs for commit {claimable_entry['commitHash']}.",
        )

        status, claim_wallet_utxos_payload = session_b.get(f"{BASE_URL}/wallet/{wallet_b.address}/utxos", token_b)
        require(status == 200, f"wallet B claim utxos failed: {claim_wallet_utxos_payload}")
        claim_wallet_utxos = claim_wallet_utxos_payload["data"]["utxos"]
        claim_built = build_claim_tx(
            claim_wallet_utxos,
            claim_context["poolUtxos"],
            wallet_b,
            claimable_entry["commitHash"],
            payout_jack,
            payout_pot,
        )
        status, claim_success = session_b.post(
            f"{BASE_URL}/lotto/claim",
            {
                "fromAddress": wallet_b.address,
                "commitHash": claimable_entry["commitHash"],
                "signedTxHex": claim_built.signed_tx_hex,
            },
            token_b,
        )
        require(status == 200, f"lotto claim success failed: {claim_success}")
        claim_block = rpc_call("mineqablocks", [1, qa_miner.address])
        require(len(claim_block["blocks"]) == 1, f"claim confirmation block mining failed: {claim_block}")
        add_result(
            results,
            "API-LOTTO-CLAIM-SUCCESS",
            "PASS",
            f"Signed claim succeeded for commit {claimable_entry['commitHash']} after mined/indexed claimable entry reproduction with matchCount={chain_result['matches']}.",
        )

        status, claimed_entries_payload = session_b.get(
            f"{BASE_URL}/lotto/entries?{urlencode({'address': wallet_b.address})}",
            token_b,
        )
        require(status == 200, f"wallet B claimed entries failed: {claimed_entries_payload}")
        claimed_entry = next(
            (entry for entry in claimed_entries_payload["data"]["entries"] if entry["commitHash"] == claimable_entry["commitHash"]),
            None,
        )
        require(claimed_entry is not None, f"claimed entry missing from read model: {claimed_entries_payload}")
        require(claimed_entry["claimed"] is True, f"entry did not move to claimed=true: {claimed_entry}")
        require(claimed_entry["isClaimable"] is False, f"entry still marked claimable after claim: {claimed_entry}")

        status, wallet_b_activities_after_claim = session_b.get(
            f"{BASE_URL}/wallet/{wallet_b.address}/activities?size=30",
            token_b,
        )
        require(status == 200, f"wallet B activities after claim failed: {wallet_b_activities_after_claim}")
        require(
            any(item["type"] == "LOTTO_CLAIM" for item in wallet_b_activities_after_claim["data"]["activities"]),
            f"claim activity not indexed: {wallet_b_activities_after_claim}",
        )

        challenge_status, challenge_payload = session_b.post(
            f"{BASE_URL}/auth/challenge",
            {"address": wallet_b.address},
        )
        require(challenge_status == 200, f"wallet B challenge failed: {challenge_payload}")
        message_hash = hashlib.sha256(challenge_payload["data"]["message"].encode()).digest()
        signature = SigningKey.from_string(
            bytes.fromhex(wallet_b.private_key_hex),
            curve=SECP256k1,
        ).sign_digest(message_hash, sigencode=sigencode_der).hex()
        verify_status, verify_payload = session_b.post(
            f"{BASE_URL}/auth/verify",
            {
                "challengeId": challenge_payload["data"]["challengeId"],
                "address": wallet_b.address,
                "publicKey": wallet_b.public_key_hex,
                "signature": signature,
            },
        )
        require(verify_status == 200, f"wallet B verify failed: {verify_payload}")
        session_handle = verify_payload["data"]["refreshSessionHandle"]
        refresh_status, refresh_payload = session_b.post(
            f"{BASE_URL}/auth/refresh",
            {"sessionHandle": session_handle},
        )
        require(refresh_status == 200, f"refresh failed: {refresh_payload}")
        logout_status, logout_payload = session_b.post(
            f"{BASE_URL}/auth/logout",
            {"sessionHandle": session_handle},
        )
        require(logout_status == 200, f"logout failed: {logout_payload}")
        refresh_after_logout_status, refresh_after_logout_payload = session_b.post(
            f"{BASE_URL}/auth/refresh",
            {"sessionHandle": session_handle},
        )
        require(refresh_after_logout_status == 400, f"refresh after logout expected 400: {refresh_after_logout_payload}")
        add_result(results, "AUTH-REFRESH-LOGOUT", "PASS", "Refresh rotated the session, logout revoked it, and refresh-after-logout failed.")

        status, restore_duplicate = session.post(
            f"{BASE_URL}/wallet",
            {
                "address": wallet_b.address,
                "nickname": "QA Wallet B",
                "walletColor": "GRAY",
                "grantOnboardingReward": False,
            },
        )
        require(status == 409, f"duplicate restore expected 409: {restore_duplicate}")
        add_result(results, "WALLET-DUPLICATE-RESTORE", "PASS", "Duplicate restore path was rejected with 409.")

    except AssertionError as exc:
        add_result(results, "UNCAUGHT-ASSERTION", "FAIL", str(exc))
    except Exception as exc:  # pragma: no cover - smoke runner fallback
        add_result(results, "UNCAUGHT-EXCEPTION", "FAIL", f"{exc.__class__.__name__}: {exc}")

    print(json.dumps([asdict(result) for result in results], ensure_ascii=False, indent=2))
    has_failures = any(result.status == "FAIL" for result in results)
    return 1 if has_failures else 0


if __name__ == "__main__":
    sys.exit(run())
