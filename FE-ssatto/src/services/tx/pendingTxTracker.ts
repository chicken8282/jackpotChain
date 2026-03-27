import type { WalletUtxo } from "../walletService";

interface PendingChangeEntry {
  txId: string;
  vout: number;
  address: string;
  jackAmount: number;
  assets: Record<string, number>;
}

function outpointKey(txId: string, vout: number): string {
  return `${txId}:${vout}`;
}

const spentOutpoints = new Set<string>();
const pendingChanges: PendingChangeEntry[] = [];

export function recordSubmittedTx(
  spent: Array<{ txId: string; vout: number }>,
  changes: PendingChangeEntry[],
): void {
  for (const s of spent) {
    spentOutpoints.add(outpointKey(s.txId, s.vout));
  }
  for (const c of changes) {
    pendingChanges.push(c);
  }
}

export function applyPendingState(confirmedUtxos: WalletUtxo[]): WalletUtxo[] {
  const filtered = confirmedUtxos.filter(
    (utxo) => !spentOutpoints.has(outpointKey(utxo.txId, utxo.vout)),
  );

  const confirmedKeys = new Set(filtered.map((u) => outpointKey(u.txId, u.vout)));

  const pendingUtxos: WalletUtxo[] = pendingChanges
    .filter((c) => !spentOutpoints.has(outpointKey(c.txId, c.vout)))
    .filter((c) => !confirmedKeys.has(outpointKey(c.txId, c.vout)))
    .map((c) => ({
      txId: c.txId,
      vout: c.vout,
      address: c.address,
      jackAmount: c.jackAmount,
      assets: { ...c.assets },
      confirmations: 0,
      coinbase: false,
    }));

  return [...filtered, ...pendingUtxos];
}

export function clearPendingState(): void {
  spentOutpoints.clear();
  pendingChanges.length = 0;
}

export function hasPendingState(): boolean {
  return spentOutpoints.size > 0 || pendingChanges.length > 0;
}
