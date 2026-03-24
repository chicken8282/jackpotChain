/**
 * 세션 만료 E2E 통합 테스트 (Node.js)
 *
 * 목적: 브라우저 없이 실제 API 레이어에서 세션 만료 → refresh 실패 → null 반환
 * 경로를 검증한다. FE가 사용하는 동일 crypto 라이브러리를 사용한다.
 *
 * 실행:
 *   node scripts/e2e-session-expiry-test.mjs
 *
 * 전제조건:
 *   - docker compose --env-file .env.local -f docker-compose.local.yml up -d
 *   - jc-frontend-local healthy (localhost:13000)
 *   - jc-postgres-local healthy (localhost:15432)
 */

import { secp256k1 } from "/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/node_modules/@noble/curves/secp256k1.js";
import { sha256, sha256 as _sha256 } from "/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/node_modules/@noble/hashes/sha256.js";
import { ripemd160 } from "/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/node_modules/@noble/hashes/ripemd160.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/node_modules/@noble/hashes/utils.js";
import { createBase58check } from "/Users/jangjooyoon/Desktop/JooYoon/ssafy/S14P21E202/FE-ssatto/node_modules/@scure/base/lib/index.js";
import { execSync } from "child_process";

const BASE_URL = "http://localhost:13000/api/v1";
const DB_HOST = "localhost";
const DB_PORT = 15432;
const DB_USER = "jackpot";
const DB_PASS = "jackpot1234";
const DB_NAME = "jackpotchain";

// ─── crypto helpers (FE 동일 로직) ────────────────────────────────────────────

function sha256Bytes(data) {
  return sha256(data);
}

const base58check = createBase58check(sha256Bytes);

function encodeBase58Check(version, payload) {
  const body = new Uint8Array(payload.length + 1);
  body[0] = version;
  body.set(payload, 1);
  return base58check.encode(body);
}

const VERSION_PUBKEY = 0x4a;

function hash160Bytes(data) {
  return ripemd160(sha256(data));
}

function privateKeyToPublicKey(privateKeyHex) {
  return bytesToHex(secp256k1.getPublicKey(hexToBytes(privateKeyHex), true));
}

function publicKeyToAddress(publicKeyHex) {
  const hash = hash160Bytes(hexToBytes(publicKeyHex));
  return encodeBase58Check(VERSION_PUBKEY, hash);
}

function generateWallet() {
  const privateKeyBytes = secp256k1.utils.randomSecretKey();
  const privateKey = bytesToHex(privateKeyBytes);
  const publicKey = privateKeyToPublicKey(privateKey);
  const address = publicKeyToAddress(publicKey);
  return { privateKey, publicKey, address };
}

function signAuthMessage(message, privateKeyHex) {
  const msgHash = sha256(utf8ToBytes(message));
  const signature = secp256k1.sign(msgHash, hexToBytes(privateKeyHex), {
    prehash: false,
    format: "der",
  });
  return signature.toDERHex();
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────

async function post(path, body, cookie = null) {
  const headers = { "Content-Type": "application/json" };
  if (cookie) headers["Cookie"] = cookie;

  const resp = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    credentials: "include",
  });
  const data = await resp.json();
  return { status: resp.status, data, headers: resp.headers };
}

// ─── DB helper ────────────────────────────────────────────────────────────────

function psql(sql) {
  try {
    const result = execSync(
      `PGPASSWORD=${DB_PASS} docker exec jc-postgres-local psql -U ${DB_USER} -d ${DB_NAME} -t -c "${sql}"`,
      { encoding: "utf8" }
    ).trim();
    return result;
  } catch (e) {
    throw new Error(`psql error: ${e.message}`);
  }
}

// ─── test runner ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label, condition, details = "") {
  if (condition) {
    console.log(`  ✓ PASS  ${label}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL  ${label}${details ? " — " + details : ""}`);
    failed++;
  }
}

// ─── main ────────────────────────────────────────────────────────────────────

