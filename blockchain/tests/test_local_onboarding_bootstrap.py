import asyncio

from blockchain.bootstrap.local_onboarding_reward import (
    LOCAL_ONBOARDING_BOOTSTRAP_ADDRESS,
    ensure_local_onboarding_reward_bootstrap,
)
from blockchain.consensus.chain import Blockchain
from blockchain.rpc.server import RPCServer
from blockchain.wallet.wallet import Wallet


def test_local_onboarding_bootstrap_is_idempotent_and_enables_reward_rpc():
    blockchain = Blockchain()
    wallet = Wallet()
    recipient_wallet = Wallet()
    recipient_address = recipient_wallet.generate_address("recipient")

    first = ensure_local_onboarding_reward_bootstrap(blockchain, wallet, enabled=True)
    second = ensure_local_onboarding_reward_bootstrap(blockchain, wallet, enabled=True)

    assert first is not None
    assert first.address == LOCAL_ONBOARDING_BOOTSTRAP_ADDRESS
    assert first.created is True
    assert second is not None
    assert second.created is False

    rpc = RPCServer(blockchain=blockchain, wallet=wallet)
    result = asyncio.run(rpc._grantonboardingreward(recipient_address))

    assert result["success"] is True
    balances = rpc._getbalances(recipient_address)
    assert balances["pot_satoshi"] == 100_000_000


def test_local_onboarding_bootstrap_supports_multiple_rewards_without_mining():
    blockchain = Blockchain()
    wallet = Wallet()
    first_recipient = Wallet().generate_address("recipient-1")
    second_recipient = Wallet().generate_address("recipient-2")

    ensure_local_onboarding_reward_bootstrap(blockchain, wallet, enabled=True)
    rpc = RPCServer(blockchain=blockchain, wallet=wallet)

    first_result = asyncio.run(rpc._grantonboardingreward(first_recipient))
    second_result = asyncio.run(rpc._grantonboardingreward(second_recipient))

    assert first_result["success"] is True
    assert second_result["success"] is True
    assert rpc._getbalances(first_recipient)["pot_satoshi"] == 100_000_000
    assert rpc._getbalances(second_recipient)["pot_satoshi"] == 100_000_000


def test_local_onboarding_bootstrap_can_refill_when_minimum_capacity_is_requested():
    blockchain = Blockchain()
    wallet = Wallet()

    initial = ensure_local_onboarding_reward_bootstrap(blockchain, wallet, enabled=True)
    refill = ensure_local_onboarding_reward_bootstrap(
        blockchain,
        wallet,
        enabled=True,
        minimum_available_jack_satoshi=initial.jack_satoshi + 1,
    )

    assert initial is not None
    assert refill is not None
    assert refill.created is True
    assert refill.jack_satoshi > initial.jack_satoshi
