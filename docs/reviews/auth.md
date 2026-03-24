# 인증 설계 리뷰

## 문서 목적

이 문서는 현재 인증 구조가 "무엇으로 구성되어 있는가"만 설명하는 문서가 아니다.  
실제 구현 과정에서 인증 설계가 어떤 단계로 발전했고, 각 단계에서 어떤 리스크가 드러났으며, 다음 단계에서 그 리스크를 어떻게 줄여 왔는지를 설명하는 문서다.

이번 인증 설계는 한 번에 완성된 것이 아니라, 아래와 같은 반복을 통해 정리되었다.

1. 먼저 동작하는 최소 흐름을 만든다.
2. 그 흐름을 실제 보안/운영 관점에서 검토한다.
3. 새로 드러난 리스크를 명시한다.
4. 다음 단계에서 그 리스크를 줄이는 설계를 추가한다.
5. 새 설계가 기존 지갑 보관 원칙과 보호 API 규칙을 깨지 않는지 검증한다.

즉, 현재 구조는 단일 기능의 결과가 아니라 여러 번의 리스크 제거 과정을 거쳐 형성된 레이어형 설계다.

---

## 최종 설계 목표

최종 인증 구조는 아래 요구를 동시에 만족해야 했다.

- 지갑 인증은 주소 knowledge가 아니라 실제 key possession을 증명해야 한다.
- private key는 계속 클라이언트에만 남아 있어야 한다.
- raw refresh token은 서버에 저장되면 안 된다.
- Controller는 계속 request/response 경계만 담당해야 한다.
- 보호 API는 항상 `JWT subject == 요청 wallet address`를 강제해야 한다.
- 로컬 개발 환경과 운영 브라우저 환경을 모두 지원해야 한다.
- 새로고침, 재실행, 지갑 전환에서도 세션 UX가 크게 무너지면 안 된다.

---

## 현재 인증 구조 요약

현재 인증 구조는 아래 4단계가 순차적으로 쌓여 형성되었다.

1. 저장 보안
2. 세션 및 보호 API 완성
3. 운영용 쿠키 하드닝
4. 운영용 CORS/origin 하드닝

중요한 점은, 뒤 단계가 앞 단계를 대체한 것이 아니라는 점이다.  
각 단계는 이전 단계에서 남아 있던 다른 종류의 리스크를 줄이는 역할을 한다.

---

## 0단계: 하드닝 이전 상태

하드닝 이전에도 "지갑을 만들고", "백엔드에서 토큰을 받고", "일부 API를 호출하는" 기능 흐름 자체는 존재했다.  
하지만 그 구조는 생산용 보안 모델이라고 보기 어려웠다.

당시 핵심 문제는 아래와 같았다.

- 브라우저 persisted 상태와 민감한 지갑 재료가 너무 가깝게 붙어 있었다.
- 주소를 알고 있다는 사실이 사실상 인증처럼 취급될 수 있었다.
- 보호 API가 JWT subject와 요청 대상 지갑을 항상 강하게 묶고 있지 않았다.
- access/refresh의 역할 분리가 없어 UX와 보안 정책을 동시에 가져가기 어려웠다.

이 시점의 가장 큰 리스크는 명확했다.

- 시스템은 "이 사용자가 어떤 주소를 안다"는 사실은 확인할 수 있었지만,
- "이 사용자가 그 주소의 private key를 실제로 통제한다"는 사실은 확인하지 못했다.

이 리스크 때문에 인증 설계는 반드시 address 중심 모델에서 possession proof 중심 모델로 이동해야 했다.

---

## 1단계: 저장 보안

### 이 단계가 도입한 것

이 단계는 지갑 메타데이터와 실제 서명 재료를 분리해, 브라우저 내부의 custody boundary를 먼저 세웠다.

주요 역할:

