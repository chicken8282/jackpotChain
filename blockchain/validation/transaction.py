"""
Step 5.1: 트랜잭션 검증
- 구조 검증
- 서명 검증
- 잔액 검증
"""

from typing import List, Optional, Tuple, TYPE_CHECKING
from dataclasses import dataclass
from enum import Enum

from ..core.transaction import Transaction, TxInput, TxOutput
from ..core.utxo import UTXO, UTXOSet
from ..script.interpreter import verify_script
from ..script.standard import (
    is_p2pkh_script_pubkey,
    is_op_return_script,
    is_claim_script,
    extract_claim_commit_tx_id,
    get_address_from_script_pubkey,
)
from ..crypto.hash import double_sha256, sha256
from ..constants import (
    MAX_TX_SIZE,
    TX_VERSION_TRANSFER,
    TX_VERSION_EXCHANGE,
    TX_VERSION_COMMIT,
    TX_VERSION_GACHA_REVEAL,
    TX_VERSION_CLAIM,
    COINBASE_MATURITY,
    LOTTO_MIN_CLAIM_GAP,
    LOTTO_MAX_CLAIM_GAP,
    ASSET_ID_POT,
)
from ..crypto.address import JACKPOT_POOL_ADDRESS
from ..gacha.commit_reveal import (
    get_comparison_heights,
    calculate_result_digits,
    count_matches,
    determine_prize,
    calculate_payout,
)


def _resolve_utxo(tx_id: bytes, output_index: int, utxo_set: UTXOSet, mempool=None) -> Optional[UTXO]:
    """UTXO 조회 (확정 UTXO → mempool/블록 내 TX fallback)"""
    utxo = utxo_set.get_utxo(tx_id, output_index)
    if utxo is not None:
        return utxo
    # mempool 또는 블록 내 부모 TX 출력에서 조회
    if mempool is not None:
        tx = mempool.get_tx(tx_id)
        if tx and output_index < len(tx.outputs):
            return UTXO(
                tx_id=tx_id,
                output_index=output_index,
                output=tx.outputs[output_index],
                block_height=0,
                is_coinbase=False,
            )
    return None

if TYPE_CHECKING:
    from ..consensus.chain import Blockchain


class TxValidationError(Enum):
    """검증 에러 코드"""
    VALID = 0
    TX_TOO_LARGE = 1
    EMPTY_INPUTS = 2
    EMPTY_OUTPUTS = 3
    DUPLICATE_INPUT = 4
    INVALID_OUTPOINT = 5
    INPUT_NOT_FOUND = 6
    IMMATURE_COINBASE = 7
    INSUFFICIENT_FUNDS = 8
    NEGATIVE_OUTPUT = 9
    INVALID_SCRIPT = 10
    INVALID_SIGNATURE = 11
    INVALID_VERSION = 12
    DUST_OUTPUT = 13
    INVALID_FEE = 14
    INVALID_PAYOUT = 19


@dataclass
class TxValidationResult:
    """검증 결과"""
    is_valid: bool
    error: TxValidationError = TxValidationError.VALID
    message: str = ""
    fee: int = 0


@dataclass
class ClaimValidationContext:
    """LOTTO_CLAIM 검증에 필요한 파생 데이터."""
    commit_tx_id: bytes
    recipient_address: str
    expected_payout_jack: int
    expected_payout_pot: int


def validate_tx_structure(tx: Transaction) -> TxValidationResult:
    """트랜잭션 구조 검증"""
    tx_size = len(tx.serialize())
    if tx_size > MAX_TX_SIZE:
        return TxValidationResult(
            is_valid=False,
            error=TxValidationError.TX_TOO_LARGE,
            message=f"TX size {tx_size} exceeds max {MAX_TX_SIZE}"
        )

    if tx.is_coinbase():
        if len(tx.outputs) < 1:
            return TxValidationResult(
                is_valid=False,
                error=TxValidationError.EMPTY_OUTPUTS,
                message="Coinbase must have at least 1 output"
            )
        return TxValidationResult(is_valid=True)

    if not tx.inputs:
        return TxValidationResult(
            is_valid=False,
            error=TxValidationError.EMPTY_INPUTS,
            message="TX has no inputs"
        )

    if not tx.outputs:
        return TxValidationResult(
            is_valid=False,
            error=TxValidationError.EMPTY_OUTPUTS,
            message="TX has no outputs"
        )

    seen_outpoints = set()
    for inp in tx.inputs:
        outpoint = (inp.prev_tx_id, inp.output_index)
        if outpoint in seen_outpoints:
            return TxValidationResult(
                is_valid=False,
                error=TxValidationError.DUPLICATE_INPUT,
                message="Duplicate input"
            )
        seen_outpoints.add(outpoint)

    valid_versions = {
        TX_VERSION_TRANSFER,
        TX_VERSION_EXCHANGE,
        TX_VERSION_COMMIT,
        TX_VERSION_GACHA_REVEAL,  # deprecated but still valid
        TX_VERSION_CLAIM,
    }
    if tx.version not in valid_versions:
        return TxValidationResult(
            is_valid=False,
            error=TxValidationError.INVALID_VERSION,
            message=f"Invalid TX version: {tx.version}"
        )

    for out in tx.outputs:
        if out.jack_value < 0:
            return TxValidationResult(
                is_valid=False,
                error=TxValidationError.NEGATIVE_OUTPUT,
                message="Negative output value"
            )

    return TxValidationResult(is_valid=True)


