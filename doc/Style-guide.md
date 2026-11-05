# DailyPet 프론트엔드 스타일 가이드

> 근거 문서: [SERVICE.md](../SERVICE.md) 8장(디자인 방향), [ARCHITECTURE.md](ARCHITECTURE.md) 7.6장(디자인 시스템), [wireframe.md](wireframe.md) 13장(공통 컴포넌트)
> 참고 자료: Prism Design System 사례 소개 — <https://www.kahunuif.com/prism-design-system>, <https://www.david-avery.com/prism> (확인일 2026-11-04)
> 작성일: 2026-11-04 · 적용 대상: `src/frontend/` (React + TypeScript + Tailwind CSS)

### 이 문서의 위치

- 색·글꼴·간격·반경·그림자·모션의 **값**과 컴포넌트의 **모양·상태**를 정한다.
- 화면 배치와 흐름은 wireframe.md, 기능 요구는 SERVICE.md가 정한다. 셋이 다르면 SERVICE.md → ARCHITECTURE.md → 이 문서 → wireframe.md 순으로 따르고, 다른 부분은 문서를 먼저 고친다 (CLAUDE.md 2장).
- 값은 `src/frontend/src/styles/tokens.css` **한 곳**에만 정의한다 (CLAUDE.md 4.5.2). 이 문서와 `tokens.css`가 다르면 이 문서를 기준으로 맞춘다.

### 참고 자료를 쓰는 범위

두 페이지는 Prism 디자인 시스템의 **원칙과 구조**만 공개한다. 실제 색상값·글꼴·컴포넌트 명세는 사내 문서라 공개되어 있지 않다. 그래서 이 문서는 아래처럼 쓴다.

- **가져온 것**: 원칙과 구조 (1장)
  - 단일 기준본
  - 3계층 토큰 (공통 스타일 → 브랜드 테마 → 플랫폼 토큰)
  - 브랜드 중립 컴포넌트
  - 아토믹 구성
  - "동화 같지만 세련되게"
  - 둥글고 친근한 형태
- **가져오지 않은 것**: Prism과 디즈니의 로고, 캐릭터, 이름, 색상값, 글꼴, 일러스트, 아이콘. 모든 값은 이 문서에서 직접 정했다.
- ⚠️ **저작권·상표**: 다른 회사의 캐릭터·로고·이름·음악·이미지를 쓰지 않는다 (CLAUDE.md 4.5.2, SERVICE.md 8장). 화면·코드·에셋 이름에 "Disney", "Prism", "Mickey" 같은 이름을 쓰지 않는다.

---

## 1. 원칙

| # | Prism 원칙 | DailyPet 적용 |
|---|-----------|---------------|
| P1 | **단일 기준본(single source of truth)** — 여러 제품의 차이를 하나의 시스템으로 모은다 | 디자인 값은 `tokens.css` 한 곳에 둔다. 컴포넌트·화면 코드에 hex 색, px 값을 직접 쓰지 않는다 |
| P2 | **3계층 토큰** — 공통 스타일(Universal) → 브랜드 테마(Brand Theme) → 플랫폼 토큰 | **원시 토큰 → 의미 토큰 → 컴포넌트 토큰** 3단계 (2장). 테마(밝게/밤하늘)와 종(개/고양이)은 의미 토큰만 바꿔서 처리한다 |
| P3 | **브랜드 중립 컴포넌트** — 컴포넌트는 변수만 참조하고 브랜드별로 입힌다 | 컴포넌트는 의미·컴포넌트 토큰만 참조한다. 그래서 테마나 종이 바뀌어도 컴포넌트 코드는 그대로다 |
| P4 | **아토믹 구성** — 원자 → 분자 → 템플릿 → 화면 | 기초(토큰) → 기본 컴포넌트(버튼·배지·입력) → 복합 컴포넌트(할 일 카드·말풍선·승인 카드) → 화면(W00~W12) |
| P5 | **"동화 같지만 세련되게"** — 장난스러운 느낌을 지키되 정돈된 완성도를 유지한다 | 반짝임·마스코트·장식 글꼴은 **포인트**에만 쓴다. 정보 영역(일정·근거·오류)은 차분하고 읽기 쉽게 만든다 |
| P6 | **둥글고 친근한 형태** — 부드러운 로고타입과 일러스트 | 큰 반경(16~24px), 알약 버튼, 버블 말풍선을 쓰고 날카로운 직선은 줄인다. 마스코트는 자체 제작한다 |
| P7 | **문서화된 컴포넌트 명세** — 디자인·개발·기획이 같은 문서를 본다 | 컴포넌트마다 변형·상태·접근성 규칙을 이 문서 7장에 적는다. 새 컴포넌트는 이 문서에 먼저 추가한다 |

**우선순위**: 읽기 쉬움·접근성이 꾸밈보다 먼저다. 예를 들어 파스텔 배경 위 글자가 4.5:1을 못 넘기면 색을 바꾸지, 예외를 두지 않는다.

---

## 2. 토큰 구조와 이름 규칙

```
원시 토큰 (palette)       --palette-blue-600: #3366E0;          값 그 자체. 컴포넌트에서 직접 쓰지 않는다
     ↓
의미 토큰 (semantic)      --color-primary: var(--palette-blue-600); 역할. 테마·종에 따라 다시 연결된다
     ↓
컴포넌트 토큰 (component) --button-primary-bg: var(--color-primary); 컴포넌트에 꼭 필요할 때만 만든다
```

