# ADR-05: 브라우저 지갑 인증 모델

| 항목 | 내용 |
|---|---|
| 상태 | 채택 |
| 날짜 | 2026-03-20 |
| 결정자 | FE / BE 팀 |

---

## 결정 내용

서비스는 아래 요소를 함께 갖는 레이어형 브라우저 지갑 인증 모델을 채택한다.

- 클라이언트 측 암호화 keystore 보관
- 서버 발급 nonce challenge
- 클라이언트 로컬 서명
- 짧은 수명의 access token
- 회전 가능한 refresh session
- subject 기반 보호 API 인가
- 환경별 cookie 및 CORS/origin 전달 정책

중요한 점은, 이 결정이 단일 인증 기법 하나를 채택한 것이 아니라는 점이다.  
각 요소는 서로 다른 종류의 리스크를 줄이기 위해 함께 채택되었다.

---

## 왜 이 ADR이 필요했는가

표면적인 질문은 단순했다.

- 브라우저 기반 JackpotChain 서비스에서 지갑 소유권을 어떻게 인증할 것인가?
- access token 만료 이후 세션은 어떤 구조로 유지할 것인가?

하지만 실제 설계 문제는 더 넓었다.

- key possession을 어떻게 증명할 것인가?
- 서버를 custodial wallet로 만들지 않으면서 어떻게 인증할 것인가?
- 브라우저에 있는 지갑 키를 어떤 경계로 보관할 것인가?
- 보호 API는 어떻게 JWT subject와 wallet target을 강하게 묶을 것인가?
- 브라우저의 cookie/origin 규칙까지 포함한 운영 환경에서 어떻게 안정적으로 동작시킬 것인가?

초기 설계는 주로 "로그인 proof" 자체에 집중했지만, 구현이 진행되면서 그것만으로는 충분하지 않다는 것이 드러났다.  
결국 올바른 결정은 로그인 방식 하나가 아니라, custody, session, authorization, browser delivery를 함께 포함하는 구조여야 했다.

---

## 배경

초기 인증 구조는 기능은 있었지만 아래와 같은 약점을 가지고 있었다.

- 주소를 알고 있다는 사실이 실제 소유권 증명처럼 취급될 수 있었다.
- 브라우저 persisted 상태와 민감한 wallet material이 충분히 분리되어 있지 않았다.
- access control이 항상 JWT subject와 요청 대상 지갑을 강하게 묶고 있지 않았다.
- 브라우저 세션 연속성은 access token과 refresh 책임이 분리되지 않은 상태였다.
- 운영 브라우저 동작은 cookie/origin의 암묵적 기본값에 의존할 위험이 있었다.

구현 계획 문서들은 이 문제가 단일 auth endpoint 설계 문제가 아니라는 점을 보여 주었다.

- FE/BE 전환 계획과 인증 진단 (be-fe_auth)
- 저장 보안 계획 (fe-storage-security)
- 세션/보호 API 계획 (auth-session-protection)
- cookie 하드닝 계획 (auth-cookie-hardening-2026-03-20)
- CORS/origin 하드닝 계획 (auth-cors-hardening-2026-03-20)

이 문서들에서 공통적으로 드러난 사실은 다음과 같다.

- 한 단계를 해결하면 다른 종류의 리스크가 다음 단계에서 드러난다.
- 따라서 최종 auth 모델은 "한 번에 선택한 방식"이 아니라 "점진적으로 보완한 방식"이어야 한다.

---

## 결정 기준

이번 결정은 아래 기준에 의해 좌우되었다.

1. 실제 wallet ownership proof가 가능한가
2. non-custodial key handling을 유지하는가
3. 보호 API 인가가 subject 기준으로 강하게 동작하는가
4. 브라우저 세션 restore를 보안 저하 없이 지원하는가
5. 운영 브라우저에서 cookie와 origin 전달이 안정적인가
6. JackpotChain의 wallet/signature/address 규칙과 일관성이 유지되는가

---

## 고려한 선택지

### 선택지 A. address 기반 토큰 발급

서버가 wallet address knowledge나 등록 여부를 기준으로 토큰을 발급하는 방식이다.

개념적으로는:

