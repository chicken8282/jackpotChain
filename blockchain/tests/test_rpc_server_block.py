from blockchain.consensus.chain import Blockchain
from blockchain.rpc.server import RPCServer


def test_getblock_accepts_hash_from_getblockhash_and_returns_extended_fields():
    blockchain = Blockchain()
    rpc = RPCServer(blockchain=blockchain)

    block_hash = rpc._getblockhash(0)
    block = rpc._getblock(block_hash)

    assert block["hash"] == block_hash
    assert block["versionHex"] == "0x00000001"
    assert block["difficultyDisplay"].startswith("0x")
    assert block["rewardJack"] == 5_000_000_000
    assert block["feeRewardJack"] == 0
    assert "isMainChain" in block