| 계층 | 이름 형식 | 예 | 누가 참조하나 |
|------|-----------|-----|---------------|
| 원시 | `--palette-{색}-{단계}` | `--palette-cream-50`, `--palette-night-900` | 의미 토큰만 |
| 의미 | `--color-{역할}[-{변형}]`, `--space-{n}`, `--radius-{용도}`, `--font-{용도}`, `--shadow-{n}`, `--motion-{용도}` | `--color-text-muted`, `--radius-card` | 컴포넌트, Tailwind theme |
| 컴포넌트 | `--{컴포넌트}-{부위}-{상태}` | `--button-primary-bg-hover` | 그 컴포넌트만 |

- ARCHITECTURE.md 7.6의 토큰(`--color-bg`, `--color-surface`, `--color-primary`, `--color-accent`, `--color-pink`/`--color-mint`/`--color-sky`, `--radius-card`, `--font-display`/`--font-body`)은 이름을 그대로 유지한다.
- Tailwind는 의미 토큰만 연결한다 (예: `bg-surface`, `text-muted`, `rounded-card`). `bg-[#FFF9F0]` 같은 임의값 클래스는 쓰지 않는다.
- 테마 전환은 `<html data-theme="light|dark">`로 한다. 종 전환은 `<html data-species="dog|cat">`으로 한다. 둘 다 의미 토큰만 다시 연결한다.

---

## 3. 색

### 3.1 원시 팔레트

| 계열 | 토큰 | 값 | 쓰임 |
|------|------|-----|------|
| 크림 | `--palette-cream-50` | `#FFF9F0` | 밝은 테마 배경 |
| 화이트 | `--palette-white` | `#FFFFFF` | 카드 면 |
| 잉크 | `--palette-ink-900` / `-600` | `#3D3A4B` / `#6B6880` | 본문 / 보조 글자 (순수 검정 대신 따뜻한 보라빛 회색) |
| 선 | `--palette-line-200` | `#ECE6DA` | 구분선·입력 테두리 |
| 로열 블루 | `--palette-blue-400` / `-600` / `-700` | `#4A7BF7` / `#3366E0` / `#2F5BD3` | 장식·큰 그래픽 / 버튼·링크 / 연한 배경 위 글자 |
| 하늘 | `--palette-sky-200` / `-100` | `#BDE3FF` / `#E3F2FF` | 파스텔 포인트 / 연한 배경 |
| 골드 | `--palette-gold-300` | `#FFC94D` | 반짝임·진행 표시 (글자색으로 쓰지 않음) |
| 연분홍 | `--palette-pink-200` / `-100` / `-700` | `#FFB8C9` / `#FFE3EA` / `#B83A64` | 파스텔 포인트 / 연한 배경 / 고양이 강조 글자 |
| 민트 | `--palette-mint-200` / `-100` | `#A8E6CF` / `#DDF5EA` | 파스텔 포인트 / 연한 배경 |
| 버터 | `--palette-butter-100` | `#FFF1C9` | 식단 카테고리 연한 배경 |
| 밤하늘 | `--palette-night-900` / `-800` / `-700` | `#1B1F3B` / `#262B52` / `#323868` | 다크 배경 / 카드 / 띄운 면 |
| 별빛 | `--palette-star-100` / `-300` / `-400` | `#F2F0FF` / `#B8B6D6` / `#7FA2FF` | 다크 본문 / 다크 보조 글자 / 다크 primary |
| 별빛 골드 | `--palette-stargold-300` | `#FFD873` | 다크 반짝임 |

### 3.2 의미 토큰 (밝게 / 밤하늘)

| 의미 토큰 | 밝게 | 밤하늘 | 쓰임 | 명암비 (밝게 / 밤하늘) |
|-----------|------|--------|------|-----------------------|
| `--color-bg` | `#FFF9F0` | `#1B1F3B` | 페이지 배경 | — |
| `--color-surface` | `#FFFFFF` | `#262B52` | 카드·시트·모달 | — |
| `--color-surface-raised` | `#FFFFFF` | `#323868` | 메뉴·토스트 | — |
| `--color-text` | `#3D3A4B` | `#F2F0FF` | 본문 | 10.5 / 14.3 (bg 기준) |
| `--color-text-muted` | `#6B6880` | `#B8B6D6` | 보조 정보·메타 | 5.1 / 6.9 (surface 기준) |
| `--color-border` | `#ECE6DA` | `#3A4078` | 구분선·입력 테두리 | 장식용 (정보 전달에 쓰지 않음) |
| `--color-primary` | `#3366E0` | `#7FA2FF` | 주요 버튼 배경·링크·포커스 | 흰 글자 5.1 / 남색 글자 6.5 |
| `--color-on-primary` | `#FFFFFF` | `#1B1F3B` | primary 위 글자 | — |
| `--color-primary-decor` | `#4A7BF7` | `#7FA2FF` | 일러스트·아이콘·큰 장식 (**글자·버튼 배경 금지**) | 3.8 — 텍스트 불가 |
| `--color-accent` | `#FFC94D` | `#FFD873` | 반짝임·진행 막대·별 장식 | 글자색 금지 |
| `--color-sky` / `--color-pink` / `--color-mint` | `#BDE3FF` / `#FFB8C9` / `#A8E6CF` | 각각 채도를 낮춘 버전 | 파스텔 포인트 면 | 위 글자는 `--color-text` (6.8 이상) |
| `--color-focus` | `#3366E0` | `#FFD873` | 포커스 링 | 3:1 이상 |