- wallet address가 username처럼 동작하고,
- 서버는 그 주소가 존재하는지만 보고,
- key possession proof 없이 토큰을 발급한다.

장점:

- 구현 난이도가 가장 낮다.
- 브라우저 흐름이 단순하다.

단점:

- 소유권을 증명하지 못한다.
- 공개 식별자를 인증 요소처럼 취급한다.
- 블록체인 지갑이 통상적으로 ownership을 증명하는 방식과 맞지 않는다.

이 선택지는 가장 중요한 기준인 "실제 소유권 증명"을 만족하지 못하므로 기각했다.

---

### 선택지 B. 서버 보관형 또는 key 업로드형 모델

서버가 private key를 저장하거나, 요청 시 받아서 검증/서명에 활용하는 방식이다.

개념적으로는:

- 브라우저가 wallet control의 일부를 backend에 넘기고,
- backend가 trusted custody point가 된다.

장점:

- 브라우저 구현은 단순해질 수 있다.
- 일부 서명 흐름을 서버에서 처리할 수 있다.

단점:

- non-custodial 목표를 직접 위반한다.
- 서버가 고가치 단일 공격 지점이 된다.
- 제품의 신뢰 모델이 "내 지갑을 내가 통제"에서 "서버를 신뢰"로 바뀐다.

이 선택지는 브라우저 복잡도를 줄이는 대신 훨씬 더 큰 custody 리스크를 도입하므로 기각했다.

---

### 선택지 C. challenge + signature + refresh session 모델

서버가 1회용 challenge를 발급하고, 브라우저가 로컬에서 서명한 뒤, 서버가 그 signature와 public key를 검증해 access/refresh를 발급하는 방식이다.

개념적으로는:

- 브라우저는 private key를 외부로 보내지 않고 possession을 증명하고,
- 서버는 공개 정보와 challenge 상태만으로 소유권을 검증하고,
- 세션은 access와 refresh로 분리되며,
- 보호 API는 로그인 여부만이 아니라 wallet subject consistency까지 본다.

이 선택지는 채택되었다.  
다만 구현을 통해 이 모델이 실제로는 아래 레이어까지 포함해야 안전하다는 점이 드러났다.

- secure local custody
- secure session storage
- secure cookie delivery
- secure origin policy

즉, 최종적으로 채택된 것은 단순한 challenge login이 아니라 layered browser-wallet auth architecture다.

---

## 최종 채택 모델

현재 채택된 모델은 아래 다섯 경계를 함께 갖는다.

### 1. 클라이언트 측 custody 경계

private key는 계속 클라이언트에만 남는다.

관련 역할:

- encrypted keystore 저장 (keystorerepository)
- 브라우저 암복호화 primitive 제공 (encryption)
- unlock 및 메모리 key lifecycle 관리 (walletsecurityservice, usewalletsessionstore)

이 경계는 로그인 proof가 non-custodial 조건을 유지할 수 있도록 만든다.

### 2. challenge 기반 소유권 증명 경계

서버는 TTL이 있는 1회용 challenge를 발급한다.  
브라우저는 로컬에서 이를 서명한다.  
서버는 아래를 함께 검증한다.

- challenge 유효성
- signature 유효성
- public key에서의 address 재유도
- wallet address 일치 여부

관련 역할:

- challenge 발급/검증 orchestration (authservice)
- challenge 저장 및 replay 방지 (authchallengerepository)
- signature/address parity 검증 (walletauthcrypto)

이 경계는 "주소를 안다"가 아니라 "키를 실제로 가진다"를 증명하게 만든다.

### 3. 분리된 세션 경계

세션은 아래처럼 분리된다.

- 짧은 수명의 access token
- 더 긴 수명의 refresh session
- 서버 측 refresh hash 저장
- refresh rotation

관련 역할:

- token 생성 및 refresh hash 처리 (jwtutil)
- refresh session 저장과 rotation (authrefreshsessionrepository, authservice)
- 브라우저 restore 순서 관리 (walletsessionservice)

이 경계는 access token을 길게 유지하지 않아도 세션 연속성을 제공하게 한다.

### 4. subject 기반 인가 경계

