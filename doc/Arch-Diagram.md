# DailyPet 기술 아키텍처 다이어그램

> [ARCHITECTURE.md](ARCHITECTURE.md)의 내용을 Mermaid로 그린 문서다. 내용이 다르면 ARCHITECTURE.md가 기준이다.
> 작성일: 2026-11-04

## 목차
1. [시스템 구성](#1-시스템-구성)
2. [Agent 그래프](#2-agent-그래프)
3. [가드레일·미들웨어 다층 방어](#3-가드레일미들웨어-다층-방어)
4. [채팅 요청 흐름 (POST /query)](#4-채팅-요청-흐름-post-query)
5. [HITL 승인 흐름](#5-hitl-승인-흐름)
6. [오늘의 할 일 자동 생성·교체](#6-오늘의-할-일-자동-생성교체)
7. [추천·개인화 파이프라인](#7-추천개인화-파이프라인)
8. [데이터 모델 (Chroma 컬렉션)](#8-데이터-모델-chroma-컬렉션)
9. [건강 일정 상태 변화](#9-건강-일정-상태-변화)
10. [카탈로그 구축 파이프라인](#10-카탈로그-구축-파이프라인)
11. [평가 흐름](#11-평가-흐름)

---

## 1. 시스템 구성

```mermaid
flowchart LR
    User(["👤 사용자<br/>브라우저"])

    subgraph Local["로컬 데모 환경 (localhost)"]
        direction LR
        FE["Frontend<br/>React + TypeScript<br/>Vite · Tailwind · Framer Motion<br/>:5173"]
        BE["Backend<br/>Node.js + Express<br/>JWT 인증 · CRUD · node-cron<br/>:3000"]
        AG["Agent Server<br/>Python · FastAPI<br/>LangChain + LangGraph<br/>:8000"]
        DB[("Chroma DB<br/>앱 데이터 + 카탈로그 + 지식<br/>:8001 · data/chroma/")]
        CP[("SqliteSaver<br/>checkpoint<br/>data/checkpoints/")]
    end

    subgraph External["외부 서비스"]
        LLM["Amazon Bedrock<br/>ChatBedrockConverse<br/>+ Embeddings"]
        WEB["웹 검색 API<br/>Tavily / DuckDuckGo"]
    end

    User -->|HTTPS 없음, 로컬| FE
    FE -->|"REST /api/*<br/>httpOnly JWT 쿠키"| BE
    BE -->|"POST /query · /query/resume<br/>POST /tasks/generate<br/>AGENT_API_KEY 헤더"| AG
    BE -->|"chromadb JS<br/>앱 데이터 CRUD"| DB
    AG -->|"langchain-chroma<br/>조회·검색·쓰기 도구"| DB
    AG --> CP
    AG -->|LLM 호출·임베딩| LLM
    AG -.->|"general_agent 전용<br/>PII 제거 질의"| WEB
```

**규칙 요약**
- Frontend는 Backend만 호출한다. Backend는 LLM을 직접 호출하지 않는다.
- 추천 로직(카탈로그 필터 → 취향 점수)은 Agent Server(`src/tools.py`) 한 곳에만 있다.
- 웹 검색은 `general_agent`만 쓴다.

---

## 2. Agent 그래프

```mermaid
flowchart TB
    Q(["question<br/>+ user_id · pet_id · thread_id"]) --> SUP

    SUP{{"supervisor<br/>create_supervisor<br/>pre_model_hook / post_model_hook"}}

    SUP -->|식단 질문| DIET["diet_agent<br/>create_agent"]
    SUP -->|운동 질문| EX["exercise_agent<br/>create_agent"]
    SUP -->|건강 일정 질문| HE["health_agent<br/>create_agent"]
    SUP -->|"그 밖의 개·고양이 질문<br/>또는 INSUFFICIENT_INFO 재위임 1회"| GEN["general_agent<br/>create_agent"]
    SUP -->|"범위 밖 · 미지원 종 · 진단 요청"| REJ["Supervisor가 직접<br/>거절 / 병원 권고"]

    subgraph CommonTools["공통 도구 (조회)"]
        T1[get_pet_profile]
        T2[list_my_pets]
        T3[get_preferences]
        T4[remember_preference]
        T5[search_pet_knowledge]
    end

    DIET --- CommonTools
    EX --- CommonTools
    HE --- CommonTools
    GEN --- T1 & T2 & T5

    DIET --> D1[calc_daily_calories]
    DIET --> R[recommend_from_catalog]
    EX --> R
    HE --> R
    HE --> H1[get_health_schedule]
    HE --> H2[get_upcoming_events]
    HE --> W1["✋ create_health_event"]
    HE --> W2["✋ update_health_event"]
    GEN --> WS["🌐 web_search<br/>최대 3회"]

    DIET & EX & HE & GEN -->|결과 반환| SUP
    SUP --> A(["answer · contexts · trace"])

    classDef write fill:#ffe0e6,stroke:#d6336c
    classDef web fill:#e7f5ff,stroke:#1c7ed6
    class W1,W2 write
    class WS web
```

- ✋ 표시 도구는 `HumanInTheLoopMiddleware` 승인 대상이다.
- `general_agent`에는 쓰기 도구가 없다.

---

## 3. 가드레일·미들웨어 다층 방어

```mermaid
flowchart TB
    IN(["POST /query"]) --> L1

    subgraph L1["① API 계층 (FastAPI) — 요청"]
        A1[요청 스키마 검증] --> A2["길이 제한 1,000자 · 레이트 리밋"] --> A3[PII 마스킹] --> A4[주입 1차 탐지]
    end

    L1 --> L2

    subgraph L2["② Supervisor hooks"]
        B1["pre_model_hook<br/>입력 가드레일 + PII"] --> B2[라우팅] --> B3["post_model_hook<br/>출력 가드레일"]
    end

    B2 --> L3

    subgraph L3["③ 하위 Agent middleware (순서대로)"]
        direction TB
        M1["1 injection_guard<br/>@before_model"] --> M2["2 PIIMiddleware<br/>입력·출력·도구결과"]
        M2 --> M3["3 SummarizationMiddleware"] --> M4["4 ModelCallLimit"]
        M4 --> M5["5 ToolCallLimit"] --> M6["6 Model/ToolRetry"]
        M6 --> M7["7 HumanInTheLoop<br/>health_agent 쓰기 도구"] --> M8["8 output_guard<br/>@after_model"]
    end

    subgraph GENX["general_agent 추가"]
        G1["web_query_pii_guard<br/>검색 질의 PII·이름 제거"]
        G2["web_result_guard<br/>web_result 래핑 · 주입 snippet 제거<br/>차단 도메인"]
    end
    L3 -.-> GENX

    L3 --> B3
    B3 --> L4

    subgraph L4["④ API 계층 — 응답 직전"]
        C1["answer · contexts · trace<br/>최종 PII 마스킹"] --> C2[출력 정책 최종 검사]
    end

    L4 --> OUT(["answer · contexts · trace"])

    M1 -. 차단 .-> BLK(["안내 문구 + trace<br/>guardrail stage=input"])
    M8 -. 위반 .-> FIX(["재작성 / 안전 문구<br/>stage=output"])
    G2 -. snippet 제거 .-> TR(["답변 계속<br/>stage=tool_result"])
```

---

## 4. 채팅 요청 흐름 (POST /query)

```mermaid
sequenceDiagram
    autonumber
    actor U as 사용자
    participant FE as Frontend
    participant BE as Backend
    participant AG as Agent Server
    participant SUP as supervisor
    participant SA as 전문 Agent
    participant DB as Chroma
    participant LLM as Bedrock

    U->>FE: 질문 입력
    FE->>BE: POST /api/chat {question, petId, threadId?}
    BE->>BE: JWT 확인 → user_id, pet 소유권 확인
    BE->>AG: POST /query {question, user_id, pet_id, thread_id} + AGENT_API_KEY
    AG->>AG: ① 입력 검증 · PII 마스킹 · 주입 탐지
    alt 대기 중인 HITL interrupt가 있음
        AG->>AG: 자동 reject로 재개해 정리
    end
    AG->>SUP: invoke (checkpointer thread_id)
    SUP->>LLM: 라우팅 판단
    SUP->>SA: handoff
    SA->>DB: 도구 호출 (user_id 강제 필터)
    DB-->>SA: 프로필 · 카탈로그 후보 · 지식 청크
    SA->>LLM: 답변 생성 (카탈로그 항목만)
    SA-->>SUP: 결과
    SUP-->>AG: 최종 메시지
    AG->>AG: ④ 출력 검사 · PII 마스킹 · trace 변환
    AG-->>BE: {answer, contexts, trace}
    BE->>DB: chat_logs 저장 (마스킹된 값)
    BE-->>FE: 응답
    FE-->>U: 답변 + [근거 보기]

    Note over BE,AG: Agent Server 장애 시 /api/chat은 503,<br/>할 일·일정 조회는 정상
```

---

## 5. HITL 승인 흐름

```mermaid
sequenceDiagram
    autonumber
    actor U as 사용자
    participant FE as Frontend
    participant BE as Backend
    participant AG as Agent Server
    participant HE as health_agent
    participant CP as SqliteSaver
    participant DB as Chroma

    U->>FE: "호두 치과 검진 12월 15일로 등록해줘"
    FE->>BE: POST /api/chat
    BE->>AG: POST /query
    AG->>HE: handoff
    HE->>HE: create_health_event 호출 시도
    HE->>CP: interrupt 상태 저장
    AG-->>BE: answer "승인해 주세요"<br/>trace {type: interrupt, tool, args, thread_id}
    BE-->>FE: 승인 카드 표시

    alt 승인 / 수정
        U->>FE: [승인] 또는 [날짜 수정]
        FE->>BE: POST /api/chat/resume {threadId, decisions}
        BE->>AG: POST /query/resume {user_id, thread_id, decisions}
        AG->>AG: thread 소유자 확인 (다르면 403)
        AG->>CP: Command(resume=decisions)
        HE->>DB: health_events 저장
        AG-->>FE: {answer "등록했어요", contexts, trace}
    else 거절
        U->>FE: [거절]
        FE->>BE: resume {type: reject}
        AG-->>FE: "등록하지 않았어요" (DB 변경 없음)
    else 대기 중 새 메시지 / 반려동물 전환
        U->>FE: 다른 질문 또는 탭 전환
        AG->>CP: reject("사용자가 다른 요청을 함")로 정리
        AG-->>FE: "이전 요청은 취소했어요" + 새 답변
    end

    Note over CP: 서버 재시작 후에도 대기 상태 유지
```

---

## 6. 오늘의 할 일 자동 생성·교체

```mermaid
sequenceDiagram
    autonumber
    actor U as 사용자
    participant FE as Frontend
    participant BE as Backend
    participant AG as Agent Server
    participant P as generate_daily_plan
    participant DB as Chroma

    U->>FE: 대시보드 진입
    FE->>BE: GET /api/pets/:id/tasks?date=오늘(KST)
    BE->>DB: 오늘 tasks 조회
    alt 오늘 목록 없음
        BE->>AG: POST /tasks/generate {user_id, pet_id, date}
        AG->>P: LLM 없이 실행
        P->>DB: 프로필 · 취향 · 카탈로그 · 7일 이내 건강 일정
        P-->>AG: tasks[] (catalog_item_id, time, rank, relaxed)
        AG-->>BE: 구조화 결과 (p95 1초 이내)
        BE->>DB: tasks 저장 (source=auto)
    end
    BE-->>FE: 할 일 목록 (시간순)

    U->>FE: 항목 [바꾸기]
    FE->>BE: POST /api/tasks/:taskId/swap
    BE->>AG: POST /tasks/generate {category, exclude_item_ids, limit: 1}
    AG-->>BE: 대체 항목 1개 (없으면 빈 목록)
    BE->>DB: 교체 저장 + interactions(swap)

    U->>FE: [할 일 다시 제안] → 확인
    FE->>BE: POST /api/pets/:id/tasks/generate {confirm: true}
    BE->>AG: POST /tasks/generate {keep_item_ids: 완료·직접 추가}
    AG-->>BE: 새 목록
    BE->>DB: 미완료 제안 항목만 교체
```

---

## 7. 추천·개인화 파이프라인

```mermaid
flowchart TB
    REQ(["추천 요청<br/>채팅 recommend_from_catalog<br/>또는 /tasks/generate"]) --> F1

    F1["① 후보 필터 (metadata where)<br/>recommendable · 종 · 연령대 · 강도<br/>알레르기 · 질환 금기 · 👎 7일 · 제약"]
    F1 --> F2["② 의미 검색 (similarity)<br/>상위 20개<br/>※ 할 일 생성은 기본 쿼리"]
    F2 --> F3["③ 취향 점수<br/>유사도 + Σ 신호 가중치 × 시간 감쇠(반감기 30일)<br/>− 최근 반복 패널티"]
    F3 --> F3B["④ 단골 보장<br/>3회 이상 완료 항목을 상위 3개 안으로"]
    F3B --> F4["④' 다양성<br/>단골이 아닌 1개를 최근 14일 미추천 항목으로"]
    F4 --> CHK{영역별 최소 개수 충족?}

    CHK -->|예| F5
    CHK -->|아니오| RLX

    subgraph RLX["단계적 완화 (안전 필터는 끝까지 유지)"]
        direction TB
        X1["1 다양성 슬롯 생략"] --> X2["2 반복 패널티 해제"]
        X2 --> X3["3 👎 제외 해제<br/>relaxed: dislike 배지"]
        X3 --> X4["4 시간대 제약(constraint) 해제<br/>안내 문구"]
    end
    RLX --> F5

    F5["⑤ LLM 설명 (채팅일 때만)<br/>선택된 항목만 근거로"] --> F6["⑥ output_guard<br/>답변 속 item_id가 카탈로그에 있는지 검증"]
    F6 --> RES(["추천 결과 + rank"])

    subgraph Signals["취향 신호 (Backend가 interactions에 기록)"]
        S1["👍 +3"]
        S2["👎 7일 제외 → 이후 −3"]
        S3["완료 +1 (3회 이상 단골 → 상위 3개 보장)"]
        S4["바꾸기·삭제 −1"]
        S5["직접 추가 +2"]
        S6["대화 진술 remember_preference"]
    end
    Signals -.-> F3
    Signals -.-> F1
```

---

## 8. 데이터 모델 (Chroma 컬렉션)

엔터티·필드·관계는 [ERD.md](ERD.md)에서 관리한다 (두 곳에 그리면 어긋나므로 이 문서에는 다시 그리지 않는다). 제약 조건은 [schema.md](../database/schema.md)를 참조한다.

- 앱 데이터: `users`, `pets`, `tasks`, `health_events`, `weight_logs`, `interactions`, `preferences`, `chat_logs`
- 카탈로그: `catalog_activity` / `catalog_diet` / `catalog_health` · RAG 지식: `pet_knowledge` · 체크포인트: SQLite `data/checkpoints/`
- 연쇄 삭제 순서: tasks → health_events → weight_logs → interactions → preferences → chat_logs + checkpoint → pets (→ users)

---

## 9. 건강 일정 상태 변화

```mermaid
stateDiagram-v2
    [*] --> scheduled: 프로필 등록 시 기본 일정 생성<br/>또는 HITL 승인 후 생성
    [*] --> needs_history: 이력 없이 권장 시점이 이미 지남

    needs_history --> scheduled: 이력·날짜 입력<br/>PATCH /api/health-events/:id
    scheduled --> scheduled: 날짜 변경 (HITL 승인 또는 화면 수정)
    scheduled --> overdue: due_date < 오늘(KST)<br/>매일 00:05 · 서버 시작 시 갱신
    scheduled --> done: 완료 처리 (completed_date)
    overdue --> done: 늦게 완료

    done --> [*]
    done --> scheduled: 다음 회차·주기 자동 생성<br/>(완료일 기준)

    note right of scheduled
        알림: D-7 · D-1 · 당일 · 지연(overdue)
        할 일: 7일 이내(D-7 포함) 전부
    end note
```

---

## 10. 카탈로그 구축 파이프라인

```mermaid
flowchart LR
    Q["질의 설계<br/>종 × 영역 × 연령대"] --> S["웹 검색·출처 선별<br/>수의 단체 · 대학 · 정부"]
    S --> J["JSON 초안 작성<br/>data/catalog/*.json<br/>reviewed: false"]
    S --> SRC["출처 기록<br/>data/sources/*.md"]
    J --> V{"검증 스크립트<br/>스키마 · ID 중복 · 출처<br/>규모 10~15 · 최소 구성"}
    V -->|오류| J
    V -->|통과| R["사람 검수<br/>review_notes 수치를 원문과 대조"]
    R -->|수정 필요| J
    R -->|확인| OK["reviewed: true"]
    OK --> ING["ingest<br/>python -m src.retriever --ingest"]
    ING --> C[("Chroma<br/>catalog_activity / diet / health")]

    WEBRT["서비스 중 general_agent 웹 검색 결과"] -. 자동 추가 금지 .-x J
```

---

## 11. 평가 흐름

```mermaid
flowchart TB
    CSV[("evaluation/test_queries.csv<br/>50문항 · 14개 카테고리")] --> LOOP

    subgraph LOOP["문항마다"]
        direction TB
        R1["seed:reset<br/>--variant · TODAY_OVERRIDE"] --> R2{"문항 유형"}
        R2 -->|질문| R3["POST /query<br/>EVAL_MODE · WEB_SEARCH_MOCK"]
        R2 -->|"API 호출 케이스<br/>isolation 등"| R4["Backend / Agent API 직접 호출"]
        R3 --> R5["answer · contexts · trace 수집"]
        R4 --> R5
    end

    R5 --> J1["규칙 기반 판정 우선<br/>라우팅(trace handoff) · expected_keywords<br/>must_not_recommend(item_id) · must_not_include<br/>interrupt · guardrail stage · PII 잔존"]
    J1 --> J2["LLM-as-judge<br/>같은 Bedrock 모델<br/>충실도·관련성 1~5 (평균 4.0 이상)"]
    J2 --> REP["evaluation/report_YYYYMMDD.md<br/>카테고리별 합격선 · p95 응답 시간<br/>자기 편향 · 작은 표본 한계 명시"]
```