> ⚠️ **ARCHITECTURE.md 7.6과 다른 점**: 7.6의 로열 블루 `#4A7BF7`에 흰 글자를 올리면 명암비가 **3.84:1**이라 4.5:1 기준에 미달한다. 그래서 `--color-primary`는 `#3366E0`(5.1:1)으로 바꾸고, `#4A7BF7`은 `--color-primary-decor`(장식 전용)로 남긴다. ARCHITECTURE.md 7.6 표도 같이 고쳤다.

### 3.3 상태 색

상태는 **색 + 아이콘 + 글자**로 함께 표시하고, 색만으로 구분하지 않는다 (wireframe 13장).

| 상태 | 토큰 | 글자 (밝게) | 배경 (밝게) | 글자 (밤하늘) | 아이콘 | 쓰는 곳 |
|------|------|-------------|-------------|---------------|--------|---------|
| 성공 | `--color-success` | `#1F7A4D` | `#E2F6EC` | `#7FD1AE` | ✓ | 저장 완료, 할 일 완료 |
| 주의 | `--color-warning` | `#9A5B00` | `#FFF4D6` | `#FFC46B` | ⏰ | D-7 이내, 이력 확인 필요 |
| 위험 | `--color-danger` | `#C23B3B` | `#FFE8E8` | `#FF8A8A` | ⚠️ | 지연됨, 삭제 버튼, 오류, 유해 식품 경고 |
| 정보 | `--color-info` | `#2F5BD3` | `#E3F2FF` | `#9AA0D6` | ⓘ | 프로필 변경 안내, 웹 검색 출처 안내 |
| 중립 | `--color-neutral` | `#6B6880` | `#F3F1FA` | `#B8B6D6` | — | 직접 추가, 취소된 요청 |

모든 조합은 명암비 4.5:1 이상이다 (위험 글자+배경 4.51, 성공 4.72, 주의 4.95, 중립 4.79).

### 3.4 카테고리 색 (할 일 카드)

| 카테고리 | 연한 배경 | 왼쪽 띠 | 기본 아이콘 | 글자 |
|----------|-----------|---------|-------------|------|
| 식단 `diet` | `--palette-butter-100` `#FFF1C9` | `--color-accent` | 🍚 | `--color-text` (9.8:1) |
| 활동 `activity` | `--palette-mint-100` `#DDF5EA` | `--color-mint` | 🐾 | `--color-text` (9.6:1) |
| 건강 `health` | `--palette-pink-100` `#FFE3EA` | `--color-pink` | 💉 | `--color-text` (9.2:1) |
| 직접 추가 | `--color-surface` | `--color-border` | 사용자가 고른 아이콘 | `--color-text` |

- 카드 이름 아래에는 카테고리 이름("식단", "활동", "건강 일정")을 **글자로** 함께 쓴다.
- 밤하늘 테마에서는 연한 배경 대신 `--color-surface`를 쓰고, 왼쪽 띠 색만 유지한다.

### 3.5 종별 강조색

선택한 반려동물의 종에 따라 `data-species`가 바뀌고, 아래 의미 토큰만 다시 연결된다 (wireframe W00 "종에 따라 마스코트·강조색 변경").

| 토큰 | 개 `dog` | 고양이 `cat` | 쓰는 곳 |
|------|----------|--------------|---------|
| `--color-species` | `#BDE3FF` 하늘 | `#FFB8C9` 연분홍 | 선택된 반려동물 탭 배경, 인사 영역 배경 |
| `--color-species-strong` | `#2F5BD3` | `#B83A64` | 선택 탭 글자·밑줄 (흰 배경 기준 5.9 / 5.5) |

종별 강조색은 **보조 강조**에만 쓴다. 주요 버튼은 종과 관계없이 `--color-primary`를 쓴다.

---

## 4. 글꼴

### 4.1 글꼴 모음

| 토큰 | 글꼴 | 대체 글꼴 | 쓰는 곳 |
|------|------|-----------|---------|
| `--font-display` | **Jua** (Google Fonts, SIL OFL) | `"Apple SD Gothic Neo", sans-serif` | 화면 제목, 마스코트 인사, 빈 상태 제목. **18px 이상에서만** |
| `--font-body` | **Nanum Gothic** (Google Fonts, SIL OFL) | `"Apple SD Gothic Neo", "Malgun Gothic", sans-serif` | 본문, 버튼, 입력, 표 |
| `--font-mono` | `ui-monospace, "D2Coding", monospace` | — | 근거 보기의 카탈로그 ID 표시 |

- 글꼴 후보와 라이선스는 `doc/assets.md`에 기록한다 (ARCHITECTURE.md 7.6에서 "후보"로 둔 항목).
- 장식 글꼴(Jua)은 한 화면에 제목 1~2곳만 쓴다 (P5). 버튼·입력·표·일정 날짜에는 쓰지 않는다.
- 숫자(체중·kcal·D-day)는 `font-variant-numeric: tabular-nums`로 자릿수를 맞춘다.

### 4.2 크기 단계

