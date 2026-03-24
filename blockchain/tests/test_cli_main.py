import importlib
import sys

cli_main = importlib.import_module("blockchain.cli.main")


def test_node_command_accepts_rpc_host(monkeypatch):
    captured = {}

    def fake_run_node(args):
        captured["args"] = args

    monkeypatch.setattr(cli_main, "run_node", fake_run_node)
    monkeypatch.setattr(
        sys,
        "argv",
        ["jackpotchain", "node", "--rpc-host", "0.0.0.0", "--rpc-port", "18443"],
    )

    cli_main.main()

    assert captured["args"].rpc_host == "0.0.0.0"
    assert captured["args"].rpc_port == 18443
