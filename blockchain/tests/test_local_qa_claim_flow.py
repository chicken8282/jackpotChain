import asyncio

from jackpotchain.consensus.chain import Blockchain, CommitInfo
from jackpotchain.consensus.miner import create_block_template, mine_block
from jackpotchain.core.transaction import TxOutput
from jackpotchain.core.utxo import UTXO
from jackpotchain.crypto.address import JACKPOT_POOL_ADDRESS, address_to_pubkey_hash
from jackpotchain.gacha.commit_reveal import calculate_result_digits, get_comparison_heights
from jackpotchain.gacha.service import create_gacha_service
from jackpotchain.mempool.pool import Mempool
from jackpotchain.rpc.server import RPCServer
from jackpotchain.script.standard import create_p2pkh_script_pubkey
from jackpotchain.validation.transaction import validate_transaction
from jackpotchain.wallet.wallet import Wallet


def mine_easy_block(blockchain: Blockchain, mempool: Mempool, miner_address: str):
    tip = blockchain.get_tip()
    template = create_block_template(
        prev_block=tip,
        miner_address=miner_address,
        transactions=mempool.get_txs_for_block(),
        difficulty_target=0x207FFFFF,
        height=blockchain.get_height() + 1,
    )
    result = mine_block(template, max_nonce=50_000)
    assert result.success is True
    added, message = blockchain.add_block(result.block)
    assert added is True, message
    mempool.remove_confirmed_txs([tx.get_txid() for tx in result.block.transactions[1:]])
    return result.block


def test_grantlocaljack_funds_a_local_wallet_for_exchange_qa():
    blockchain = Blockchain()
    wallet = Wallet()
    recipient_address = Wallet().generate_address("qa-recipient")

    rpc = RPCServer(blockchain=blockchain, wallet=wallet)

    result = asyncio.run(rpc._grantlocaljack(recipient_address, 200.0))

    assert result["success"] is True
    assert result["recipient_address"] == recipient_address
    assert result["jack_amount"] == 200.0
    assert rpc._getbalances(recipient_address)["jack_satoshi"] >= 20_000_000_000


def test_listpoolunspent_exposes_pool_utxos_for_local_claim_signing():
    blockchain = Blockchain()
    blockchain.utxo_set.add_utxo(
        UTXO(
            tx_id=bytes.fromhex("44" * 32),
            output_index=1,
            output=TxOutput(jack_value=123 * 100_000_000, script_pubkey=b"JACKPOT_POOL"),
            block_height=0,
            is_coinbase=False,
        ),
        JACKPOT_POOL_ADDRESS,
    )

    rpc = RPCServer(blockchain=blockchain, wallet=Wallet())

    pool_utxos = rpc._listpoolunspent()

    matching = next(item for item in pool_utxos if item["txid"] == "44" * 32)
    assert matching["jack_satoshi"] == 123 * 100_000_000


def test_mineqablocks_can_mine_a_target_digit_for_deterministic_claim_qa():
    blockchain = Blockchain()
    rpc = RPCServer(blockchain=blockchain, wallet=Wallet())
    miner_address = Wallet().generate_address("qa-miner")

    result = rpc._mineqablocks(count=1, address=miner_address, target_digits=[7])

    assert result["success"] is True
    assert result["address"] == miner_address
    assert len(result["blocks"]) == 1
    assert result["blocks"][0]["matched_digit"] == 7
    assert blockchain.get_height() == 1


def test_create_claim_builds_a_valid_manual_claim_transaction_after_n18():
    blockchain = Blockchain()
    mempool = Mempool()
    wallet = Wallet()
    player_address = wallet.generate_address("player")
    miner_address = wallet.generate_address("miner")

    # Claim fee input for the player.
    blockchain.utxo_set.add_utxo(
        UTXO(
            tx_id=bytes.fromhex("11" * 32),
            output_index=0,
            output=TxOutput(
                jack_value=2_000_000,
                script_pubkey=create_p2pkh_script_pubkey(address_to_pubkey_hash(player_address)),
            ),
            block_height=0,
            is_coinbase=False,
        ),
        player_address,
    )

    # Jackpot pool funding for JACK payouts.
    blockchain.utxo_set.add_utxo(
        UTXO(
            tx_id=bytes.fromhex("22" * 32),
            output_index=0,
            output=TxOutput(jack_value=300 * 100_000_000, script_pubkey=b"JACKPOT_POOL"),
            block_height=0,
            is_coinbase=False,
        ),
        JACKPOT_POOL_ADDRESS,
    )

    for _ in range(19):
        mine_easy_block(blockchain, mempool, miner_address)

    commit_height = 1
    comparison_heights = get_comparison_heights(commit_height)
    comparison_hashes = [blockchain.get_block_by_height(height).get_hash() for height in comparison_heights]
    result_digits = calculate_result_digits(comparison_hashes)
    chosen_numbers = [result_digits[0], 15, 15, 15, 15, 15]
    commit_tx_id = bytes.fromhex("33" * 32)

    blockchain._commit_index[commit_tx_id] = CommitInfo(
        tx_id=commit_tx_id,
        block_height=commit_height,
        block_hash=blockchain.get_block_by_height(commit_height).get_hash(),
        chosen_numbers=chosen_numbers,
        player_address=player_address,
        payout_height=0,
        pool_snapshot=300 * 100_000_000,
    )

    gacha_service = create_gacha_service()
    claim_tx, error = gacha_service.create_claim(
        wallet=wallet,
        utxo_set=blockchain.utxo_set,
        commit_hash=commit_tx_id,
        current_height=blockchain.get_height(),
        blockchain=blockchain,
        mempool=mempool,
    )

    assert error == ""
    assert claim_tx is not None
    assert claim_tx.version == 5

    validation = validate_transaction(
        claim_tx,
        blockchain.utxo_set,
        blockchain.get_height(),
        blockchain=blockchain,
        mempool=mempool,
    )

    assert validation.is_valid is True