| 토큰 | 크기 / 줄 높이 | 굵기 | 글꼴 | 쓰는 곳 |
|------|---------------|------|------|---------|
| `--text-display` | 32 / 40px | 400 (Jua는 단일 굵기) | display | 첫 화면 앱 이름 |
| `--text-title-1` | 24 / 32px | 400 | display | 화면 제목 ("오늘의 할 일") |
| `--text-title-2` | 20 / 28px | 400 | display | 마스코트 인사, 모달 제목 |
| `--text-title-3` | 18 / 26px | 700 | body | 카드 제목, 섹션 제목 |
| `--text-body` | 16 / 24px | 400 | body | 본문, 채팅 말풍선, 입력 |
| `--text-body-strong` | 16 / 24px | 700 | body | 할 일 이름, 버튼 |
| `--text-small` | 14 / 20px | 400 | body | 메타 정보 ("활동 · 저강도 · 실내"), 배지 |
| `--text-caption` | 12 / 16px | 400 | body | 출처 URL, 확인일, 입력 도움말. **본문 정보는 12px 아래로 내리지 않는다** |

- 모바일 입력란은 16px 아래로 내리지 않는다 (iOS 자동 확대 방지).
- 한 줄 길이는 데스크톱에서도 한글 40자 안팎(약 `36rem`)이 넘지 않게 한다.

---

## 5. 간격·레이아웃

### 5.1 간격 단계 (4px 기준)

| 토큰 | 값 | 쓰는 곳 |
|------|-----|---------|
| `--space-1` | 4px | 아이콘과 글자 사이 |
| `--space-2` | 8px | 배지 안쪽, 버튼 사이 |
| `--space-3` | 12px | 카드 안 줄 사이 |
| `--space-4` | 16px | 카드 안쪽 여백, **모바일 좌우 여백** |
| `--space-5` | 20px | 카드와 카드 사이 |
| `--space-6` | 24px | 섹션 사이, 데스크톱 좌우 여백 |
| `--space-8` | 32px | 화면 제목 아래 |
| `--space-12` | 48px | 빈 상태 위아래 |

### 5.2 화면 폭과 배치

| 구간 | 폭 | 배치 (wireframe W00) |
|------|-----|---------------------|
| 모바일 | `< 640px` | 하단 내비 5칸, 본문 1열, 좌우 16px |
| 태블릿 | `640 ~ 1023px` | 하단 내비 유지, 본문 최대 640px 가운데 정렬 |
| 데스크톱 | `≥ 1024px` | 왼쪽 사이드바(240px), 본문 최대 **960px** 가운데 정렬, 대시보드 할 일 카드는 2열까지 |

- 어떤 폭에서도 가로 스크롤이 생기지 않게 한다. 긴 URL·카탈로그 ID는 `overflow-wrap: anywhere`.
- 하단 내비·고정 버튼은 `env(safe-area-inset-bottom)`만큼 띄운다.

---

## 6. 형태·높이

### 6.1 모서리 반경

| 토큰 | 값 | 쓰는 곳 |
|------|-----|---------|
| `--radius-sm` | 12px | 체크박스(6px 예외), 작은 썸네일 |
| `--radius-input` | 16px | 입력란, 선택 상자 |
| `--radius-card` | **20px** | 카드 (ARCHITECTURE.md 7.6과 동일) |
| `--radius-sheet` | 24px | 모달, 하단 시트 위쪽 모서리 |
| `--radius-bubble` | 20px, 말꼬리 쪽 모서리만 6px | 채팅 말풍선 |
| `--radius-pill` | 999px | 버튼, 배지, 반려동물 탭, 토스트 |

### 6.2 그림자 (밝게)

그림자는 검정 대신 잉크색(`#3D3A4B`)을 옅게 깔아 따뜻하게 보이게 한다.

| 토큰 | 값 | 쓰는 곳 |
|------|-----|---------|
| `--shadow-0` | `none` | 배경에 붙은 영역 |
| `--shadow-1` | `0 2px 8px rgb(61 58 75 / 0.08)` | 카드 기본 |
| `--shadow-2` | `0 6px 16px rgb(61 58 75 / 0.12)` | 카드 눌러 들어 올림, 드롭다운 |
| `--shadow-3` | `0 12px 32px rgb(61 58 75 / 0.18)` | 모달, 하단 시트, 토스트 |

**밤하늘 테마**에서는 그림자가 잘 안 보인다. 대신 면 색 단계(`surface` → `surface-raised`)와 1px `--color-border`로 높이를 나타낸다. 강조 카드에만 `0 0 0 1px rgb(255 216 115 / 0.25)` 별빛 테두리를 쓴다.

---

## 7. 컴포넌트

모든 상호작용 컴포넌트에 공통으로 적용하는 규칙이다.
- 터치 영역은 **44×44px 이상**이다.
- 키보드로 조작할 수 있고, 포커스 링은 `2px solid var(--color-focus)`에 `outline-offset: 2px`다.
- 비활성 상태는 투명도 0.45로 흐리게 하고, 이유를 도움말 문구로 알려 준다.

### 7.1 버튼 (알약)

