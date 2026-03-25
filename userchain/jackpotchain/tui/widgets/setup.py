"""
Setup Widget - 통합 설정 화면

① 지갑 선택/생성  →  ② 노드 연결  →  ③ 채굴 시작
세 단계를 한 화면에서 처리. NODE/MINING은 토글 버튼.
"""

import asyncio
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, Optional

from rich.text import Text

from textual import work
from textual.app import ComposeResult
from textual.widgets import Static, Label, Input, Button, ListView, ListItem
from textual.containers import ScrollableContainer, Horizontal, Vertical

from ..client import RPCClient
from ...wallet.wallet import Wallet


_SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]


def _toggle_label(on: bool, service: str, on_color: str) -> Text:
    t = Text(justify="center")
    if on:
        t.append("[*] ", style=f"bold {on_color}")
        t.append(f"{service}  ON", style=f"bold {on_color}")
    else:
        t.append("[ ] ", style="bold #777777")
        t.append(f"{service}  OFF", style="bold #777777")
    return t


class SetupWidget(ScrollableContainer):
    """통합 설정 위젯 (지갑 + 노드 + 채굴)"""

    can_focus = False

    def __init__(self, rpc: RPCClient, **kwargs):
        super().__init__(**kwargs)
        self.rpc = rpc
        self._wallets: Dict[str, Wallet] = {}
        self._addr_to_wallet: Dict[str, str] = {}
        self._balances: Dict[str, float] = {}
        self._pot_balances: Dict[str, float] = {}
        self._node_connected: bool = False
        self._is_mining: bool = False
        self._peers: int = 0
        self.node_process: Optional[subprocess.Popen] = None
        self._node_syncing: bool = False
        self._spinner_frame: int = 0
        self._spinner_timer = None

    def compose(self) -> ComposeResult:
        # ── 단계 체크리스트 ───────────────────────────────────────────────────
        yield Static("", id="setup-step-bar")

        # ── 메인 2열 레이아웃 ─────────────────────────────────────────────────
        yield Horizontal(
            # ── 왼쪽: 지갑 ────────────────────────────────────────────────────
            Vertical(
                Label("WALLET", classes="box-title"),
                Horizontal(
                    Label("JACK", classes="stat-label"),
                    Label("--", id="setup-jack", classes="stat-value cyan"),
                    Label("  POT", classes="stat-label"),
                    Label("--", id="setup-pot", classes="stat-value yellow"),
                ),
                ListView(id="setup-wallet-list"),
                Horizontal(
                    Button("[+] New Wallet", id="btn-setup-new-wallet", variant="success"),
                    Button("Add Addr", id="btn-setup-add-addr", variant="warning"),
                    Button("Open Folder", id="btn-setup-open-folder", variant="default"),
                    classes="action-buttons",
                ),
                # 지갑 생성 패널 (토글)
                Vertical(
                    Input(placeholder="wallet name (e.g. main)", id="setup-new-wallet-name"),
                    Horizontal(
                        Button("Create", id="btn-setup-confirm-create", variant="success"),
                        Button("Cancel", id="btn-setup-cancel-create", variant="error"),
                        classes="action-buttons",
                    ),
                    classes="hidden",
                    id="setup-create-panel",
                ),
                classes="stat-box setup-left",
            ),

            # ── 오른쪽: 노드 토글 + 채굴 토글 ────────────────────────────────
            Vertical(
                # 노드 섹션
                Vertical(
                    Label("NODE", classes="box-title"),
                    Horizontal(
                        Label("RPC", classes="stat-label"),
                        Label(f"{self.rpc.host}:{self.rpc.port}", id="setup-rpc-addr", classes="stat-value dim"),
                    ),
                    Horizontal(
                        Label("Peers", classes="stat-label"),
                        Label("--", id="setup-peers", classes="stat-value cyan"),
                    ),
                    Button(
                        _toggle_label(False, "NODE", "#00d4ff"),
                        id="btn-setup-toggle-node",
                        classes="toggle-btn toggle-off",
                    ),
                    id="setup-node-box",
                    classes="stat-box",
                ),
                # 채굴 섹션
                Vertical(
                    Label("MINING", classes="box-title"),
                    Horizontal(
                        Label("Address", classes="stat-label"),
                        Label("--", id="setup-mining-addr", classes="stat-value cyan"),
                    ),
                    Horizontal(
                        Label("Hash Rate", classes="stat-label"),
                        Label("--", id="setup-hashrate", classes="stat-value"),
                    ),
                    Horizontal(
                        Label("Blocks", classes="stat-label"),
                        Label("0", id="setup-blocks-mined", classes="stat-value yellow"),
                    ),
                    Button(
                        _toggle_label(False, "MINING", "#ffbd2e"),
                        id="btn-setup-toggle-mining",
                        classes="toggle-btn toggle-off",
                    ),
                    id="setup-mining-box",
                    classes="stat-box",
                ),
                classes="setup-right",
            ),
            id="setup-main",
        )

        # ── 빠른 송금 ─────────────────────────────────────────────────────────
        yield Vertical(
            Label("QUICK SEND", classes="box-title"),
            Horizontal(
                Vertical(
                    Horizontal(
                        Label("To", classes="send-label"),
                        Input(placeholder="Recipient address", id="setup-send-to"),
                    ),
                    Horizontal(
                        Label("Amt", classes="send-label"),
                        Input(placeholder="10", id="setup-send-amount"),
                    ),
                    classes="send-fields",
                ),
                Button("SEND", id="btn-setup-send", variant="primary", classes="send-btn"),
            ),
            classes="stat-box",
        )

        # ── 상태 메시지 (평소엔 숨김) ──────────────────────────────────────────
        yield Label("", id="setup-status", classes="status-msg hidden")

    def on_mount(self) -> None:
        self._load_all_wallets()
        self._update_step_checklist()
        self.refresh_data()
        self.set_interval(3, self.refresh_data)

    def _load_all_wallets(self) -> None:
        self._wallets.clear()
        self._addr_to_wallet.clear()
        for wf in self.app.get_wallet_files():
            try:
                w = Wallet(str(wf))
                name = wf.stem
                self._wallets[name] = w
                for addr in w.get_addresses():
                    self._addr_to_wallet[addr] = name
                for addr in w._watch_only:
                    self._addr_to_wallet[addr] = name
            except Exception:
                pass

    def refresh_data(self) -> None:
        self._load_all_wallets()
        self._update_wallet_list()
        self._fetch_data()

    @work(exclusive=True)
    async def _fetch_data(self) -> None:
        """노드 상태 + 잔액 비동기 로드"""
        # 노드 연결 확인
        resp = await self.rpc.get_mining_info()
        self._node_connected = resp.success

        if self._node_connected:
            # 피어 수
            net_resp = await self.rpc.get_network_info()
            if net_resp.success:
                self._peers = net_resp.result.get("connections", 0)
                self.query_one("#setup-peers", Label).update(str(self._peers))

            # 채굴 상태
            data = resp.result
            is_mining = data.get("mining", False)
            self._is_mining = is_mining
            if is_mining:
                addr = data.get("mining_address", "")
                if addr:
                    self.query_one("#setup-mining-addr", Label).update(
                        f"{addr[:12]}...{addr[-6:]}"
                    )
                hashrate = data.get("hashrate", 0)
                if hashrate > 1_000_000:
                    hr_str = f"{hashrate/1_000_000:.2f} MH/s"
                elif hashrate > 1_000:
                    hr_str = f"{hashrate/1_000:.2f} KH/s"
                else:
                    hr_str = f"{hashrate:.0f} H/s"
                self.query_one("#setup-hashrate", Label).update(hr_str)
                self.query_one("#setup-blocks-mined", Label).update(
                    str(data.get("blocks_mined", 0))
                )
        else:
            self._peers = 0
            self.query_one("#setup-peers", Label).update("--")

        self._update_node_toggle()
        self._update_mining_toggle()
        self._update_step_checklist()

        # 잔액 로드
        all_addrs = list(self._addr_to_wallet.keys())
        total_jack = 0.0
        total_pot = 0.0
        if self._node_connected and all_addrs:
            for addr in all_addrs:
                try:
                    r = await self.rpc.get_balances(addr)
                    if r.success:
                        d = r.result
                        jack = d.get("jack", 0)
                        pot = d.get("pot", 0)
                        self._balances[addr] = jack
                        self._pot_balances[addr] = pot
                        total_jack += jack
                        total_pot += pot
                except Exception:
                    pass

        self.query_one("#setup-jack", Label).update(f"{total_jack:,.2f}")
        self.query_one("#setup-pot", Label).update(f"{total_pot:,.1f}")
        self._update_wallet_list()

    # ── UI 업데이트 헬퍼 ────────────────────────────────────────────────────

    def _set_status(self, msg: str, timeout: float = 5.0) -> None:
        """상태 메시지를 표시하고 timeout 초 후 자동으로 숨깁니다."""
        lbl = self.query_one("#setup-status", Label)
        lbl.update(msg)
        lbl.remove_class("hidden")
        self.set_timer(timeout, lambda: lbl.add_class("hidden"))

    def _update_step_checklist(self) -> None:
        wallet_ok = self.app.current_wallet is not None
        node_ok = self._node_connected
        mining_ok = self._is_mining

        t = Text()

        def step_part(done: bool, current: bool, label: str, sub: str) -> None:
            if done:
                t.append(" [v] ", style="bold #00d4ff")
                t.append(label, style="bold #00d4ff dim")
                t.append(f"  {sub}", style="#00d4ff dim")
            elif current:
                t.append(" [ ] ", style="bold #ffbd2e")
                t.append(label, style="bold #ffbd2e")
                t.append(f"  {sub}", style="#ffbd2e dim")
            else:
                t.append(" [ ] ", style="#555555")
                t.append(label, style="#555555")
                t.append(f"  {sub}", style="#333333")

        wf_name = (
            self.app.current_wallet_file.stem
            if self.app.current_wallet_file
            else "select below"
        )
        step_part(wallet_ok, not wallet_ok, "WALLET", wf_name)
        t.append("  --->  ", style="#333333")
        step_part(node_ok, wallet_ok and not node_ok, "NODE",
                  f"{self._peers} peers" if node_ok else "toggle below")
        t.append("  --->  ", style="#333333")
        step_part(mining_ok, node_ok and not mining_ok, "MINING",
                  "active" if mining_ok else "toggle below")

        self.query_one("#setup-step-bar", Static).update(t)

    def _tick_spinner(self) -> None:
        self._spinner_frame = (self._spinner_frame + 1) % len(_SPINNER_FRAMES)
        self._update_node_toggle()

    def _update_node_toggle(self) -> None:
        try:
            btn = self.query_one("#btn-setup-toggle-node", Button)
            if self._node_connected:
                # 연결 완료 → 스피너 정지
                if self._spinner_timer is not None:
                    self._spinner_timer.stop()
                    self._spinner_timer = None
                self._node_syncing = False
                btn.label = _toggle_label(True, "NODE", "#00d4ff")
                btn.remove_class("toggle-off", "toggle-on-yellow")
                btn.add_class("toggle-on-cyan")
            elif self._node_syncing:
                # 동기화 중 → 스피너 표시
                sp = _SPINNER_FRAMES[self._spinner_frame]
                t = Text(justify="center")
                t.append(f"{sp} ", style="bold #ffbd2e")
                t.append("NODE  SYNCING...", style="bold #ffbd2e")
                btn.label = t
                btn.remove_class("toggle-off", "toggle-on-cyan")
                btn.add_class("toggle-on-yellow")
            else:
                btn.label = _toggle_label(False, "NODE", "#00d4ff")
                btn.remove_class("toggle-on-cyan", "toggle-on-yellow")
                btn.add_class("toggle-off")
        except Exception:
            pass

    def _update_mining_toggle(self) -> None:
        try:
            btn = self.query_one("#btn-setup-toggle-mining", Button)
            btn.label = _toggle_label(self._is_mining, "MINING", "#ffbd2e")
            if self._is_mining:
                btn.remove_class("toggle-off")
                btn.add_class("toggle-on-yellow")
            else:
                btn.remove_class("toggle-on-yellow")
                btn.add_class("toggle-off")
        except Exception:
            pass

    def _update_wallet_list(self) -> None:
        lv = self.query_one("#setup-wallet-list", ListView)
        lv.clear()
        if not self._wallets:
            lv.append(ListItem(Label("(No wallets — click [+] New Wallet)")))
            return

        for name, wallet in self._wallets.items():
            addrs = wallet.get_addresses()
            is_sel = (
                self.app.current_wallet_file
                and self.app.current_wallet_file.stem == name
            )
            mark = "[v]" if is_sel else "[ ]"
            if self._node_connected:
                jack = sum(self._balances.get(a, 0) for a in addrs)
                pot = sum(self._pot_balances.get(a, 0) for a in addrs)
                pot_str = f" | {pot:.1f} POT" if pot > 0 else ""
                text = f"{mark} {name} ({len(addrs)} addr)  {jack:,.2f} JACK{pot_str}"
            else:
                text = f"{mark} {name} ({len(addrs)} addr)"
            item = ListItem(Label(text))
            item.data = {"type": "wallet", "name": name}
            lv.append(item)

            for addr in addrs:
                sel = "[*]" if addr == self.app.selected_address else "   "
                if self._node_connected:
                    b = self._balances.get(addr, 0)
                    atext = f"  {sel} {addr[:14]}...{addr[-4:]}  {b:,.2f}"
                else:
                    atext = f"  {sel} {addr[:14]}...{addr[-4:]}"
                aitem = ListItem(Label(atext))
                aitem.data = {"type": "address", "address": addr, "wallet": name}
                lv.append(aitem)

    # ── 이벤트 핸들러 ──────────────────────────────────────────────────────────

    def on_list_view_selected(self, event: ListView.Selected) -> None:
        item = event.item
        if not hasattr(item, "data") or not item.data:
            return
        d = item.data
        if d.get("type") == "wallet":
            name = d["name"]
            self.app.current_wallet = self._wallets[name]
            self.app.current_wallet_file = self.app.wallet_dir / f"{name}.json"
            addrs = self._wallets[name].get_addresses()
            if addrs:
                self.app.selected_address = addrs[0]
            self.run_worker(self._set_node_wallet(name))
            self._update_wallet_list()
            self._update_step_checklist()
            self._set_status(f"Wallet '{name}' selected")
        elif d.get("type") == "address":
            addr = d["address"]
            name = d["wallet"]
            self.app.selected_address = addr
            self.app.mining_address = addr
            self.app.current_wallet = self._wallets[name]
            self.app.current_wallet_file = self.app.wallet_dir / f"{name}.json"
            self.run_worker(self._set_node_wallet(name))
            self._update_wallet_list()
            if self._is_mining:
                self.run_worker(self._switch_mining_address(addr))
            else:
                self._set_status(f"Selected: {addr[:20]}...")

    async def _set_node_wallet(self, name: str) -> None:
        try:
            await self.rpc.set_wallet(name)
        except Exception:
            pass

    def on_button_pressed(self, event: Button.Pressed) -> None:
        bid = event.button.id
        if bid == "btn-setup-new-wallet":
            panel = self.query_one("#setup-create-panel")
            if "hidden" in panel.classes:
                panel.remove_class("hidden")
            else:
                panel.add_class("hidden")
        elif bid == "btn-setup-confirm-create":
            self._create_wallet()
        elif bid == "btn-setup-cancel-create":
            self.query_one("#setup-create-panel").add_class("hidden")
        elif bid == "btn-setup-add-addr":
            self._add_new_address()
        elif bid == "btn-setup-open-folder":
            self._open_wallet_folder()
        elif bid == "btn-setup-toggle-node":
            if self._node_connected or self._is_node_running():
                self.run_worker(self._stop_node())
            else:
                self._start_node()
        elif bid == "btn-setup-toggle-mining":
            if self._is_mining:
                self.run_worker(self._stop_mining())
            else:
                self.run_worker(self._start_mining())
        elif bid == "btn-setup-send":
            self.run_worker(self._send_jack())

    def _create_wallet(self) -> None:
        name = self.query_one("#setup-new-wallet-name", Input).value.strip()
        safe = "".join(c for c in name if c.isalnum() or c in "-_")
        if not safe:
            self._set_status("Enter a valid wallet name")
            return
        if self.app.create_wallet(safe):
            self._set_status(f"Wallet '{safe}' created!")
            self.query_one("#setup-new-wallet-name", Input).value = ""
            self.query_one("#setup-create-panel").add_class("hidden")
            self.refresh_data()
        else:
            self._set_status("Failed (already exists?)")

    def _open_wallet_folder(self) -> None:
        folder = self.app.wallet_dir
        try:
            opener = "explorer" if os.name == "nt" else ("open" if sys.platform == "darwin" else "xdg-open")
            subprocess.Popen([opener, str(folder)])
        except Exception as e:
            self._set_status(f"Cannot open folder: {e}")

    def _add_new_address(self) -> None:
        if not self.app.current_wallet:
            self._set_status("Select a wallet first")
            return
        addr = self.app.current_wallet.generate_address()
        self.app.selected_address = addr
        self._set_status(f"New address: {addr[:20]}...")
        self.refresh_data()

    # ── 노드 제어 ──────────────────────────────────────────────────────────────

    def _is_node_running(self) -> bool:
        return self.node_process is not None and self.node_process.poll() is None

    def _start_node(self) -> None:
        if self._is_node_running():
            self._set_status("Node already running!")
            return
        app = self.app
        if not app.current_wallet_file:
            self._set_status("Select a wallet first!")
            return
        wallet_path = str(app.current_wallet_file.absolute())
        if getattr(sys, "frozen", False):
            cmd = [
                sys.executable, "node",
                "--rpc-port", str(self.rpc.port),
                "--wallet-file", wallet_path,
            ]
        else:
            cmd = [
                sys.executable, "-m", "jackpotchain.cli.main", "node",
                "--rpc-port", str(self.rpc.port),
                "--wallet-file", wallet_path,
            ]
        try:
            appdata = os.environ.get("APPDATA", os.path.expanduser("~"))
            log_path = os.path.join(appdata, "JackpotChain", "node_subprocess.log")
            log_file = open(log_path, "w", encoding="utf-8")
            env = os.environ.copy()
            env["PYTHONIOENCODING"] = "utf-8"
            env["PYTHONUNBUFFERED"] = "1"
            self.node_process = subprocess.Popen(
                cmd,
                stdout=log_file,
                stderr=subprocess.STDOUT,
                env=env,
                creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
            )
            self._set_status(
                f"Node started ({app.current_wallet_file.name})"
            )
            self._node_syncing = True
            self._spinner_frame = 0
            if self._spinner_timer is not None:
                self._spinner_timer.stop()
            self._spinner_timer = self.set_interval(0.15, self._tick_spinner)
        except Exception as e:
            self._set_status(f"Node start failed: {e}")

    async def _stop_node(self) -> None:
        if self._is_mining:
            await self._stop_mining()
            await asyncio.sleep(1)
        if not self.node_process:
            self._set_status("No node to stop")
            return
        if self.node_process.poll() is not None:
            self.node_process = None
            return
        try:
            self.node_process.terminate()
            self.node_process.wait(timeout=5)
            self._set_status("Node stopped")
        except subprocess.TimeoutExpired:
            self.node_process.kill()
            self._set_status("Node force killed")
        finally:
            self.node_process = None

    async def _start_mining(self) -> None:
        address = getattr(self.app, "mining_address", None) or self.app.selected_address
        if not address:
            self._set_status("Select an address first!")
            return
        self.app.mining_address = address
        resp = await self.rpc.get_mining_info()
        if not resp.success:
            self._set_status("Starting node first...")
            self._start_node()
            for _ in range(10):
                await asyncio.sleep(1)
                resp = await self.rpc.get_mining_info()
                if resp.success:
                    break
            else:
                self._set_status("Node start timeout!")
                return
        resp = await self.rpc.start_mining(address)
        if resp.success:
            display = f"{address[:12]}...{address[-6:]}"
            self._set_status(f"Mining started: {display}")
            self._is_mining = True
            self._update_mining_toggle()
            self._update_step_checklist()
        else:
            self._set_status(f"Error: {resp.error}")

    async def _switch_mining_address(self, new_addr: str) -> None:
        """채굴 중 주소 변경: 중단 → 새 주소로 재시작"""
        self._set_status(f"Switching mining address...")
        await self._stop_mining()
        self.app.mining_address = new_addr
        await self._start_mining()
        self._set_status(f"Mining restarted: {new_addr[:12]}...{new_addr[-6:]}")

    async def _stop_mining(self) -> None:
        resp = await self.rpc.stop_mining()
        if resp.success:
            self._is_mining = False
            self._update_mining_toggle()
            self._update_step_checklist()
            self._set_status("Mining stopped")
        else:
            self._set_status(f"Error: {resp.error}")

    async def _send_jack(self) -> None:
        from ...crypto.address import validate_address

        if not self.app.selected_address:
            self._set_status("Select an address first")
            return
        to = self.query_one("#setup-send-to", Input).value.strip()
        if not to or not validate_address(to):
            self._set_status("Invalid recipient address")
            return
        amt_str = self.query_one("#setup-send-amount", Input).value
        try:
            amt = float(amt_str)
            if amt <= 0:
                raise ValueError
        except ValueError:
            self._set_status("Invalid amount")
            return
        resp = await self.rpc.send_to_address(to, amt)
        if resp.success:
            self._set_status(f"Sent {amt} JACK!")
            self.query_one("#setup-send-to", Input).value = ""
            self.query_one("#setup-send-amount", Input).value = ""
            self.refresh_data()
        else:
            self._set_status(f"Error: {resp.error}")

    def on_unmount(self) -> None:
        if self.node_process and self.node_process.poll() is None:
            self.node_process.terminate()
            try:
                self.node_process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self.node_process.kill()