- 지갑 메타데이터 영속화와 마이그레이션 관리 (usewalletstore)
- 메모리 기반 복호화 키와 토큰 lifecycle 관리 (usewalletsessionstore)
- IndexedDB 기반 암호화 keystore 저장 (keystorerepository)
- unlock/lock 및 마이그레이션 orchestration (walletsecurityservice)
- 브라우저 암복호화 primitive 제공 (encryption)
- unlock 이후에만 서명이 가능하도록 보장하는 인증 흐름 연결 (walletauthflowservice)

### 왜 이 단계가 먼저였는가

challenge-response 인증은 private key 보관 모델이 이미 어느 정도 안전할 때만 의미가 있다.

만약 브라우저가 challenge에 서명할 수는 있지만 동시에 private key를 plain persisted 상태로 오래 남겨두고 있다면, 인증은 강해졌지만 지갑 보관은 여전히 약한 상태가 된다.  
그 순서는 잘못된 순서다.

### 이 단계에서 드러난 리스크

초기 브라우저 지갑 모델은 편의성과 custody가 너무 느슨하게 섞여 있었다.

- persisted state 노출 시 피해 범위가 너무 컸고,
- session 상태와 wallet 상태가 분리되지 않았고,
- "지갑이 저장되어 있음"과 "지갑이 unlock되어 있음"이 명확히 구분되지 않았다.

이 구조는 두 가지 문제를 만들었다.

1. 브라우저 영속 저장소 유출 시 피해가 과도하게 커질 수 있다.
2. 이후 auth/session 설계를 이 위에 쌓으면 약한 보관 경계를 전제로 설계가 진행된다.

### 어떻게 리스크를 줄였는가

이 단계는 저장 구조를 명확히 분리했다.

- keystore는 암호화된 형태로만 영속 저장,
- 복호화된 key는 메모리 전용,
- wallet metadata는 별도 persisted 상태,
- signing은 unlock 이후에만 허용.

이 단계는 인증 자체를 완성하지는 않았다.  
대신 "브라우저가 어떤 보관 경계 위에서 인증을 수행하는가"를 먼저 안정화했다.

### 이 단계 이후에도 남아 있던 리스크

저장 구조가 안전해졌더라도 여전히 아래 문제가 남아 있었다.

- 서버 인증 계약이 여전히 약할 수 있다.
- 앱 재실행 후 세션 복구가 충분하지 않다.
- 보호 API 인가가 wallet subject 기준으로 완성되지 않았다.

그래서 다음 단계가 필요했다.

---

## 2단계: 세션 및 보호 API 완성

### 이 단계가 도입한 것

이 단계는 인증을 address lookup 흐름에서 실제 wallet ownership proof 흐름으로 바꾸고, 그 위에 세션 및 보호 API 모델을 완성했다.

주요 역할:

- challenge 발급과 검증 orchestration (authservice)
- 1회용 challenge 저장과 TTL/replay 방지 (authchallengerepository)
- 서명 검증과 address derivation parity 보장 (walletauthcrypto)
- refresh session 저장과 rotation 관리 (authrefreshsessionrepository)
- access token 생성과 refresh token hash 처리 (jwtutil)
- JWT를 인증 principal로 변환 (jwtauthenticationfilter)
- 인증 실패 응답 경계 제공 (jwtauthenticationentrypoint)
- 보호 endpoint 정책 선언 (securityconfig)
- 브라우저에서 wallet 단위 restore 순서 관리 (walletsessionservice)
- unlock된 wallet로 challenge login을 수행하는 흐름 조합 (walletauthflowservice)

### 설계적으로 바뀐 핵심

이 단계에서 로그인 증명 방식은 아래처럼 바뀌었다.

- 이전:
  - "이 호출자가 어떤 wallet address를 안다"
- 이후:
  - "이 호출자가 서버가 발급한 challenge에 대해 유효한 signature를 만들 수 있고, 제출한 public key가 요청한 wallet address로 재유도된다"

이 전환이 인증 설계에서 가장 중요한 개념적 변화였다.

### 이 단계에서 드러난 리스크

저장 보안이 정리되고 나니, 그 다음 약점은 더 명확해졌다.