def is_jackpot_pool_script(script: bytes) -> bool:
    """잭팟 풀 특수 스크립트인지 확인"""
    return script == b'JACKPOT_POOL'


def _build_claim_validation_context(
    tx: Transaction,
    current_height: int,
    blockchain: 'Blockchain' = None,
) -> Tuple[Optional[ClaimValidationContext], Optional[TxValidationResult]]:
    """LOTTO_CLAIM 검증에 필요한 온체인 컨텍스트를 계산한다."""
    if blockchain is None:
        return None, TxValidationResult(
            is_valid=False,
            error=TxValidationError.INVALID_SCRIPT,
            message="Claim validation requires blockchain context",
        )

    commit_tx_id = None
    for output in tx.outputs:
        commit_tx_id = extract_claim_commit_tx_id(output.script_pubkey)
        if commit_tx_id is not None:
            break

    if commit_tx_id is None:
        return None, TxValidationResult(
            is_valid=False,
            error=TxValidationError.INVALID_SCRIPT,
            message="Claim transaction must include a claim OP_RETURN",
        )

    commit_info = blockchain.get_commit_info(commit_tx_id)
    if commit_info is None:
        return None, TxValidationResult(
            is_valid=False,
            error=TxValidationError.INVALID_OUTPOINT,
            message="Referenced commit transaction not found",
        )

    if commit_info.payout_height > 0:
        return None, TxValidationResult(
            is_valid=False,
            error=TxValidationError.INVALID_PAYOUT,
            message="Commit was already claimed",
        )

    gap = current_height - commit_info.block_height
    if gap < LOTTO_MIN_CLAIM_GAP:
        return None, TxValidationResult(
            is_valid=False,
            error=TxValidationError.INVALID_PAYOUT,
            message="Claim is too early",
        )
    if gap > LOTTO_MAX_CLAIM_GAP:
        return None, TxValidationResult(
            is_valid=False,
            error=TxValidationError.INVALID_PAYOUT,
            message="Claim window expired",
        )

    comparison_heights = get_comparison_heights(commit_info.block_height)
    comparison_hashes = []
    for height in comparison_heights:
        block = blockchain.get_block_by_height(height)
        if block is None:
            return None, TxValidationResult(
                is_valid=False,
                error=TxValidationError.INVALID_PAYOUT,
                message=f"Comparison block {height} is missing",
            )
        comparison_hashes.append(block.get_hash())

    result_digits = calculate_result_digits(comparison_hashes)
    chosen_numbers = commit_info.chosen_numbers or []
    matches = count_matches(chosen_numbers, result_digits)
    prize = determine_prize(matches)
    pool_snapshot = commit_info.pool_snapshot
    if pool_snapshot <= 0:
        pool_snapshot = sum(utxo.output.jack_value for utxo in blockchain.utxo_set.get_pool_utxos())
    payout_jack, payout_pot = calculate_payout(prize, pool_snapshot)

    if payout_jack == 0 and payout_pot == 0:
        return None, TxValidationResult(
            is_valid=False,
            error=TxValidationError.INVALID_PAYOUT,
            message="Losing entries cannot be claimed",
        )

    return ClaimValidationContext(
        commit_tx_id=commit_tx_id,
        recipient_address=commit_info.player_address,
        expected_payout_jack=payout_jack,
        expected_payout_pot=payout_pot,
    ), None