보호 API는 "로그인되어 있다"만으로 허용되지 않는다.  
항상 "인증된 subject와 요청 wallet target이 동일한가"를 검증해야 한다.

관련 역할:

- JWT를 principal로 변환 (jwtauthenticationfilter)
- 보호 route 정책 선언 (securityconfig)
- wallet target consistency 검증 (walletservice, lottoservice, exchangeservice)

이 경계는 유효한 토큰을 들고 다른 wallet을 조회/조작하려는 시도를 차단한다.

### 5. 브라우저 전달 경계

브라우저 auth traffic이 실제 운영 환경에서 전달될 수 있어야 한다.

관련 역할:

- 환경별 refresh cookie 정책 (authrefreshcookieproperties)
- credentialed CORS allowlist (authcorsproperties)
- auth 응답 cookie 작성 (authcontroller)
- preflight 허용/차단 검증 (protectedapisecuritytest)

이 경계는 "인증 로직은 맞는데 브라우저가 cookie나 origin 규칙 때문에 실패하는 문제"를 줄인다.

---

## 왜 이 모델을 선택했는가

### 이유 1. 소유권을 증명하면서도 non-custodial 모델을 유지할 수 있다

브라우저는 로컬에서 서명하고 서버는 공개적으로 검증 가능한 정보만 본다.  
이 trust split이 wallet 제품의 기본 원칙에 가장 잘 맞는다.

### 이유 2. 서로 다른 위험을 분리해서 다룰 수 있다

이 모델은 auth를 단순히 login endpoint의 문제로 보지 않는다.  
아래를 서로 다른 경계로 다룬다.

- custody
- proof
- session
- authorization
- browser delivery

이 분리가 있었기 때문에 설계가 단계별로 강해질 수 있었다.

### 이유 3. JackpotChain wallet 규칙과의 일관성을 유지할 수 있다

브라우저 wallet, backend verifier, blockchain wallet 규칙은 아래에서 서로 맞아야 한다.

- public key derivation
- address derivation
- signature validity

이 모델은 그 parity를 유지하기 쉽다.

### 이유 4. 세션 UX와 access control을 동시에 만족시킬 수 있다

refresh session 덕분에 reload/reopen 이후에도 UX를 유지할 수 있지만,  
보호 API는 여전히 짧은 access token과 wallet-subject 검증에 의존한다.

즉, UX를 위해 access token 수명을 무리하게 늘릴 필요가 없다.

### 이유 5. 실제 운영 브라우저 조건까지 포함한 설계다

최종 모델은 cookie와 origin 전달 정책까지 포함한다.  
이 부분이 없으면 서버 로직이 맞더라도 운영 브라우저에서 인증이 실패할 수 있다.

---

## 감수한 트레이드오프

### 트레이드오프 1. 브라우저 구현 복잡도가 증가했다

브라우저는 이제 아래 역할을 더 많이 가진다.

- keystore 암호화
- unlock 흐름
- 로컬 서명
- 단계별 session restore

이 비용은 non-custodial 모델을 유지하기 위한 대가로 받아들였다.

### 트레이드오프 2. backend auth 상태가 더 구조화되었다

backend는 이제 아래 상태를 가진다.

- challenge state
- refresh-session state
- JWT validation
- explicit cookie policy
- explicit origin policy

단순한 stateless token issuance보다 복잡하지만, custodial 대안보다 훨씬 안전하다.

### 트레이드오프 3. 배포 시 환경설정 책임이 더 중요해졌다

운영 auth의 정확성은 아래에 의존한다.

- HTTPS
- 정확한 origin allowlist
- 정확한 reverse-proxy 모드

이것은 운영 비용이지만, 암묵적인 실패를 감추는 것보다 명시적인 비용이 더 낫다고 판단했다.

---

## 구현 과정에서 제거된 리스크

이 ADR에서 중요한 것은 최종 선택지 자체뿐 아니라, 구현 과정에서 어떤 리스크를 단계별로 닫았는지다.

### 리스크 1: 약한 로컬 custody

문제:

- 브라우저 persisted state가 민감한 wallet material과 너무 가까웠다.

보완:

- encrypted keystore
- unlock-gated signing
- metadata/session 분리

관련 역할:

- metadata persistence 경계 (usewalletstore)
- encrypted keystore storage (keystorerepository)
- unlock lifecycle 관리 (walletsecurityservice)

### 리스크 2: 약한 로그인 proof

문제:

- address knowledge가 실질적 인증처럼 취급될 수 있었다.

보완:

- challenge
- signature verification
- address re-derivation

관련 역할:

- challenge orchestration (authservice)
- signature/address parity 검증 (walletauthcrypto)

### 리스크 3: 약한 세션 모델

문제:

- access-only 인증으로는 UX와 보안을 동시에 만족시키기 어려웠다.

보완:

- 짧은 access token
- 회전 가능한 refresh session

관련 역할:

- token/hash 처리 (jwtutil)
- refresh-session persistence (authrefreshsessionrepository)
- 브라우저 restore 순서 제어 (walletsessionservice)

### 리스크 4: 약한 보호 자원 바인딩

문제:

- 인증 여부만으로는 올바른 wallet ownership이 보장되지 않았다.

보완:

- subject 기반 인가

관련 역할:

- principal 추출 (jwtauthenticationfilter)
- subject와 wallet target consistency 검증 (walletservice, lottoservice, exchangeservice)

### 리스크 5: 약한 브라우저 전달 semantics

문제:

- auth logic이 맞아도 cookie/origin 규칙 때문에 실제 브라우저에서 실패할 수 있었다.

보완:

- explicit cookie policy
- explicit credentialed CORS allowlist

관련 역할:

- cookie policy binding (authrefreshcookieproperties)
- origin allowlist binding (authcorsproperties)
- auth response emission (authcontroller)
- preflight 검증 (protectedapisecuritytest)

이 단계적 보완 과정을 보면, 현재 결정은 challenge login 하나의 선택이 아니라 "브라우저 지갑 인증을 안전하게 만들기 위한 레이어형 설계 선택"이라는 점이 분명해진다.

---

## 결정의 결과

### 긍정적 결과

- wallet ownership proof가 암호학적이고 non-custodial하게 동작한다.
- 보호 API는 authenticated wallet subject에 묶여 있다.
- reload/reopen 후 세션 복구가 long-lived access token 없이 가능하다.
- cookie/origin 전달 정책이 명시적이고 테스트 가능하다.
- auth 모델이 제품의 지갑 신뢰 경계와 훨씬 잘 맞는다.

### 부정적 결과

- frontend 구현 복잡도가 올라갔다.
- backend auth state 관리가 더 풍부해졌다.
- 배포 환경설정이 더 민감해졌다.
- 브라우저 unlock 이후 key를 다루는 구조상 CSP 등 runtime hardening은 계속 중요하다.

---

## 운영 관점 해석

가장 권장되는 배포 방식은 아래와 같다.

- frontend와 backend가 same-origin을 공유한다.
- reverse proxy가 `/api`를 backend로 전달한다.
- refresh cookie는 auth path에 scoped된다.
- 일반 경로에서는 CORS 의존도가 매우 낮아진다.

cross-origin 배포도 가능하지만, 더 엄격한 운영 모드로 취급해야 한다.

필수 조건:

- HTTPS
- 정확한 frontend origin allowlist
- 정확한 cookie 정책
- 정확한 credentialed CORS 동작

---

## 재검토 조건

아래 조건 중 하나가 생기면 이 결정을 재검토한다.

- 외부 wallet extension 또는 외부 signer를 도입하는 경우
- 서비스가 custodial wallet 방향으로 바뀌는 경우
- multi-device 또는 multi-wallet 동시 세션 요구가 크게 증가하는 경우
- WebAuthn 또는 hardware-backed key release를 도입하는 경우
- 기본 배포 모드가 same-origin 선호에서 cross-origin 기본으로 바뀌는 경우

---

## 짧은 결론

1. wallet auth는 address knowledge가 아니라 key possession을 증명해야 한다.
2. 그 증명은 custody, session, authorization, cookie, origin 정책까지 함께 설계될 때만 운영 안전성을 가진다.
3. 따라서 최종 채택안은 단일 nonce-signature 로그인 방식이 아니라, 레이어형 browser-wallet auth architecture다.