| 변형 | 배경 | 글자 | 테두리 | 쓰는 곳 |
|------|------|------|--------|---------|
| 주요 `primary` | `--color-primary` | `--color-on-primary` | — | 화면당 1개: [저장], [승인], [할 일 다시 제안] |
| 보조 `secondary` | `--color-surface` | `--color-primary` | 1.5px `--color-primary` | [날짜 수정], [＋ 직접 추가] |
| 텍스트 `ghost` | 투명 | `--color-primary` | — | [보기 ›], [일정 ›], [되돌리기] |
| 위험 `danger` | `--color-surface` | `--color-danger` | 1.5px `--color-danger` | [삭제], [탈퇴], [거절] |
| 위험 확정 `danger-solid` | `--color-danger` | `#FFFFFF` | — | 확인 모달의 최종 삭제 버튼에만 |

| 크기 | 높이 | 좌우 안쪽 | 글자 |
|------|------|-----------|------|
| `md` (기본) | 48px | 24px | `--text-body-strong` |
| `sm` | 36px (터치 영역은 44px 유지) | 16px | `--text-small` 700 |

| 상태 | 표현 |
|------|------|
| hover | 배경을 한 단계 진하게 (`color-mix(in srgb, var(--color-primary) 88%, black)`) |
| pressed | `transform: scale(0.97)` — 말랑하게 눌림 (모션 끄면 색만 변경) |
| focus | 포커스 링 |
| loading | 글자 대신 점 3개 애니메이션 + `aria-busy="true"`, 다시 누를 수 없음 |
| disabled | 투명도 0.45, `aria-disabled` |

### 7.2 입력란

- 높이는 48px, 반경은 `--radius-input`, 테두리는 1.5px `--color-border`, 배경은 `--color-surface`이다.
- 라벨은 입력란 **위에** 항상 보이게 둔다. 자리표시자(placeholder)로 라벨을 대신하지 않는다.
- 오류 상태:
  - 테두리를 `--color-danger`로 바꾼다.
  - 아래에 ⚠️와 오류 문구를 `--text-caption`으로 표시한다.
  - 입력란과 오류 문구를 `aria-describedby`로 연결한다.
- 체중 입력은 단위(kg)를 입력란 오른쪽 안에 표시하고, `inputmode="decimal"`로 숫자 키패드를 띄운다.

### 7.3 반려동물 탭

- 알약 모양으로, 마스코트 아바타(24px)와 이름을 함께 보여 준다.
- 선택된 탭은 배경 `--color-species`, 글자 `--color-species-strong`, `aria-selected="true"`이다.
- 탭이 많아 넘치면 가로로 스크롤한다. 페이지 전체가 가로로 스크롤되면 안 된다.

### 7.4 할 일 카드

```
┌ 3px 카테고리 띠 ─────────────────────────────
│ ☐  10:00  🙈 숨바꼭질 놀이 10분            ⟨배지⟩
│           활동 · 저강도 · 실내               ← --text-small, --color-text-muted
│           👍  👎  🔄 바꾸기  ⋯               ← 식단·활동만
└──────────────────────────────────────────────
```

| 요소 | 규칙 |
|------|------|
| 카드 | `--color-surface`, `--radius-card`, `--shadow-1`, 안쪽 16px, 왼쪽에 카테고리 띠 |
| 체크박스 | 28px 원형. 완료하면 `--color-success`로 채우고 ✓ 표시, 제목에 취소선과 `--color-text-muted` |
| 👍 / 👎 | 토글 버튼(`aria-pressed`). 누르면 아이콘 배경에 `--color-sky` / `--color-pink`를 깔고 토스트 "기억해 둘게요" |
| 🔄 바꾸기 / ⋯ | ghost 버튼 |
| **건강 일정 카드** | 체크박스와 [일정 ›]만 있다. **👍/👎/바꾸기를 표시하지 않는다** (ARCHITECTURE.md 7.6) |
| 직접 추가 카드 | 오른쪽 위에 "✍️ 직접 추가" 중립 배지 |
| 완화 표시 | 👎 제외를 완화해 다시 들어온 항목에는 "싫어요 표시한 항목" 주의 배지와 사유 한 줄을 붙인다 (CLAUDE.md 4.5.1) |
| 삭제 | 카드를 접는 애니메이션 뒤 토스트 [되돌리기] 5초 |

### 7.5 상태 배지

- 알약 모양이고 높이 24px, 안쪽 좌우 8px, 글자는 `--text-small`이다.
- 배경은 3.3장의 연한 배경, 글자는 같은 계열의 진한 글자, 앞에 아이콘을 붙인다.
- 예: `⏰ D-3`(주의), `⚠️ 지연됨`(위험), `ⓘ 이력 확인 필요`(주의), `✍️ 직접 추가`(중립), `✓ 완료`(성공)

### 7.6 채팅 말풍선

| 종류 | 정렬 | 배경 | 글자 | 기타 |
|------|------|------|------|------|
| 사용자 | 오른쪽 | `--color-primary` | `--color-on-primary` | 최대 폭 80%, 말꼬리는 오른쪽 아래 |
| 마스코트(Agent) | 왼쪽 | `--color-surface` + `--shadow-1` | `--color-text` | 왼쪽에 마스코트 아바타 32px, 말꼬리는 왼쪽 아래 |
| 근거 보기 | 마스코트 말풍선 아래 | 투명 | `--color-text-muted` | ghost 토글. 펼치면 `contexts`와 trace 단계를 **사용자용 문구**로 표시 (`traceLabels.ts`, 인자 숨김) |
| 웹 검색 답변 | 마스코트와 같음 | — | — | 아래에 ⓘ 정보 띠: "일반 정보이며 수의사 상담을 대체하지 않아요" + 출처 링크 목록 (`--text-caption`) |
| 병원 권고 | 마스코트와 같음 | 위험 연한 배경 | `--color-text` | 앞에 ⚠️. 버튼처럼 보이지 않게 한다 |
| 생각 중 | 왼쪽 | `--color-surface` | — | 점 3개 바운스. `aria-live="polite"`로 "답변을 준비하고 있어요"를 읽어 준다 |