def validate_tx_scripts(
    tx: Transaction,
    utxo_set: UTXOSet,
    current_height: int,
    blockchain: 'Blockchain' = None,
    mempool=None,
) -> TxValidationResult:
    """트랜잭션 스크립트 검증"""
    if tx.is_coinbase():
        return TxValidationResult(is_valid=True)

    claim_context = None
    if tx.version == TX_VERSION_CLAIM:
        claim_context, error = _build_claim_validation_context(tx, current_height, blockchain)
        if error is not None:
            return error

    player_signed_inputs = 0

    for idx, inp in enumerate(tx.inputs):
        utxo = _resolve_utxo(inp.prev_tx_id, inp.output_index, utxo_set, mempool)
        if utxo is None:
            return TxValidationResult(
                is_valid=False,
                error=TxValidationError.INPUT_NOT_FOUND,
                message=f"Input {idx} UTXO not found"
            )

        if utxo.is_coinbase and not utxo.is_mature(current_height, COINBASE_MATURITY):
            return TxValidationResult(
                is_valid=False,
                error=TxValidationError.IMMATURE_COINBASE,
                message=f"Input {idx} coinbase not mature"
            )

        if is_op_return_script(utxo.output.script_pubkey):
            return TxValidationResult(
                is_valid=False,
                error=TxValidationError.INVALID_SCRIPT,
                message="Cannot spend OP_RETURN output"
            )

        # 잭팟 풀 UTXO는 일반 TX에서 지출 불가
        # (자동 지급은 coinbase-style로 채굴자가 생성)
        if is_jackpot_pool_script(utxo.output.script_pubkey):
            if tx.version == TX_VERSION_CLAIM:
                continue
            return TxValidationResult(
                is_valid=False,
                error=TxValidationError.INVALID_SCRIPT,
                message="Jackpot pool UTXO cannot be spent directly"
            )

        sig_hash = tx.get_signature_hash(idx, utxo.output.script_pubkey)

        if not verify_script(
            script_sig=inp.script_sig,
            script_pubkey=utxo.output.script_pubkey,
            tx_hash=sig_hash,
            input_index=idx
        ):
            return TxValidationResult(
                is_valid=False,
                error=TxValidationError.INVALID_SIGNATURE,
                message=f"Input {idx} signature verification failed"
            )

        if claim_context is not None:
            input_address = get_address_from_script_pubkey(utxo.output.script_pubkey)
            if input_address != claim_context.recipient_address:
                return TxValidationResult(
                    is_valid=False,
                    error=TxValidationError.INVALID_SIGNATURE,
                    message="Claim fee inputs must belong to the original player",
                )
            player_signed_inputs += 1

    if claim_context is not None and player_signed_inputs == 0:
        return TxValidationResult(
            is_valid=False,
            error=TxValidationError.INVALID_SIGNATURE,
            message="Claim transaction must include at least one player-signed input",
        )

    return TxValidationResult(is_valid=True)


def validate_tx_amounts(
    tx: Transaction,
    utxo_set: UTXOSet,
    current_height: int = 0,
    blockchain: 'Blockchain' = None,
    mempool=None,
) -> TxValidationResult:
    """트랜잭션 금액 검증"""
    if tx.is_coinbase():
        return TxValidationResult(is_valid=True)

    total_input = 0
    for inp in tx.inputs:
        utxo = _resolve_utxo(inp.prev_tx_id, inp.output_index, utxo_set, mempool)
        if utxo is None:
            return TxValidationResult(
                is_valid=False,
                error=TxValidationError.INPUT_NOT_FOUND,
                message="Input UTXO not found"
            )
        total_input += utxo.output.jack_value

    total_output = 0
    for out in tx.outputs:
        if not is_op_return_script(out.script_pubkey):
            total_output += out.jack_value

    if total_input < total_output:
        return TxValidationResult(
            is_valid=False,
            error=TxValidationError.INSUFFICIENT_FUNDS,
            message=f"Input {total_input} < Output {total_output}"
        )

    fee = total_input - total_output

    if tx.version == TX_VERSION_CLAIM:
        claim_context, error = _build_claim_validation_context(tx, current_height, blockchain)
        if error is not None:
            return error

        player_input_jack = 0
        pool_input_jack = 0
        for inp in tx.inputs:
            utxo = _resolve_utxo(inp.prev_tx_id, inp.output_index, utxo_set, mempool)
            if utxo is None:
                return TxValidationResult(
                    is_valid=False,
                    error=TxValidationError.INPUT_NOT_FOUND,
                    message="Input UTXO not found",
                )
            if utxo.output.assets:
                return TxValidationResult(
                    is_valid=False,
                    error=TxValidationError.INVALID_PAYOUT,
                    message="Claim fee inputs must not carry extra assets",
                )
            if is_jackpot_pool_script(utxo.output.script_pubkey):
                pool_input_jack += utxo.output.jack_value
            else:
                input_address = get_address_from_script_pubkey(utxo.output.script_pubkey)
                if input_address != claim_context.recipient_address:
                    return TxValidationResult(
                        is_valid=False,
                        error=TxValidationError.INVALID_PAYOUT,
                        message="Claim inputs must belong to the original player",
                    )
                player_input_jack += utxo.output.jack_value

        recipient_jack = 0
        recipient_pot = 0
        pool_change_jack = 0
        for out in tx.outputs:
            if is_op_return_script(out.script_pubkey):
                continue
            output_address = get_address_from_script_pubkey(out.script_pubkey)
            if output_address == claim_context.recipient_address:
                recipient_jack += out.jack_value
                recipient_pot += out.assets.get(ASSET_ID_POT, 0)
                unexpected_assets = [
                    asset_id
                    for asset_id, amount in out.assets.items()
                    if amount > 0 and asset_id != ASSET_ID_POT
                ]
                if unexpected_assets:
                    return TxValidationResult(
                        is_valid=False,
                        error=TxValidationError.INVALID_PAYOUT,
                        message="Claim outputs must not mint unsupported assets",
                    )
                continue
            if output_address == JACKPOT_POOL_ADDRESS:
                if out.assets:
                    return TxValidationResult(
                        is_valid=False,
                        error=TxValidationError.INVALID_PAYOUT,
                        message="Jackpot pool change cannot carry assets",
                    )
                pool_change_jack += out.jack_value
                continue
            return TxValidationResult(
                is_valid=False,
                error=TxValidationError.INVALID_PAYOUT,
                message="Claim outputs must only pay the player or jackpot pool change",
            )

        expected_pool_change = max(0, pool_input_jack - claim_context.expected_payout_jack)
        expected_recipient_jack = claim_context.expected_payout_jack + player_input_jack - fee

        if claim_context.expected_payout_jack > 0 and pool_input_jack < claim_context.expected_payout_jack:
            return TxValidationResult(
                is_valid=False,
                error=TxValidationError.INVALID_PAYOUT,
                message="Claim does not consume enough jackpot pool balance",
            )
        if pool_change_jack != expected_pool_change:
            return TxValidationResult(
                is_valid=False,
                error=TxValidationError.INVALID_PAYOUT,
                message="Jackpot pool change does not match expected payout",
            )
        if recipient_jack != expected_recipient_jack:
            return TxValidationResult(
                is_valid=False,
                error=TxValidationError.INVALID_PAYOUT,
                message="Player JACK output does not match payout plus signed change",
            )
        if recipient_pot != claim_context.expected_payout_pot:
            return TxValidationResult(
                is_valid=False,
                error=TxValidationError.INVALID_PAYOUT,
                message="Player POT output does not match the expected refund",
            )

    return TxValidationResult(
        is_valid=True,
        fee=fee
    )