- address knowledge가 여전히 identity처럼 취급될 수 있고,
- 보호 자원이 JWT subject 기준으로 강하게 제어되지 않고,
- reload/reopen마다 다시 unlock/login을 요구하면 UX가 나빠진다.

즉, 이 시점의 리스크는 보안과 UX가 동시에 얽혀 있었다.

- 등록된 address를 아는 것만으로 인증을 시도할 수 있다.
- 유효한 토큰을 다른 wallet target에 재사용할 가능성이 있다.
- access token 하나에 모든 세션 부담을 실으면 만료 정책을 짧게 가져가기 어렵다.
- 앱 재실행 후 지갑별 세션 복구 흐름이 불안정하다.

### 어떻게 리스크를 줄였는가

이 단계는 세 개의 핵심 제어 계층을 추가했다.

#### 1. 소유권 증명 계층

서버는 더 이상 address knowledge만 믿지 않는다.  
반드시 아래를 확인한다.

- challenge 유효성,
- signature 유효성,
- public key에서 재유도한 address와 요청 address의 일치,
- challenge 재사용 여부.

이로써 인증은 공개 식별자 확인이 아니라 key possession proof가 되었다.

#### 2. 세션 분리 계층

세션은 아래처럼 분리되었다.

- 짧은 수명의 access token,
- 더 긴 수명의 refresh session.

이 분리는 access token을 길게 잡지 않아도 UX를 유지할 수 있게 해 주었다.

#### 3. subject 기반 인가 계층

보호 API는 단순히 "로그인되어 있는가"만 보지 않는다.  
항상 "인증된 wallet subject가 요청한 wallet target과 같은가"를 본다.

이로써 "유효한 토큰이지만 다른 지갑을 조회/조작하는" 문제를 차단했다.

### 왜 이 단계만으로는 충분하지 않았는가

refresh session이 도입되면서 새로운 운영 리스크가 드러났다.

- 브라우저 cookie 동작이 실제 보안 계약의 일부가 되었고,
- local과 production의 cookie 정책 차이가 중요해졌고,
- controller 테스트가 fallback 분기를 타면 실제 보호 경로를 검증하지 못할 수 있었다.

이 문제를 줄이기 위해 3단계가 필요했다.

---

## 3단계: 운영용 쿠키 하드닝

### 이 단계가 도입한 것

이 단계는 refresh cookie의 브라우저 계약을 명시적으로 만들고, 테스트도 실제 인증 principal 경로를 타도록 정리했다.

주요 역할:

- refresh cookie 정책 바인딩과 검증 (authrefreshcookieproperties)
- verify/refresh/logout 응답에서 refresh cookie 계약을 실제로 작성 (authcontroller)
- 보호 컨트롤러의 인증 principal wiring 정리 (walletcontroller, lottocontroller, exchangecontroller)
- cookie 계약 및 인증 controller 경로 검증 (authcontrollertest, walletcontrollertest, lottocontrollertest, exchangecontrollertest)

### 이 단계에서 드러난 리스크

refresh session을 도입하고 나니 브라우저 cookie의 배포 환경 차이가 직접적인 보안 리스크가 되었다.

- 로컬에서는 HTTP 때문에 느슨한 정책이 필요하고,
- 운영에서는 cross-site cookie 규칙을 만족하는 엄격한 속성이 필요하고,
- 서블릿 기본 동작에 의존하면 실제 브라우저에서 어떤 계약이 내려가는지 불명확하다.

또 다른 리스크는 테스트 신뢰성에 있었다.

- 보호 컨트롤러에 null-auth fallback이 남아 있으면,
- 테스트가 실제 인증 경로가 아니라 편의 분기를 검증하게 된다.

### 어떻게 리스크를 줄였는가

이 단계는 refresh cookie를 명시적 보안 계약으로 승격시켰다.

- local:
  - `Secure=false`
  - `SameSite=Lax`
- production:
  - `Secure=true`
  - `SameSite=None`
- 잘못된 `SameSite=None` + insecure 조합:
  - 서버 기동 단계에서 차단

이 덕분에 브라우저 동작이 배포 의도와 일치하게 되었다.

