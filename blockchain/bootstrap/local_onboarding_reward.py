"""Local-only onboarding reward bootstrap funding."""

from dataclasses import dataclass

from ..constants import COIN
from ..core.transaction import TxOutput
from ..core.utxo import UTXO
from ..crypto.address import address_to_pubkey_hash
from ..script.standard import create_p2pkh_script_pubkey

LOCAL_ONBOARDING_BOOTSTRAP_PRIVATE_KEY_HEX = "1111111111111111111111111111111111111111111111111111111111111111"
LOCAL_ONBOARDING_BOOTSTRAP_ADDRESS = "XB2T67yhoaXCMVvuEQFU4bGGbsACchbu82"
LOCAL_ONBOARDING_BOOTSTRAP_TX_ID = bytes.fromhex("99" * 32)
LOCAL_ONBOARDING_BOOTSTRAP_JACK_SATOSHI = 10_000 * COIN
LOCAL_ONBOARDING_BOOTSTRAP_REFILL_PREFIX = bytes.fromhex("98")


@dataclass
class LocalOnboardingBootstrapResult:
    """Local onboarding bootstrap result."""

    address: str
    jack_satoshi: int
    created: bool


def _refill_tx_id(index: int) -> bytes:
    return LOCAL_ONBOARDING_BOOTSTRAP_REFILL_PREFIX + index.to_bytes(31, "big")


def ensure_local_onboarding_reward_bootstrap(
    blockchain,
    wallet,
    enabled: bool = False,
    minimum_available_jack_satoshi: int = 0,
):
    """Prepare deterministic local JACK funding for onboarding reward relay fees."""
    if not enabled:
        return None
    if blockchain is None or wallet is None:
        raise ValueError("blockchain and wallet are required")

    bootstrap_address = wallet.import_private_key(
        bytes.fromhex(LOCAL_ONBOARDING_BOOTSTRAP_PRIVATE_KEY_HEX),
        label="local-onboarding-bootstrap",
    )
    if bootstrap_address != LOCAL_ONBOARDING_BOOTSTRAP_ADDRESS:
        raise ValueError("local onboarding bootstrap address mismatch")

    existing = blockchain.utxo_set.get_utxos_for_address(bootstrap_address)
    created = False

    if not any(utxo.tx_id == LOCAL_ONBOARDING_BOOTSTRAP_TX_ID and utxo.output_index == 0 for utxo in existing):
        blockchain.utxo_set.add_utxo(
            UTXO(
                tx_id=LOCAL_ONBOARDING_BOOTSTRAP_TX_ID,
                output_index=0,
                output=TxOutput(
                    jack_value=LOCAL_ONBOARDING_BOOTSTRAP_JACK_SATOSHI,
                    script_pubkey=create_p2pkh_script_pubkey(address_to_pubkey_hash(bootstrap_address)),
                ),
                block_height=0,
                is_coinbase=False,
            ),
            bootstrap_address,
        )
        created = True
        existing = blockchain.utxo_set.get_utxos_for_address(bootstrap_address)

    available_jack = sum(
        utxo.output.jack_value
        for utxo in existing
        if not utxo.output.assets
    )
    refill_index = 1
    while available_jack < minimum_available_jack_satoshi:
        tx_id = _refill_tx_id(refill_index)
        refill_index += 1
        if any(utxo.tx_id == tx_id and utxo.output_index == 0 for utxo in existing):
            continue

        refill_amount = max(
            LOCAL_ONBOARDING_BOOTSTRAP_JACK_SATOSHI,
            minimum_available_jack_satoshi - available_jack,
        )
        blockchain.utxo_set.add_utxo(
            UTXO(
                tx_id=tx_id,
                output_index=0,
                output=TxOutput(
                    jack_value=refill_amount,
                    script_pubkey=create_p2pkh_script_pubkey(address_to_pubkey_hash(bootstrap_address)),
                ),
                block_height=0,
                is_coinbase=False,
            ),
            bootstrap_address,
        )
        created = True
        available_jack += refill_amount
        existing = blockchain.utxo_set.get_utxos_for_address(bootstrap_address)

    return LocalOnboardingBootstrapResult(
        address=bootstrap_address,
        jack_satoshi=available_jack,
        created=created,
    )