def validate_transaction(
    tx: Transaction,
    utxo_set: UTXOSet,
    current_height: int,
    blockchain: 'Blockchain' = None,
    mempool=None,
) -> TxValidationResult:
    """전체 트랜잭션 검증 (통합)"""
    result = validate_tx_structure(tx)
    if not result.is_valid:
        return result

    if tx.is_coinbase():
        return TxValidationResult(is_valid=True)

    result = validate_tx_scripts(tx, utxo_set, current_height, blockchain, mempool)
    if not result.is_valid:
        return result

    result = validate_tx_amounts(tx, utxo_set, current_height, blockchain, mempool)
    if not result.is_valid:
        return result

    return TxValidationResult(
        is_valid=True,
        fee=result.fee
    )


def validate_coinbase(
    tx: Transaction,
    block_height: int,
    expected_reward: int,
    total_fees: int
) -> TxValidationResult:
    """Coinbase 트랜잭션 검증"""
    if not tx.is_coinbase():
        return TxValidationResult(
            is_valid=False,
            error=TxValidationError.INVALID_SCRIPT,
            message="Not a coinbase transaction"
        )

    inp = tx.inputs[0]
    if inp.prev_tx_id != bytes(32) or inp.output_index != 0xFFFFFFFF:
        return TxValidationResult(
            is_valid=False,
            error=TxValidationError.INVALID_OUTPOINT,
            message="Invalid coinbase outpoint"
        )

    total_output = sum(out.jack_value for out in tx.outputs)
    max_reward = expected_reward + total_fees

    if total_output > max_reward:
        return TxValidationResult(
            is_valid=False,
            error=TxValidationError.INVALID_FEE,
            message=f"Coinbase output {total_output} exceeds max {max_reward}"
        )

    script_sig = inp.script_sig
    if len(script_sig) < 1:
        return TxValidationResult(
            is_valid=False,
            error=TxValidationError.INVALID_SCRIPT,
            message="Coinbase scriptSig too short"
        )

    height_len = script_sig[0]
    if len(script_sig) < 1 + height_len:
        return TxValidationResult(
            is_valid=False,
            error=TxValidationError.INVALID_SCRIPT,
            message="Invalid height encoding in coinbase"
        )

    encoded_height = int.from_bytes(script_sig[1:1+height_len], 'little')
    if encoded_height != block_height:
        return TxValidationResult(
            is_valid=False,
            error=TxValidationError.INVALID_SCRIPT,
            message=f"Coinbase height {encoded_height} != block height {block_height}"
        )

    return TxValidationResult(is_valid=True)