동시에 보호 컨트롤러에서 null-auth fallback을 제거해 테스트와 런타임 현실을 맞췄다.

- 보호 요청은 보호 요청이어야 하고,
- principal이 있어야 하며,
- ownership 검증은 서비스 계층이 계속 담당한다.

### 이 단계 이후에도 남아 있던 리스크

쿠키 속성이 맞더라도 cross-origin 브라우저 요청은 여전히 origin 정책 때문에 실패할 수 있다.

즉, cookie가 맞아도 브라우저가 요청 자체를 막을 수 있었다.  
그 문제를 줄이기 위해 4단계가 필요했다.

---

## 4단계: 운영용 CORS/origin 하드닝

### 이 단계가 도입한 것

이 단계는 credentialed auth traffic이 실제 운영 브라우저에서 전달될 수 있도록 origin 정책을 명시적으로 만들었다.

주요 역할:

- credentialed CORS 정책 바인딩 (authcorsproperties)
- auth/protected API용 security-chain CORS 설정 (securityconfig)
- preflight allow/block 검증 (protectedapisecuritytest)

### 이 단계에서 드러난 리스크

쿠키가 올바르게 내려가더라도 브라우저는 여전히 아래 이유로 요청을 차단할 수 있다.

- `Access-Control-Allow-Origin`이 없으면 refresh 요청이 실패한다.
- `Access-Control-Allow-Credentials`가 없으면 브라우저가 cookie를 보내지 않는다.
- wildcard origin과 credentials 조합은 안전하지도 않고 브라우저 규칙에도 맞지 않는다.

즉, 이 단계의 리스크는 "인증 로직은 맞는데 브라우저 전달 계층이 실패하는 문제"였다.

### 어떻게 리스크를 줄였는가

이 단계는 origin 정책을 명시적 모델로 만들었다.

- 허용된 origin에 대해서만 credentialed CORS 허용,
- production allowlist는 환경변수 외부화,
- wildcard origin은 명시적으로 거부,
- same-origin reverse proxy 배포는 계속 최우선 경로로 유지.

이 단계는 인증 로직 자체를 바꾼 것이 아니다.  
이미 맞게 구성된 auth logic이 실제 브라우저와 배포 환경에서 깨지지 않도록 전달 계층을 하드닝한 것이다.

---

## 리스크가 단계별로 어떻게 제거되었는가

이 인증 설계를 이해할 때 가장 중요한 부분은, 각 단계가 서로 다른 리스크를 줄였다는 점이다.

### 반복 1

문제:

- 브라우저 local custody 경계가 약했다.

보완:

- encrypted keystore
- metadata/session 분리
- unlock-gated signing

### 반복 2

문제:

- 서버가 address knowledge를 지나치게 신뢰했다.

보완:

- challenge-response
- signature verification
- refresh session
- JWT subject 기반 보호 API

### 반복 3

문제:

- refresh session의 정확성이 브라우저 cookie semantics에 의존했고,
- controller 테스트가 실제 인증 경로 대신 fallback을 검증할 수 있었다.

보완:

- 환경별 cookie 정책 명시
- authenticated controller path 정리
- cookie contract 테스트 강화

### 반복 4

문제:

- production 브라우저 전달은 origin 정책이 암묵적이면 여전히 실패할 수 있었다.

보완:

- credentialed CORS allowlist
- preflight 검증
- 배포 모드 문서화

즉, 현재 구조는 아래 순서로 점진적으로 안정화되었다.

- 먼저 local custody를 정리하고,
- 그 다음 ownership proof를 만들고,
- 그 다음 browser cookie correctness를 맞추고,
- 마지막으로 cross-origin delivery correctness를 맞췄다.

---

## 현재 인증 구조의 개념 모델

현재 인증 구조는 아래 다섯 경계가 함께 맞물려 동작하는 형태다.

### 1. 보관 경계

private key는 클라이언트에만 남고, 브라우저에서는 암호화된 keystore로 저장되며, 복호화된 key는 메모리에만 잠시 존재한다.

