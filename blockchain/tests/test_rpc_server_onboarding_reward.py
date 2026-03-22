import asyncio

from blockchain.consensus.chain import Blockchain
from blockchain.constants import MIN_TX_FEE
from blockchain.core.transaction import TxOutput
from blockchain.core.utxo import UTXO
from blockchain.crypto.address import address_to_pubkey_hash
from blockchain.rpc.server import RPCServer
from blockchain.script.standard import create_p2pkh_script_pubkey, get_address_from_script_pubkey
from blockchain.wallet.wallet import Wallet


def test_grantonboardingreward_creates_pot_output_for_recipient():
    blockchain = Blockchain()
    wallet = Wallet()
    funding_address = wallet.generate_address("funding")
    recipient_wallet = Wallet()
    recipient_address = recipient_wallet.generate_address("recipient")

    script_pubkey = create_p2pkh_script_pubkey(address_to_pubkey_hash(funding_address))
    funding_utxo = UTXO(
        tx_id=bytes.fromhex("11" * 32),
        output_index=0,
        output=TxOutput(jack_value=MIN_TX_FEE * 2, script_pubkey=script_pubkey),
        block_height=0,
        is_coinbase=False,
    )
    blockchain.utxo_set.add_utxo(funding_utxo, funding_address)

    rpc = RPCServer(blockchain=blockchain, wallet=wallet)

    result = asyncio.run(rpc._grantonboardingreward(recipient_address))

    assert result["success"] is True
    assert result["recipient_address"] == recipient_address
    assert result["pot_amount"] == 1.0

    raw_tx = rpc.mempool.get_tx(bytes.fromhex(result["tx_id"]))
    assert raw_tx is not None

    recipient_outputs = [
        output
        for output in raw_tx.outputs
        if get_address_from_script_pubkey(output.script_pubkey) == recipient_address
    ]
    assert recipient_outputs
    assert recipient_outputs[0].assets["POT"] == 100_000_000


def test_grantonboardingreward_is_visible_in_balances_before_confirmation():
    blockchain = Blockchain()
    wallet = Wallet()
    funding_address = wallet.generate_address("funding")
    recipient_wallet = Wallet()
    recipient_address = recipient_wallet.generate_address("recipient")

    script_pubkey = create_p2pkh_script_pubkey(address_to_pubkey_hash(funding_address))
    funding_utxo = UTXO(
        tx_id=bytes.fromhex("22" * 32),
        output_index=0,
        output=TxOutput(jack_value=MIN_TX_FEE * 2, script_pubkey=script_pubkey),
        block_height=0,
        is_coinbase=False,
    )
    blockchain.utxo_set.add_utxo(funding_utxo, funding_address)

    rpc = RPCServer(blockchain=blockchain, wallet=wallet)

    asyncio.run(rpc._grantonboardingreward(recipient_address))
    balances = rpc._getbalances(recipient_address)

    assert balances["pot_satoshi"] == 100_000_000


def test_grantonboardingreward_is_visible_in_listunspent_before_confirmation():
    blockchain = Blockchain()
    wallet = Wallet()
    funding_address = wallet.generate_address("funding")
    recipient_wallet = Wallet()
    recipient_address = recipient_wallet.generate_address("recipient")

    script_pubkey = create_p2pkh_script_pubkey(address_to_pubkey_hash(funding_address))
    funding_utxo = UTXO(
        tx_id=bytes.fromhex("33" * 32),
        output_index=0,
        output=TxOutput(jack_value=MIN_TX_FEE * 2, script_pubkey=script_pubkey),
        block_height=0,
        is_coinbase=False,
    )
    blockchain.utxo_set.add_utxo(funding_utxo, funding_address)

    rpc = RPCServer(blockchain=blockchain, wallet=wallet)

    asyncio.run(rpc._grantonboardingreward(recipient_address))
    utxos = rpc._listunspent(recipient_address)

    assert len(utxos) == 1
    assert utxos[0]["assets"]["POT"] == 100_000_000


def test_grantonboardingreward_provides_fee_buffer_for_immediate_lotto_commit():
    blockchain = Blockchain()
    wallet = Wallet()
    funding_address = wallet.generate_address("funding")
    recipient_wallet = Wallet()
    recipient_address = recipient_wallet.generate_address("recipient")

    script_pubkey = create_p2pkh_script_pubkey(address_to_pubkey_hash(funding_address))
    funding_utxo = UTXO(
        tx_id=bytes.fromhex("44" * 32),
        output_index=0,
        output=TxOutput(jack_value=MIN_TX_FEE * 3, script_pubkey=script_pubkey),
        block_height=0,
        is_coinbase=False,
    )
    blockchain.utxo_set.add_utxo(funding_utxo, funding_address)

    rpc = RPCServer(blockchain=blockchain, wallet=wallet)

    asyncio.run(rpc._grantonboardingreward(recipient_address))
    utxos = rpc._listunspent(recipient_address)

    assert len(utxos) == 1
    assert utxos[0]["assets"]["POT"] == 100_000_000
    assert utxos[0]["amount"] >= MIN_TX_FEE / 100_000_000


def test_grantonboardingreward_aggregates_fragmented_fee_utxos():
    blockchain = Blockchain()
    wallet = Wallet()
    funding_address = wallet.generate_address("funding")
    recipient_wallet = Wallet()
    recipient_address = recipient_wallet.generate_address("recipient")

    script_pubkey = create_p2pkh_script_pubkey(address_to_pubkey_hash(funding_address))
    for index, tx_hex in enumerate(("55" * 32, "66" * 32), start=0):
        blockchain.utxo_set.add_utxo(
            UTXO(
                tx_id=bytes.fromhex(tx_hex),
                output_index=index,
                output=TxOutput(jack_value=MIN_TX_FEE, script_pubkey=script_pubkey),
                block_height=0,
                is_coinbase=False,
            ),
            funding_address,
        )

    rpc = RPCServer(blockchain=blockchain, wallet=wallet)

    result = asyncio.run(rpc._grantonboardingreward(recipient_address))

    assert result["success"] is True