### 7.7 승인 카드 (HITL)

- 마스코트 말풍선 아래에 붙는 카드다. 테두리는 2px `--color-accent`, 제목은 "이렇게 등록할까요?"이다.
- 내용은 일정 이름, 날짜(`M/D (요일)`), 회차를 표 형태로 보여 준다.
- 버튼은 [승인] primary, [날짜 수정] secondary, [거절] danger다. [날짜 수정]을 누르면 같은 카드 안에 날짜 선택기가 열린다.
- 처리가 끝난 카드는 버튼을 없애고 결과 배지로 바꾼다: `✓ 등록했어요`(성공), `거절했어요`(중립), `취소된 요청`(중립).
- 승인을 기다리는 동안 입력창 위에 정보 띠 "새로 질문하면 위 요청은 취소돼요"를 표시한다.

### 7.8 토스트

- 화면 하단 중앙(하단 내비 위)에 뜨는 알약 모양이다. 배경 `--color-surface-raised`, 그림자 `--shadow-3`을 쓴다.
- 3초 뒤 사라지고, [되돌리기]가 있으면 5초 뒤 사라진다. 마우스를 올리거나 포커스가 있으면 멈춘다.
- `role="status"`를 붙인다. 오류 토스트만 `role="alert"`를 쓴다.

### 7.9 확인 모달 · 하단 시트

- 모바일에서는 하단 시트(위쪽 반경 24px)로 띄우고, 데스크톱에서는 가운데 모달(최대 폭 440px)로 띄운다.
- 배경을 `rgb(27 31 59 / 0.45)`로 어둡게 깔고, 포커스를 모달 안에 가둔다. Esc를 누르거나 바깥을 누르면 닫는다. 단, 입력 확인 모달은 바깥 눌러 닫기를 막는다.
- 파괴적 작업:
  - 반려동물 삭제는 **이름**, 회원 탈퇴는 **이메일**을 입력해야 `danger-solid` 버튼이 켜진다.
  - 무엇이 지워지는지 목록으로 보여 준다.
- 일반 확인(할 일 다시 제안·취향 초기화·대화 삭제)은 [취소] secondary와 [확인] primary 버튼을 쓴다.

### 7.10 빈 상태 · 오류 상태

| 상태 | 구성 |
|------|------|
| 빈 상태 | 마스코트(기본 표정, 96px) + `--text-title-2` 한 줄 + 다음 행동 primary 버튼 1개 |
| 영역 오류 (503·네트워크) | 그 영역만 카드 안에 마스코트(미안 표정) + "잠시 후 다시 시도해 주세요" + [다시 시도]. 나머지 영역은 정상 표시 (S22) |
| 불러오는 중 | 카드 모양 스켈레톤(`--color-border` 바탕, 은은한 깜박임). 모션을 끄면 깜박이지 않음 |

### 7.11 내비게이션

- **하단 내비 (모바일)**: 높이 64px에 safe-area를 더하고, 아이콘 24px 위·라벨 12px 아래로 둔다. 현재 탭은 `--color-primary`와 위쪽 3px 막대, `aria-current="page"`로 표시한다.
- **사이드바 (데스크톱)**: 폭은 240px, 항목은 알약 모양이다. 현재 항목은 배경 `--color-sky`(밤하늘에서는 `--color-surface-raised`)로 표시한다.
- **알림 🔔 배지**: `--color-danger` 원에 흰 숫자를 넣는다. 9개를 넘으면 "9+"로 표시하고, `aria-label="알림 3개"`를 붙인다.

### 7.12 진행 막대 (오늘의 할 일)

- 높이 10px, 반경은 pill이다. 바탕은 `--color-border`, 채움은 `--color-accent`다.
- 막대 옆에 "2/6"을 **글자로** 함께 보여 준다 (색만으로 진행률을 알리지 않음).
- 100%가 되면 반짝임 모션과 마스코트 축하 표정을 보여 준다.

---

## 8. 아이콘·이모지·일러스트

- **이모지**: 카테고리·상태 표시에 쓴다.
  - 장식용이면 `aria-hidden="true"`를 붙이고, 같은 뜻의 글자를 옆에 둔다.
  - 이모지만으로 뜻을 전할 때(👍/👎 버튼)는 `aria-label`을 붙인다 ("좋아요", "싫어요").
- **마스코트**: 개·고양이 각각 기본·기쁨·미안·걱정·축하 5가지 표정을 둔다 (wireframe 13장).
  - SVG 또는 Lottie로 만들고, 크기는 24 / 32 / 96 / 160px 네 가지만 쓴다.
  - 큰 눈, 둥근 몸, 굵기 2~3px의 부드러운 외곽선을 쓰고, 색은 3.1장 팔레트 안에서만 고른다.