관련 역할:

- encrypted keystore persistence (keystorerepository)
- unlock 및 메모리 lifecycle 관리 (walletsecurityservice, usewalletsessionstore)

### 2. 소유권 증명 경계

서버는 wallet address knowledge를 신뢰하지 않는다.  
오직 server-issued challenge에 대한 유효한 signature와, 그 public key에서 재유도된 address만 신뢰한다.

관련 역할:

- challenge 발급 및 검증 orchestration (authservice)
- challenge 저장 및 replay 방지 (authchallengerepository)
- signature/address parity 검증 (walletauthcrypto)

### 3. 세션 경계

세션은 짧은 access token과 더 긴 refresh session으로 분리된다.  
refresh token raw value는 저장하지 않고 hash만 저장하며 refresh 시 rotation된다.

관련 역할:

- token 생성 및 hash 처리 (jwtutil)
- refresh session 저장/회전 (authrefreshsessionrepository, authservice)
- 브라우저 restore 순서 관리 (walletsessionservice)

### 4. 인가 경계

인증만으로는 충분하지 않다.  
보호 API는 항상 인증된 subject와 요청 wallet address가 같은지 검증해야 한다.

관련 역할:

- JWT principal 추출 (jwtauthenticationfilter)
- 보호 route 정책 선언 (securityconfig)
- subject와 요청 대상의 일치 검증 (walletservice, lottoservice, exchangeservice)

### 5. 전달 경계

브라우저가 credentialed auth traffic을 실제로 주고받을 수 있어야 한다.

관련 역할:

- refresh cookie 정책 (authrefreshcookieproperties)
- credentialed CORS allowlist (authcorsproperties)
- auth 응답의 cookie 작성 (authcontroller)

---

## 권장 배포 해석

현재 구조에서 가장 권장되는 운영 방식은 아래와 같다.

- frontend와 backend가 하나의 public origin을 공유한다.
- frontend는 `/api`를 호출한다.
- reverse proxy가 `/api`를 backend로 전달한다.
- 이 경우 브라우저 입장에서는 same-origin이므로 CORS 의존도가 매우 낮다.

이 방식이 더 좋은 이유는 단순하기 때문만이 아니다.  
브라우저 보안 규칙이 동시에 맞아야 하는 조건이 줄어들기 때문에 운영 리스크도 줄어든다.

cross-origin 배포도 가능하지만, 아래 조건을 모두 맞춰야 한다.

- HTTPS
- 정확한 frontend origin allowlist
- 정확한 refresh cookie 정책
- 정확한 credentialed CORS 정책

---

## 현재 남아 있는 운영 리스크

핵심 인증 설계는 구현되었지만, 운영 단계에서 여전히 관리해야 하는 리스크는 있다.

- 배포 환경에서 origin allowlist를 잘못 넣을 수 있다.
- reverse proxy 전제와 실제 인프라 구성이 어긋날 수 있다.
- 앞으로 multi-device 또는 multi-wallet 동시 세션 요구가 커지면 세션 모델을 더 세분화해야 할 수 있다.
- 브라우저에서 unlock 이후 key를 다루는 구조인 만큼 CSP 등 frontend runtime hardening은 계속 중요하다.

이것들은 core auth 설계가 틀렸다는 의미는 아니다.  
현재 단계 이후의 운영/런타임 하드닝 과제라고 보는 것이 맞다.

---

## 최종 정리

이번 인증 설계의 핵심은 "로그인 API를 바꿨다"가 아니다.

실제로는 아래 네 번의 하드닝이 순차적으로 이루어졌다.

- 지갑 보관 경계 강화
- 암호학적 소유권 증명 도입
- 세션/쿠키의 브라우저 계약 명시화
- origin 정책의 운영 명시화

현재 설계의 가치도 각 요소가 따로 존재한다는 점이 아니라,  
각 요소가 이전 단계에서 드러난 구체적인 리스크를 닫고, 전체적으로 non-custodial, subject-bound, browser-safe 인증 모델을 만들었다는 데 있다.