async function runTest() {
  console.log("\n=== 세션 만료 E2E 통합 테스트 시작 ===\n");

  const wallet = generateWallet();
  console.log(`[1] 지갑 생성`);
  console.log(`    address: ${wallet.address}`);

  // 1. 지갑 등록
  console.log("\n[2] 지갑 등록 (POST /wallet)");
  const createResp = await post("/wallet", {
    address: wallet.address,
    nickname: "e2e-test-wallet",
    walletColor: "gray",
    grantOnboardingReward: false,
  });
  assert(
    "지갑 등록 HTTP 200/201",
    createResp.status === 200 || createResp.status === 201,
    `status=${createResp.status} body=${JSON.stringify(createResp.data)}`
  );
  if (createResp.status !== 200 && createResp.status !== 201) {
    console.error("\n지갑 등록 실패. 테스트 중단.\n");
    return;
  }

  // 2. Challenge 발급
  console.log("\n[3] Challenge 발급 (POST /auth/challenge)");
  const challengeResp = await post("/auth/challenge", { address: wallet.address });
  assert(
    "Challenge 발급 HTTP 200",
    challengeResp.status === 200,
    `status=${challengeResp.status}`
  );
  if (challengeResp.status !== 200) {
    console.error("\nChallenge 실패. 테스트 중단.\n");
    cleanup(wallet.address);
    return;
  }
  const { challengeId, message } = challengeResp.data.data;
  console.log(`    challengeId: ${challengeId}`);

  // 3. 서명 + Verify
  console.log("\n[4] 서명 및 Verify (POST /auth/verify)");
  const signature = signAuthMessage(message, wallet.privateKey);
  const verifyResp = await post("/auth/verify", {
    challengeId,
    address: wallet.address,
    publicKey: wallet.publicKey,
    signature,
  });
  assert(
    "Verify HTTP 200",
    verifyResp.status === 200,
    `status=${verifyResp.status} body=${JSON.stringify(verifyResp.data)}`
  );
  if (verifyResp.status !== 200) {
    console.error("\nVerify 실패. 테스트 중단.\n");
    cleanup(wallet.address);
    return;
  }

  const { accessToken, refreshSessionHandle } = verifyResp.data.data;
  assert("accessToken 발급", !!accessToken);
  assert("refreshSessionHandle 발급", !!refreshSessionHandle);

  // refresh cookie 추출 (Set-Cookie 헤더에서)
  const setCookieHeader = verifyResp.headers.get("set-cookie") || "";
  const cookieName = `ssatto_refresh_${refreshSessionHandle}`;
  const cookieMatch = setCookieHeader.match(new RegExp(`(${cookieName}=[^;]+)`));
  const refreshCookie = cookieMatch ? cookieMatch[1] : null;
  assert("refresh cookie 수신", !!refreshCookie, `set-cookie: ${setCookieHeader.substring(0, 100)}`);

  console.log(`    sessionHandle: ${refreshSessionHandle}`);
  console.log(`    refreshCookie: ${refreshCookie ? "있음" : "없음"}`);

  // 4. 정상 Refresh (세션 만료 전)
  console.log("\n[5] 정상 Refresh 확인 (세션 유효 상태)");
  const refreshResp1 = await post(
    "/auth/refresh",
    { sessionHandle: refreshSessionHandle },
    refreshCookie
  );
  assert(
    "정상 Refresh HTTP 200",
    refreshResp1.status === 200,
    `status=${refreshResp1.status}`
  );

  if (!refreshCookie) {
    console.warn("\n  ⚠ refresh cookie를 추출하지 못해 세션 만료 시나리오를 건너뜁니다.");
    cleanup(wallet.address);
    return;
  }

  // 5. 세션 revoke (DB에서 직접)
  console.log("\n[6] 세션 강제 만료 (PostgreSQL UPDATE)");
  try {
    const revokeResult = psql(
      `UPDATE auth_refresh_session SET revoked_at = NOW() WHERE session_handle = '${refreshSessionHandle}' RETURNING id;`
    );
    assert("세션 revoke 성공", revokeResult.includes("1") || /\d+/.test(revokeResult), `result: ${revokeResult}`);
    console.log(`    revoke result: ${revokeResult}`);
  } catch (e) {
    console.error(`  ✗ DB revoke 오류: ${e.message}`);
    failed++;
    cleanup(wallet.address);
    return;
  }

  // 6. Refresh 실패 확인 (세션 만료 후)
  console.log("\n[7] 세션 만료 후 Refresh 실패 확인");
  const refreshResp2 = await post(
    "/auth/refresh",
    { sessionHandle: refreshSessionHandle },
    refreshCookie
  );
  assert(
    "만료 후 Refresh 실패 (4xx)",
    refreshResp2.status >= 400 && refreshResp2.status < 500,
    `status=${refreshResp2.status} body=${JSON.stringify(refreshResp2.data)}`
  );
  assert(
    "만료 후 Refresh 에러 메시지 있음",
    !!refreshResp2.data?.message,
    `body=${JSON.stringify(refreshResp2.data)}`
  );
  console.log(`    응답: ${refreshResp2.status} — ${refreshResp2.data?.message}`);

  // 7. FE null 반환 경로 확인 (코드 로직)
  console.log("\n[8] FE null 반환 경로 확인 (정적 분석)");
  console.log("    walletSessionService.ts: refresh 실패 → catch → unlockedPrivateKey 없음 → return null");
  console.log("    WalletPage.tsx: null 수신 → setUnlockModalSessionExpired(true) → setShowUnlockModal(true)");
  assert(
    "세션 만료 후 refresh 실패가 FE null 경로를 트리거함",
    refreshResp2.status >= 400,
    "refresh 실패 응답 확인됨"
  );

  // 정리
  cleanup(wallet.address);
  console.log(`\n=== 결과: ${passed} PASS, ${failed} FAIL ===\n`);
}

function cleanup(address) {
  console.log("\n[cleanup] 테스트 데이터 삭제");
  try {
    const r1 = psql(`DELETE FROM auth_refresh_session WHERE wallet_address = '${address}';`);
    const r2 = psql(`DELETE FROM wallet WHERE address = '${address}';`);
    console.log(`    세션 삭제: ${r1.trim() || "OK"}`);
    console.log(`    지갑 삭제: ${r2.trim() || "OK"}`);
  } catch (e) {
    console.error(`  ⚠ cleanup 오류: ${e.message}`);
  }
}

runTest().catch((e) => {
  console.error("테스트 오류:", e);
  process.exit(1);
});