- **아이콘**: 선 굵기 2px, 끝이 둥근 모양으로 통일한다. 오픈 라이선스 아이콘 세트를 하나만 정해 쓰고, `doc/assets.md`에 기록한다.
- **반짝임 ✨**: 한 화면에 동시에 1곳만 쓴다. 완료·축하·첫 화면 로고 같은 포인트 순간에만 쓴다 (P5).
- 모든 에셋의 출처와 라이선스는 `doc/assets.md`에 기록한다. 다른 회사 IP와 닮게 만들지 않는다 (예: 특정 캐릭터의 귀 실루엣, 로고 서체).

---

## 9. 모션

| 토큰 | 값 | 쓰는 곳 |
|------|-----|---------|
| `--motion-fast` | 120ms | hover, 눌림, 토글 |
| `--motion-base` | 200ms | 카드 펼침·접힘, 탭 전환 |
| `--motion-slow` | 320ms | 모달·시트 열고 닫기 |
| `--motion-celebrate` | 최대 800ms | 완료 반짝임, 마스코트 반응 |
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | 일반 전환 |
| `--ease-bounce` | Framer Motion `spring({ stiffness: 400, damping: 18 })` | 체크·바운스·말랑 눌림 |

- 모션은 **상태 변화를 알릴 때만** 쓴다. 반복 애니메이션은 "생각 중" 점과 스켈레톤만 허용한다.
- 반짝임 파티클은 12개 이하로 하고, 화면을 가리지 않는다.
- **움직임 줄이기**: `prefers-reduced-motion: reduce`이거나 W12에서 "움직임 줄이기"를 켜면 다음처럼 처리한다.
  - 반짝임, 바운스, 마스코트 반응, 스켈레톤 깜박임을 끈다.
  - 모달·시트는 120ms 페이드로만 연다.
  - 상태 변화(완료 ✓, 배지)는 그대로 보여 준다.
  - `<html data-motion="reduced">`로 전역 적용한다 (ARCHITECTURE.md 7.6).

---

## 10. 테마 — 밝게 / 밤하늘

| 설정 (W12) | 적용 |
|------------|------|
| 자동 (기본) | `prefers-color-scheme`를 따른다 |
| 밝게 | `data-theme="light"` |
| 밤하늘 | `data-theme="dark"` |

- 설정은 `localStorage`에 둔다. 읽기에 실패하면 "자동"을 쓴다 (ARCHITECTURE.md 7.6).
- 첫 화면이 깜박이지 않게, `index.html`의 `<head>`에서 React보다 먼저 `data-theme`·`data-motion`을 설정한다.
- **"자동"의 처리**: 스크립트가 `prefers-color-scheme`·`prefers-reduced-motion`을 읽어 `data-theme`·`data-motion`에 **실제 값**(`light|dark`, `full|reduced`)을 넣고, 기기 설정이 바뀌면 다시 넣는다. 그래서 `tokens.css`에는 다크 값과 움직임 줄이기 값을 `[data-theme="dark"]`·`[data-motion="reduced"]`에 **한 번만** 적는다 (13.2의 `@media` 중복 블록은 쓰지 않는다, P1 단일 기준본). 스크립트가 실패하면 밝게·움직임 있음으로 보인다.
- **밤하늘 연출**: 배경 위쪽에 아주 옅은 별 점 패턴(`--color-accent` 15% 이하)을 깐다. 본문 영역 뒤에는 깔지 않는다.
- 일러스트·마스코트는 두 테마에서 같은 파일을 쓴다. 밤하늘에서 외곽선이 묻히면 `drop-shadow`로 보완한다.

---

## 11. 문구 (말투)

| 원칙 | 좋은 예 | 피할 예 |
|------|---------|---------|
| 다정한 존댓말, 마스코트 1인칭 허용 | "오늘 콩이랑 산책 가는 날이에요! 🐾" | "산책 일정이 존재합니다." |
| 짧게, 다음 행동을 함께 | "체중을 기록하면 식단을 더 정확히 알려 드릴게요 [기록하기]" | "체중 정보 없음" |
| 오류는 탓하지 않고 방법을 | "잠시 연결이 불안정해요. 다시 시도해 주세요" | "503 Service Unavailable" |
| 건강 정보는 차분하게, 과장 없이 | "구토가 계속되면 동물병원에 꼭 가 보세요" | "괜찮을 거예요! ✨" (건강 경고에 반짝임·농담 금지) |
| 진단·처방처럼 들리지 않게 (CLAUDE.md 4.5) | "이런 증상은 병원에서 확인이 필요해요" | "장염입니다. ○○약을 먹이세요" |
| 내부 용어 숨김 | "식단 도우미가 확인했어요" | "diet_agent → get_pet_profile(args…)" |

- 날짜는 `11/13 (금)`, 상대 날짜는 `D-3`·`오늘`·`내일`처럼 보여 준다. 기준은 KST다 (CLAUDE.md 4.5.3).
- 숫자 단위는 숫자와 붙여 쓴다: `4.2kg`, `968kcal`, `15분`.
- 버튼 문구는 동사로 끝낸다: [저장하기], [다시 제안받기]. 단, [승인]·[거절]·[취소]는 예외로 한다.

---

## 12. 접근성 체크리스트

