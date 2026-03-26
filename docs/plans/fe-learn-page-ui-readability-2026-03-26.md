# 학습 페이지 UI 가독성 개선 계획

**작성일**: 2026-03-26
**대상**: `FE-ssatto/src` 학습 관련 페이지 및 컴포넌트
**목표**: 텍스트 크기 확대 + 컴포넌트 배경색/테두리 대비 강화

---

## 문제 요약

1. **텍스트 가독성 부족**: `text-[11px]`, `text-xs`, `text-sm` + 낮은 불투명도(`text-white/40`, `text-white/30`)로 가독성 저하
2. **컴포넌트 배경-테두리 대비 부족**: 배경 불투명도가 너무 낮아(`bg-white/[0.03]`, `bg-blue-500/[0.08]`) stroke 색상만 보이고 카드 영역이 구분되지 않음

---

## 수정 대상 파일 목록

### 1. `src/components/learning/ui/GlassCard.tsx`

**문제**: 기본 카드 배경이 거의 투명에 가까움

| elevation | 현재 배경 | 수정 후 배경 | 현재 테두리 | 수정 후 테두리 |
|-----------|-----------|-------------|-------------|---------------|
| 1 | `bg-white/[0.03]` | `bg-white/[0.06]` | `border-white/[0.06]` | `border-white/[0.12]` |
| 2 (기본) | `bg-white/[0.05]` | `bg-white/[0.08]` | `border-white/[0.10]` | `border-white/[0.18]` |
| 3 | `bg-white/[0.08]` | `bg-white/[0.12]` | `border-white/[0.15]` | `border-white/[0.25]` |

---

### 2. `src/components/learning/ui/GlassButton.tsx`

**문제**: secondary 버튼이 배경이 거의 보이지 않음

| variant | 현재 배경 | 수정 후 배경 | 현재 텍스트 | 수정 후 텍스트 |
|---------|-----------|-------------|-------------|---------------|
| primary | `bg-accent-gold/10` | `bg-accent-gold/15` | `text-accent-gold` | 유지 |
| secondary | `bg-white/5` | `bg-white/10` | `text-text-secondary` | `text-white/70` |
| danger | `bg-red-500/10` | `bg-red-500/15` | `text-red-400` | 유지 |

---

### 3. `src/components/learning/AdaptiveStepper.tsx`

**문제**: 텍스트가 작고(`text-xs`, `text-[10px]`), 미진행 상태의 스텝 버튼이 거의 안 보임

#### 텍스트 크기 수정
- 스텝 번호 텍스트: `text-[10px]` → `text-xs`
- 스텝 라벨: `text-[11px]` → `text-xs`
- 프로그레스 퍼센트: `text-xs` → `text-sm`

#### 상태별 배경색 강화

| 상태 | 현재 배경 | 수정 후 배경 | 현재 테두리 | 수정 후 테두리 |
|------|-----------|-------------|-------------|---------------|
| 완료 | `bg-green-500/10` | `bg-green-500/15` | `border-green-500/40` | `border-green-500/60` |
| 현재 | `bg-blue-500/10` | `bg-blue-500/15` | `border-blue-500/40` | `border-blue-500/60` |
| 진행중 | `bg-accent-gold/5` | `bg-accent-gold/12` | `border-accent-gold/30` | `border-accent-gold/50` |
| 미진행 | `bg-white/[0.02]` | `bg-white/[0.05]` | `border-white/10` | `border-white/20` |

#### 미진행 텍스트 색상
- `text-white/30` → `text-white/50`

---

### 4. `src/components/learning/LearnRoadmap.tsx`

**문제**: 모듈 버튼의 텍스트 불투명도가 낮고 배경 대비가 부족

#### 텍스트 수정
- 단계 라벨(`text-white/40`): `text-white/40` → `text-white/60`
- 미완료 모듈 버튼 텍스트(`text-white/50`): → `text-white/70`
- 단계 제목 부제목(`text-white/40`): → `text-white/60`

#### 모듈 버튼 배경 강화
| 상태 | 현재 배경 | 수정 후 배경 | 현재 테두리 | 수정 후 테두리 |
|------|-----------|-------------|-------------|---------------|
| 완료 | `bg-green-500/[0.03]` | `bg-green-500/[0.08]` | `border-green-500/15` | `border-green-500/30` |
| 미완료 | (없음) | `bg-white/[0.03]` | `border-white/[0.04]` | `border-white/[0.10]` |

---

### 5. `src/components/learning/LearnHero.tsx`

**문제**: 라벨 텍스트가 너무 작고 본문 설명의 불투명도가 낮음

#### 텍스트 수정
- 라벨: `text-[11px]` → `text-xs`, `text-accent-gold/80` → `text-accent-gold`
- 설명: `text-sm text-white/60` → `text-sm text-white/75`
- 서브 설명 (있는 경우): `text-white/40` → `text-white/60`

---

### 6. `src/components/learning/ModuleCanvas.tsx`

**문제**: 모듈 라벨과 핵심 포인트 헤더 텍스트가 너무 작음

#### 텍스트 수정
- 모듈 라벨: `text-[11px]` → `text-xs`
- 모듈 라벨 색상: `text-accent-gold/70` → `text-accent-gold/90`
- 핵심 포인트 헤더: `text-xs text-white/40` → `text-xs text-white/60`
- 탭 버튼 (비활성): `text-white/40` → `text-white/60`

---

### 7. Concept 컴포넌트 12개 (`src/components/learning/concepts/`)

**공통 패턴 수정** — 아래 모든 파일에 동일하게 적용

