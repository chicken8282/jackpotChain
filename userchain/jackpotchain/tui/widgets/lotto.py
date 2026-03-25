"""
Lotto Widget - 로또 메인 화면

잭팟 히어로 + POT 잔액/교환 바 + 타임라인 + 6자리 HEX 선택기 + 티켓 이력
버그 수정: run_worker exclusive=True (DataTable 레이스 컨디션 방지)
"""

import json
import os
import random
from pathlib import Path
from typing import Dict, List, Optional

from rich.text import Text

from textual import work
from textual.app import ComposeResult
from textual.widgets import Static, Label, Input, Button
from textual.containers import ScrollableContainer, Horizontal, Vertical

from ..client import RPCClient


# ── 로컬 이력 저장 유틸 ─────────────────────────────────────────────────────

def _get_history_path() -> Path:
    appdata = os.environ.get("APPDATA", os.path.expanduser("~"))
    path = Path(appdata) / "JackpotChain" / "lotto_history.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def _load_local_history() -> Dict[str, dict]:
    path = _get_history_path()
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            return data if isinstance(data, dict) else {}
        except Exception:
            return {}
    return {}


def _save_local_history(history: Dict[str, dict]) -> None:
    _get_history_path().write_text(
        json.dumps(history, indent=2, ensure_ascii=False), encoding="utf-8"
    )


# ── Rich 렌더링 헬퍼 ──────────────────────────────────────────────────────────

def _digit_box(val: str, style: str = "bold #8ab4cc on #131e28") -> Text:
    t = Text()
    t.append(f" {val} ", style=style)
    return t



def _render_history(display_rows: List[dict]) -> Text:
    """티켓 이력을 Rich Text로 렌더링 (색상 박스)."""
    t = Text()

    if not display_rows:
        t.append("  (no tickets yet)\n", style="#555555")
        return t

    for row in display_rows[:25]:
        commit_h = row.get("commit_height", 0)
        meta = f"#{commit_h:>5}" if commit_h else "    ? "
        t.append(f" {meta} ", style="#666666")

        chosen = row.get("chosen_hex_raw", [])
        result = row.get("result_hex_raw", [])

        # 내 숫자 (파란 박스)
        for n in chosen:
            val = f"{n:X}" if isinstance(n, int) else str(n).upper()
            t.append(f" {val} ", style="bold #8ab4cc on #131e28")

        t.append("  vs  ", style="#334455")

        # 결과 숫자 (hit=녹색, miss=빨강, wait=회색 점선)
        if result:
            for i, n in enumerate(result):
                val = f"{n:X}" if isinstance(n, int) else str(n).upper()
                if i < len(chosen) and (
                    (isinstance(chosen[i], int) and isinstance(n, int) and chosen[i] == n)
                    or (str(chosen[i]).upper() == str(n).upper())
                ):
                    t.append(f" {val} ", style="bold #5adf5a on #0d200d")  # hit
                else:
                    t.append(f" {val} ", style="bold #cc4444 on #200d0d")  # miss
        else:
            for _ in range(6):
                t.append(" ? ", style="#444444 on #111111")  # wait

        # 상태
        status_str = row.get("status_str", "")
        matches = row.get("matches", 0)
        if matches and matches >= 5:
            t.append(f"  {status_str}", style="bold #ffbd2e")
        elif matches and matches >= 3:
            t.append(f"  {status_str}", style="#aaaaaa")
        elif "MISS" in status_str or status_str == "No match":
            t.append(f"  {status_str}", style="#444444")
        elif "D-" in status_str or "MINING" in status_str:
            t.append(f"  {status_str}", style="#557766")
        else:
            t.append(f"  {status_str}", style="#666666")

        t.append("\n")

    return t


# ── 위젯 ───────────────────────────────────────────────────────────────────────

