# 싸또 AI 챗봇 인수인계서

## 1. 개요
JackpotChain 교육 플랫폼에 내장된 블록체인 학습 도우미 챗봇 "싸또"입니다.
OpenAI GPT-4.1-mini 모델을 GMS 프록시를 통해 호출하며, SSE 스트리밍으로 실시간 응답합니다.

---

## 2. 파일 구성 (복사 대상)

| # | 파일 경로 | 역할 |
|---|-----------|------|
| 1 | `src/components/ChatBot.vue` | 챗봇 UI 컴포넌트 (말풍선, 입력창, 플로팅 버튼) |
| 2 | `src/composables/useChatBot.js` | 챗봇 로직 (API 호출, SSE 스트리밍 파싱, 대화 히스토리 관리) |
| 3 | `public/chatbot.mp4` | 챗봇 버튼에 표시되는 동영상 (없으면 버튼이 비어 보임) |

### 부모 컴포넌트에서의 사용법
```vue
<!-- App.vue 또는 원하는 레이아웃 컴포넌트 -->
<template>
  <div>
    <RouterView />
    <ChatBot />  <!-- 이 한 줄로 전역 챗봇 활성화 -->
  </div>
</template>

<script setup>
import ChatBot from './components/ChatBot.vue'
</script>
```

---

## 3. 외부 의존성

### 3-1. npm 패키지
- **vue** (^3.5.25) — 필수, `ref`, `watch`, `nextTick` 사용
- 그 외 추가 패키지 없음 (순수 Vue 3 + fetch API)

### 3-2. GMS API 프록시 (CORS 우회 필수)
챗봇은 SSAFY GMS 서버를 경유해서 OpenAI API를 호출합니다.
**Vite 프록시 설정이 반드시 필요합니다.**

```js
// vite.config.js 에 추가
server: {
  proxy: {
    '/gms-proxy': {
      target: 'https://gms.ssafy.io',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/gms-proxy/, '/gmsapi'),
    },
  },
}
```

> 프로덕션 배포 시에는 Nginx 등에서 동일한 프록시 룰을 설정해야 합니다.

### 3-3. API 키 / 모델
```
엔드포인트: /gms-proxy/api.openai.com/v1/chat/completions
API 키:     S14P22E202-4ba1e4df-6ad5-4888-a92f-29c1fbb3f638
모델:       gpt-4.1-mini
```
> 키는 `useChatBot.js` 상단에 하드코딩되어 있음. 필요시 환경변수로 분리 권장.

---

## 4. 아키텍처

```
사용자 입력
    │
    ▼
ChatBot.vue (UI)
    │  handleSend()
    ▼
useChatBot.js (로직)
    │  fetch() + SSE stream
    ▼
Vite Proxy (/gms-proxy)
    │
    ▼
GMS 서버 (gms.ssafy.io)
    │
    ▼
OpenAI API (gpt-4.1-mini)
    │  스트리밍 응답
    ▼
useChatBot.js — buffer 기반 SSE 파싱 → 글자 단위 누적
    │
    ▼
ChatBot.vue — Vue reactivity로 말풍선 실시간 갱신
```

---

## 5. 시스템 프롬프트 (커스터마이징 포인트)

`useChatBot.js`의 `SYSTEM_PROMPT` 상수에 정의되어 있습니다.
메인 프로젝트에 맞게 **이 부분을 수정**하면 챗봇의 성격/지식이 바뀝니다.

현재 설정:
- 역할: JackpotChain 블록체인 학습 도우미
- 답변 원칙: 초보자 대상, 3~5문장, 한국어, 전문용어 영문 병기
- 도메인 지식: JACK/POT 토큰, PoW, Commit-Reveal, UTXO 등

---

## 6. 주요 기능 상세

| 기능 | 설명 |
|------|------|
| SSE 스트리밍 | 응답을 기다리지 않고 생성되는 즉시 글자 단위로 표시 |
| buffer 기반 파싱 | 네트워크 청크 경계에서 잘린 데이터를 이어붙여 글자 누락 방지 |
| 대화 히스토리 | 이전 대화 맥락을 API에 전달하여 연속 질문 지원 |
| 타이핑 인디케이터 | 응답 대기 중 ●●● 애니메이션 표시 |
| 자동 스크롤 | 새 메시지 추가 시 스크롤 자동 최하단 이동 |
| 플로팅 버튼 | 우측 하단 고정, 동영상 썸네일 + 펄스 애니메이션 |
| 열기/닫기 트랜지션 | slide-up 애니메이션으로 부드러운 UX |

---

## 7. 알려진 이슈 및 수정 이력

| 이슈 | 원인 | 수정 내용 |
|------|------|-----------|
| 응답에 글자 누락 (오타처럼 보임) | SSE 청크가 줄 중간에서 잘렸을 때 `JSON.parse` 실패 → 해당 텍스트 통째로 버림 | `buffer` 변수 도입, 불완전한 줄을 다음 청크와 이어붙여 파싱하도록 수정 완료 |

---

## 8. 메인 프로젝트 통합 체크리스트

- [ ] `src/components/ChatBot.vue` 복사
- [ ] `src/composables/useChatBot.js` 복사
- [ ] `public/chatbot.mp4` 복사 (또는 버튼 디자인 변경)
- [ ] `vite.config.js`에 GMS 프록시 설정 추가
- [ ] 루트 레이아웃 컴포넌트에 `<ChatBot />` 삽입
- [ ] `SYSTEM_PROMPT`를 메인 프로젝트 도메인에 맞게 수정
- [ ] (권장) API 키를 환경변수(`.env`)로 분리
- [ ] (권장) 프로덕션 Nginx 프록시 룰 설정
