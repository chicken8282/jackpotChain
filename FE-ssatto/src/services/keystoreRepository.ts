import type { EncryptedPrivateKeyPayload } from "../lib/crypto/encryption";

const DB_NAME = "ssatto-wallet-keystore";
const DB_VERSION = 1;
const STORE_NAME = "wallet-keystores";

export interface WalletKeystoreRecord extends EncryptedPrivateKeyPayload {
  id: string;
  walletId: string;
  address: string;
  publicKey: string;
  createdAt: string;
  updatedAt: string;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
      store.createIndex("walletId", "walletId", { unique: true });
      store.createIndex("address", "address", { unique: false });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB 열기에 실패했습니다."));
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void,
) {
  return openDatabase().then(
    (database) =>
      new Promise<T>((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);

        transaction.oncomplete = () => database.close();
        transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction 실패"));

        operation(store, resolve, reject);
      }),
  );
}

export function saveWalletKeystore(record: WalletKeystoreRecord) {
  return withStore<void>("readwrite", (store, resolve, reject) => {
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("지갑 keystore 저장에 실패했습니다."));
  });
}

export function getWalletKeystore(id: string) {
  return withStore<WalletKeystoreRecord>("readonly", (store, resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => {
      if (!request.result) {
        reject(new Error("지갑 keystore를 찾을 수 없습니다."));
        return;
      }
      resolve(request.result as WalletKeystoreRecord);
    };
    request.onerror = () => reject(request.error ?? new Error("지갑 keystore 조회에 실패했습니다."));
  });
}

export function deleteWalletKeystore(id: string) {
  return withStore<void>("readwrite", (store, resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("지갑 keystore 삭제에 실패했습니다."));
  });
}

export function resetKeystoreDatabase() {
  return new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("IndexedDB 초기화에 실패했습니다."));
    request.onblocked = () => reject(new Error("IndexedDB 초기화가 차단되었습니다."));
  });
}