class LottoWidget(ScrollableContainer):
    """로또 위젯 (통합)"""

    can_focus = False

    def __init__(self, rpc: RPCClient, **kwargs):
        super().__init__(**kwargs)
        self.rpc = rpc
        self._local_history: Dict[str, dict] = {}
        self._live_commits: List[dict] = []
        self._display_rows: List[dict] = []
        self._pot_balance: float = 0.0
        self._jack_balance: float = 0.0
        self._current_height: int = 0

    def compose(self) -> ComposeResult:
        # ── 잭팟 풀 히어로 ────────────────────────────────────────────────────
        yield Vertical(
            Static("◆ JACKPOT POOL", id="jackpot-title"),
            Static("-- JACK", id="jackpot-amount"),
            Static("1st Prize (50%): --  │  Participants: --", id="jackpot-sub"),
            id="jackpot-hero",
        )

        # ── CHOOSE 6 HEX (전체 너비) ────────────────────────────────────────
        yield Vertical(
            # 헤더: 타이틀(좌) + 잔액+교환버튼(우)
            Horizontal(
                Label("HEX DIGITS (0~F)  ·  Cost: 1 POT", id="slot-title"),
                Horizontal(
                    Label("POT", id="lbl-pot"),
                    Label("--", id="pot-balance-count",    classes="stat-value yellow"),
                    Label("JACK", id="lbl-jack"),
                    Label("--", id="jack-balance-display", classes="stat-value cyan"),
                    Button("+1 POT",  id="btn-exchange-1",  variant="warning"),
                    Button("+5 POT",  id="btn-exchange-5",  variant="warning"),
                    Button("+10 POT", id="btn-exchange-10", variant="warning"),
                    id="exchange-bar",
                ),
                id="slot-header",
            ),
            # 슬롯 라벨 + 입력 (중앙 정렬, 정사각형)
            Horizontal(
                Label("N+3",  classes="slot-label"),
                Label("N+6",  classes="slot-label"),
                Label("N+9",  classes="slot-label"),
                Label("N+12", classes="slot-label"),
                Label("N+15", classes="slot-label"),
                Label("N+18", classes="slot-label"),
                id="slot-labels-row",
            ),
            Horizontal(
                Input(placeholder="?", id="s0", max_length=1),
                Input(placeholder="?", id="s1", max_length=1),
                Input(placeholder="?", id="s2", max_length=1),
                Input(placeholder="?", id="s3", max_length=1),
                Input(placeholder="?", id="s4", max_length=1),
                Input(placeholder="?", id="s5", max_length=1),
                id="slot-inputs-row",
            ),
            # 로또 버튼
            Horizontal(
                Button("Random",         id="btn-random", variant="primary"),
                Button("Clear",          id="btn-clear",  variant="error"),
                Button("Submit (1 POT)", id="btn-submit", variant="success"),
                classes="action-buttons",
            ),
            classes="stat-box",
            id="slot-section",
        )

        # ── PRIZE TABLE(좌) | MY TICKETS(우) — 항상 같은 높이 ────────────────
        yield Horizontal(
            Vertical(
                Label("PRIZE TABLE", classes="box-title"),
                Static(
                    "6 / 6   JACKPOT  (50% pool)\n"
                    "5 / 6   100,000 JACK\n"
                    "4 / 6    20,000 JACK\n"
                    "3 / 6     2,000 JACK\n"
                    "2 / 6       300 JACK\n"
                    "1 / 6     1 POT  (refund)",
                    id="prize-table",
                ),
                classes="stat-box",
                id="prize-section",
            ),
            Vertical(
                Label("MY TICKETS", classes="box-title"),
                Static("", id="lotto-history-display"),
                classes="stat-box",
                id="tickets-section",
            ),
            id="lotto-top",
        )


        # ── 상태 메시지 ────────────────────────────────────────────────────────
        yield Label("", id="lotto-status", classes="status-msg hidden")

    def _set_status(self, msg: str, timeout: float = 5.0) -> None:
        lbl = self.query_one("#lotto-status", Label)
        lbl.update(msg)
        lbl.remove_class("hidden")
        self.set_timer(timeout, lambda: lbl.add_class("hidden"))

    def on_mount(self) -> None:
        self._local_history = _load_local_history()
        self.refresh_data()
        self.set_interval(10, self.refresh_data)

    # ── 데이터 로드 ─────────────────────────────────────────────────────────────

    def refresh_data(self) -> None:
        self._load_data()

    @work(exclusive=True)
    async def _load_data(self) -> None:
        # 현재 블록 높이
        bc_resp = await self.rpc.get_blockchain_info()
        if bc_resp.success:
            self._current_height = bc_resp.result.get("blocks", 0)

        # 잭팟 풀
        resp = await self.rpc.get_jackpot_pool()
        if resp.success:
            data = resp.result
            pool = data.get("balance", 0)
            prize = data.get("next_jackpot", pool * 0.5)
            participants = data.get("participants", data.get("active_tickets", 0))
            self.query_one("#jackpot-amount", Static).update(f"{pool:,.0f} JACK")
            self.query_one("#jackpot-sub", Static).update(
                f"1st Prize (50%): {prize:,.0f} JACK  │  Participants: {participants}"
            )

        # POT / JACK 잔액 (전체 지갑 합산)
        resp = await self.rpc.get_balances()
        if resp.success:
            data = resp.result
            self._jack_balance = data.get("jack", 0)
            self._pot_balance = data.get("pot", 0)
            self.query_one("#pot-balance-count", Label).update(
                f"{self._pot_balance:,.1f}"
            )
            self.query_one("#jack-balance-display", Label).update(
                f"{self._jack_balance:,.2f}"
            )

        # 티켓 이력
        resp = await self.rpc.list_lotto_commits()
        self._live_commits = resp.result or [] if resp.success else []
        self._build_history_rows()
        self._refresh_displays()

        # READY 상태 티켓 자동 결과 확인
        ready_rows = [
            r for r in self._display_rows
            if r.get("status_str") == "READY"
            and r.get("tx_id")
            and r["tx_id"] not in self._local_history
        ]
        updated = False
        for row in ready_rows:
            tx_id = row["tx_id"]
            r2 = await self.rpc.lotto_check_result(tx_id)
            if not r2.success:
                continue
            data = r2.result
            if data.get("status") == "pending":
                continue
            self._local_history[tx_id] = {
                "chosen_hex":  data.get("chosen_hex", []),
                "result_hex":  data.get("result_hex", []),
                "matches":     data.get("matches", 0),
                "prize":       data.get("prize", "NONE"),
                "payout_jack": data.get("payout_jack", 0),
                "payout_pot":  data.get("payout_pot", 0),
                "paid":        data.get("paid", False),
                "commit_height": row.get("commit_height", 0),
            }
            updated = True
        if updated:
            _save_local_history(self._local_history)
            self._build_history_rows()
            self._refresh_displays()

    def _refresh_displays(self) -> None:
        hist = _render_history(self._display_rows)
        self.query_one("#lotto-history-display", Static).update(hist)

    def _build_history_rows(self) -> None:
        rows: List[dict] = []
        seen: set = set()

        for c in self._live_commits:
            tx_id = c.get("tx_id", "")
            if tx_id and self._local_history.get(tx_id, {}).get("deleted"):
                continue
            seen.add(tx_id)
            nums_raw = c.get("chosen_hex", c.get("chosen_numbers", []))
            commit_h = c.get("commit_height", 0)

            if tx_id and tx_id in self._local_history:
                rows.append(
                    self._make_local_row(tx_id, self._local_history[tx_id], commit_h)
                )
            else:
                blocks_left = c.get("blocks_until_payout", 0)
                status = c.get("status", "?")
                if status == "pending_mine":
                    status_str = "MINING..."
                elif blocks_left <= 0:
                    status_str = "READY"
                else:
                    status_str = f"D-{blocks_left}"
                rows.append({
                    "tx_id": tx_id,
                    "num_str": self._fmt_nums(nums_raw),
                    "chosen_hex_raw": _to_int_list(nums_raw),
                    "result_hex_raw": [],
                    "block_str": f"#{commit_h}",
                    "status_str": status_str,
                    "matches": 0,
                    "commit_height": commit_h,
                    "source": "live",
                })

        for tx_id, local in self._local_history.items():
            if tx_id in seen or local.get("deleted"):
                continue
            rows.append(
                self._make_local_row(tx_id, local, local.get("commit_height", 0))
            )

        rows.sort(key=lambda r: (
            0 if r["commit_height"] == 0 else 1,
            -r["commit_height"],
        ))
        self._display_rows = rows

    def _make_local_row(self, tx_id: str, local: dict, commit_h: int) -> dict:
        nums_raw = local.get("chosen_hex", local.get("chosen_numbers", []))
        result_raw = local.get("result_hex", [])
        matches = local.get("matches", 0)
        prize = local.get("prize", "NONE")
        payout_jack = local.get("payout_jack", 0)
        status_str = prize if matches > 0 else "MISS"
        return {
            "tx_id": tx_id,
            "num_str": self._fmt_nums(nums_raw),
            "chosen_hex_raw": _to_int_list(nums_raw),
            "result_hex_raw": _to_int_list(result_raw),
            "block_str": f"#{commit_h}" if commit_h else "#?",
            "status_str": status_str,
            "matches": matches,
            "payout_jack": payout_jack,
            "commit_height": commit_h,
            "source": "local",
        }

    @staticmethod
    def _fmt_nums(nums) -> str:
        if not nums:
            return "--"
        if isinstance(nums[0], int):
            return " ".join(f"{n:X}" for n in nums)
        return " ".join(str(n).upper() for n in nums)

    # ── 이벤트 ─────────────────────────────────────────────────────────────────

    def on_input_changed(self, event: Input.Changed) -> None:
        inp = event.input
        if inp.id and inp.id.startswith("s") and len(inp.id) == 2:
            filtered = "".join(
                c for c in event.value.upper() if c in "0123456789ABCDEF"
            )[:1]
            if filtered != event.value:
                inp.value = filtered
            if filtered and inp.id != "s5":
                next_slot = int(inp.id[1:]) + 1
                try:
                    self.query_one(f"#s{next_slot}", Input).focus()
                except Exception:
                    pass

    def on_button_pressed(self, event: Button.Pressed) -> None:
        bid = event.button.id

        if bid == "btn-random":
            self._fill_random()
        elif bid == "btn-clear":
            for i in range(6):
                self.query_one(f"#s{i}", Input).value = ""
            try:
                self.query_one("#s0", Input).focus()
            except Exception:
                pass
        elif bid == "btn-submit":
            self.run_worker(self._create_commit())
        elif bid == "btn-exchange-1":
            self.run_worker(self._exchange_pot(100))
        elif bid == "btn-exchange-5":
            self.run_worker(self._exchange_pot(500))
        elif bid == "btn-exchange-10":
            self.run_worker(self._exchange_pot(1000))

    def _fill_random(self) -> None:
        for i in range(6):
            self.query_one(f"#s{i}", Input).value = f"{random.randint(0, 15):X}"
        self._set_status("Random numbers generated!")

    def _get_numbers(self) -> Optional[list]:
        nums = []
        for i in range(6):
            v = self.query_one(f"#s{i}", Input).value.strip().upper()
            if v:
                try:
                    n = int(v, 16)
                    if 0 <= n <= 15:
                        nums.append(n)
                except ValueError:
                    pass
        return nums if len(nums) == 6 else None

    async def _create_commit(self) -> None:
        nums = self._get_numbers()
        addr = getattr(self.app, 'selected_address', None)
        if nums:
            resp = await self.rpc.lotto_commit(nums, from_address=addr)
        else:
            resp = await self.rpc.lotto_commit(from_address=addr)
        if resp.success:
            data = resp.result
            chosen = data.get("chosen_hex", [])
            self._set_status(
                f"Submitted! [{' '.join(str(c).upper() if not isinstance(c, int) else f'{c:X}' for c in chosen)}]  Auto-payout at N+18 blocks"
            )
            for i in range(6):
                self.query_one(f"#s{i}", Input).value = ""
            self.refresh_data()
        else:
            self._set_status(f"Error: {resp.error}")

    async def _exchange_pot(self, jack_amount: int) -> None:
        if self._jack_balance < jack_amount:
            self._set_status(
                f"Insufficient JACK (need {jack_amount}, have {self._jack_balance:.0f})"
            )
            return
        addr = getattr(self.app, 'selected_address', None)
        resp = await self.rpc.exchange_to_pot(jack_amount, from_address=addr)
        if resp.success:
            data = resp.result
            pot = data.get("pot_received", jack_amount // 10)
            self._set_status(
                f"Exchanged {jack_amount} JACK -> +{pot} POT"
            )
            self.refresh_data()
        else:
            self._set_status(f"Exchange failed: {resp.error}")

    async def _check_top_ready(self) -> None:
        """READY 상태 첫 티켓의 결과를 확인."""
        ready = [r for r in self._display_rows if r.get("status_str") == "READY"]
        if not ready:
            self._set_status("No tickets ready to check")
            return
        tx_id = ready[0].get("tx_id", "")
        if not tx_id:
            self._set_status("TX not yet mined")
            return
        await self._check_tx(tx_id, ready[0])

    async def _check_tx(self, tx_id: str, row: dict) -> None:
        if tx_id in self._local_history and not self._local_history[tx_id].get("deleted"):
            local = self._local_history[tx_id]
            self._set_status(
                f"Result: {local.get('matches', 0)} matches | {local.get('prize', 'NONE')} | {local.get('payout_jack', 0):,.0f} JACK"
            )
            return

        resp = await self.rpc.lotto_check_result(tx_id)
        if not resp.success:
            self._set_status(f"Error: {resp.error}")
            return
        data = resp.result
        if data.get("status") == "pending":
            blocks = data.get("blocks_remaining", 0)
            self._set_status(
                f"Pending -- {blocks} blocks until payout"
            )
            return

        result = {
            "chosen_hex": data.get("chosen_hex", []),
            "result_hex": data.get("result_hex", []),
            "matches": data.get("matches", 0),
            "prize": data.get("prize", "NONE"),
            "payout_jack": data.get("payout_jack", 0),
            "payout_pot": data.get("payout_pot", 0),
            "paid": data.get("paid", False),
            "commit_height": row.get("commit_height", 0),
        }
        self._local_history[tx_id] = result
        _save_local_history(self._local_history)
        self._set_status(
            f"Result: {result['matches']} matches | {result['prize']} | {result['payout_jack']:,.0f} JACK"
        )
        self.refresh_data()


# ── 유틸 ──────────────────────────────────────────────────────────────────────

def _to_int_list(nums) -> list:
    result = []
    for n in nums:
        if isinstance(n, int):
            result.append(n)
        else:
            try:
                result.append(int(str(n), 16))
            except Exception:
                pass
    return result