**대상 파일**:
- `DecentralizationConcept.tsx`
- `VaultConcept.tsx`
- `HashConcept.tsx`
- `ConsensusConcept.tsx`
- `KeyConcept.tsx`
- `SignatureConcept.tsx`
- `UTXOConcept.tsx`
- `TxConcept.tsx`
- `MiningConcept.tsx`
- `EconomyConcept.tsx`
- `LottoConcept.tsx`
- `FairnessConcept.tsx`

#### 텍스트 수정
- 비유 설명 텍스트(`text-sm text-white/60`): → `text-sm text-white/75`
- 카드 본문(`text-xs text-white/50`): → `text-xs text-white/65`
- 카드 설명(`text-sm text-white/60`): → `text-sm text-white/75`

#### 카드 배경/테두리 강화 (색상별 패턴)
| 색상 | 현재 배경 | 수정 후 배경 | 현재 테두리 | 수정 후 테두리 |
|------|-----------|-------------|-------------|---------------|
| blue | `from-blue-500/[0.08]` | `from-blue-500/[0.14]` | `border-blue-500/25` | `border-blue-500/40` |
| purple | `from-purple-500/[0.08]` | `from-purple-500/[0.14]` | `border-purple-500/25` | `border-purple-500/40` |
| emerald | `from-emerald-500/[0.08]` | `from-emerald-500/[0.14]` | `border-emerald-500/25` | `border-emerald-500/40` |
| amber | `from-amber-500/[0.08]` | `from-amber-500/[0.14]` | `border-amber-500/25` | `border-amber-500/40` |
| gold | `from-accent-gold/[0.08]` | `from-accent-gold/[0.14]` | `border-accent-gold/25` | `border-accent-gold/40` |

---

### 8. `src/components/learning/DecisionModal.tsx`

**문제**: 통계 박스와 오답 분석 영역의 배경이 거의 안 보임

#### 텍스트 수정
- StatBox 라벨: `text-[10px] text-white/40` → `text-xs text-white/60`
- StatBox 값: 현재 크기 유지, 색상 불투명도 10% 증가
- 피드백 텍스트: `text-xs text-white/50` → `text-xs text-white/65`

#### 배경 강화
| 컴포넌트 | 현재 배경 | 수정 후 배경 | 현재 테두리 | 수정 후 테두리 |
|----------|-----------|-------------|-------------|---------------|
| 모달 박스 | `bg-white/[0.05]` | `bg-white/[0.08]` | `border-white/10` | `border-white/18` |
| StatBox | `bg-white/[0.02]` | `bg-white/[0.06]` | `border-white/[0.06]` | `border-white/[0.14]` |
| 오답 분석 | `bg-red-500/[0.03]` | `bg-red-500/[0.08]` | `border-red-500/10` | `border-red-500/20` |

---

### 9. `src/pages/LearnLandingPage.tsx`

**문제**: 페이지 내 섹션 제목/설명 텍스트 일부가 낮은 불투명도 사용

#### 텍스트 수정
- 섹션 라벨(`text-[11px]`): → `text-xs`
- 섹션 설명(`text-white/40`): → `text-white/60`

---

### 10. `src/pages/LearnModulePage.tsx`

**문제**: 페이지 헤더 텍스트

#### 텍스트 수정
- 모듈 라벨: `text-[11px]` → `text-xs`
- 라벨 색상: `text-accent-gold/70` → `text-accent-gold/90`

---

### 11. `src/pages/LearnNetworkPage.tsx`

**문제**: 라벨과 설명 텍스트

#### 텍스트 수정
- 라벨: `text-[11px] text-accent-gold/70` → `text-xs text-accent-gold/90`
- 설명: `text-sm text-white/40` → `text-sm text-white/60`

---

### 12. `src/pages/LearnReportPage.tsx`

**문제**: 리포트 페이지 내 텍스트 가독성

#### 텍스트 수정
- 라벨: `text-[11px]` → `text-xs`
- 설명 텍스트: `text-white/40` 이하 → `text-white/60`

---

## 수정 원칙 요약

### 텍스트
| 적용 전 | 적용 후 | 적용 범위 |
|---------|---------|----------|
| `text-[11px]` | `text-xs` (12px) | 섹션/모듈 라벨 전체 |
| `text-[10px]` | `text-xs` | 스텝 번호, 소형 라벨 |
| `text-white/40` 이하 | `text-white/60` | 설명·보조 텍스트 |
| `text-white/50` | `text-white/70` | 버튼 내 텍스트, 미완료 항목 |
| `text-accent-gold/70` | `text-accent-gold/90` | 강조 라벨 |

### 배경 (글래스 카드)
| 적용 전 | 적용 후 | 적용 범위 |
|---------|---------|----------|
| `bg-*/[0.02~0.03]` | `bg-*/[0.06~0.08]` | 기본 카드·박스 |
| `bg-*/[0.05]` | `bg-*/[0.08~0.10]` | 중간 카드 |
| `bg-*/[0.08]` | `bg-*/[0.14]` | 컨셉 카드 배경 |

### 테두리
| 적용 전 | 적용 후 | 적용 범위 |
|---------|---------|----------|
| `border-*/[0.04~0.06]` | `border-*/[0.10~0.14]` | 카드·박스 |
| `border-*/25` | `border-*/40` | 컬러 카드 |
| `border-*/15` | `border-*/30` | 상태 버튼 |

---

## 작업 우선순위

1. **즉시 효과 큰 것** (먼저 수정)
   - `GlassCard.tsx` — 모든 카드에 영향
   - `AdaptiveStepper.tsx` — 진행도 표시
   - Concept 컴포넌트 카드 배경/텍스트

2. **페이지별 세부 수정**
   - `LearnRoadmap.tsx`, `LearnHero.tsx`, `ModuleCanvas.tsx`

3. **모달 및 세부 UI**
   - `DecisionModal.tsx`, 페이지 파일들(`LearnLandingPage`, `LearnNetworkPage`, 등)