- [ ] 본문 글자는 4.5:1, 큰 글자(24px 이상, 또는 굵게 18.66px 이상)와 아이콘·포커스 링·입력 테두리는 3:1 이상이다.
- [ ] 상태·카테고리·진행률을 색만으로 구분하지 않는다 (아이콘 + 글자를 함께 쓴다).
- [ ] 모든 버튼·토글·탭을 키보드로 조작할 수 있고, 포커스 링이 보인다.
- [ ] 터치 영역이 44×44px 이상이다.
- [ ] 장식 이모지는 `aria-hidden`이고, 뜻을 가진 이모지 버튼에는 `aria-label`이 있다.
- [ ] 토스트는 `role="status"`, 채팅 새 답변은 `aria-live="polite"`로 읽어 준다.
- [ ] 모달은 포커스를 가두고, 닫으면 연 버튼으로 포커스를 돌려준다.
- [ ] 200%로 확대해도 가로 스크롤이 생기거나 내용이 잘리지 않는다.
- [ ] 움직임 줄이기에서 반복·바운스 모션이 모두 꺼진다.

---

## 13. 구현 기준

### 13.1 파일 위치

| 파일 | 내용 |
|------|------|
| `src/frontend/src/styles/tokens.css` | 원시·의미·컴포넌트 토큰, 테마·종·모션 분기 (**유일한 값 정의 위치**) |
| `tailwind.config.ts` | 의미 토큰을 `theme.extend`에 연결 (값을 다시 쓰지 않음) |
| `src/frontend/src/lib/traceLabels.ts` | trace 사용자용 문구 표 (ARCHITECTURE.md 7.6) |

### 13.2 `tokens.css` 골격

```css
:root {
  /* 원시 */
  --palette-cream-50: #FFF9F0;  --palette-white: #FFFFFF;
  --palette-ink-900: #3D3A4B;   --palette-ink-600: #6B6880;
  --palette-blue-400: #4A7BF7;  --palette-blue-600: #3366E0;  --palette-blue-700: #2F5BD3;
  --palette-gold-300: #FFC94D;  --palette-sky-200: #BDE3FF;
  --palette-pink-200: #FFB8C9;  --palette-pink-700: #B83A64;  --palette-mint-200: #A8E6CF;
  --palette-night-900: #1B1F3B; --palette-night-800: #262B52; --palette-night-700: #323868;
  --palette-star-100: #F2F0FF;  --palette-star-300: #B8B6D6;  --palette-star-400: #7FA2FF;
  --palette-stargold-300: #FFD873;

  /* 의미 — 밝게 (기본) */
  --color-bg: var(--palette-cream-50);
  --color-surface: var(--palette-white);
  --color-text: var(--palette-ink-900);
  --color-text-muted: var(--palette-ink-600);
  --color-primary: var(--palette-blue-600);
  --color-on-primary: var(--palette-white);
  --color-primary-decor: var(--palette-blue-400);
  --color-accent: var(--palette-gold-300);
  --color-focus: var(--palette-blue-600);
  /* … 3.2~3.4장의 나머지 토큰 */

  /* 종 — 개 (기본) */
  --color-species: var(--palette-sky-200);
  --color-species-strong: var(--palette-blue-700);

  /* 형태·간격·글꼴·모션 */
  --radius-card: 20px;  --radius-sheet: 24px;  --radius-pill: 999px;
  --space-4: 16px;
  --font-display: "Jua", "Apple SD Gothic Neo", sans-serif;
  --font-body: "Nanum Gothic", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif;
  --motion-base: 200ms;
}

/* 밤하늘: 사용자가 고른 경우 */
:root[data-theme="dark"] {
  --color-bg: var(--palette-night-900);
  --color-surface: var(--palette-night-800);
  --color-text: var(--palette-star-100);
  --color-text-muted: var(--palette-star-300);
  --color-primary: var(--palette-star-400);
  --color-on-primary: var(--palette-night-900);
  --color-accent: var(--palette-stargold-300);
  --color-focus: var(--palette-stargold-300);
}
/* 밤하늘: "자동"이고 기기가 다크 모드인 경우 (위와 같은 값) */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* 위 [data-theme="dark"]와 같은 값 */ }
}

:root[data-species="cat"] {
  --color-species: var(--palette-pink-200);
  --color-species-strong: var(--palette-pink-700);
}

:root[data-motion="reduced"] { --motion-base: 0ms; }
@media (prefers-reduced-motion: reduce) {
  :root:not([data-motion="full"]) { --motion-base: 0ms; }
}
```

> 다크 값이 두 곳에 같은 내용으로 들어가지 않도록, 구현은 `@media` 블록 대신 10장 "자동의 처리"(스크립트가 실제 값을 넣음)로 한 번만 적는다 (P1 단일 기준본).

---

## 14. 리뷰 체크리스트 (PR마다)

- [ ] 컴포넌트·화면 코드에 hex 색, px 반경·간격, 글꼴 이름을 직접 쓰지 않았다 (토큰만 사용).
- [ ] 새 색 조합의 명암비를 확인했다 (12장).
- [ ] 밝게 / 밤하늘 / 개 / 고양이 / 움직임 줄이기 다섯 조합에서 화면을 확인했다.
- [ ] 375px 폭(모바일)과 1280px 폭(데스크톱)에서 가로 스크롤이 없다.
- [ ] 건강 일정 카드에 👍/👎/바꾸기가 없다.
- [ ] trace 표시에 내부 이름·도구 인자·개인정보가 없다.
- [ ] 새 에셋의 출처·라이선스를 `doc/assets.md`에 기록했고, 다른 회사 IP를 쓰지 않았다.
- [ ] 새 컴포넌트·변형을 추가했으면 이 문서 7장에도 추가했다.
