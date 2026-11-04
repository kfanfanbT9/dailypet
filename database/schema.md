# schema.md — DailyPet DDL

[doc/ERD.md](../doc/ERD.md)를 관계형 테이블로 옮긴 DDL이다.

> **이 DDL의 위치** — Version 1의 실제 저장소는 **Chroma**다 (CLAUDE.md 4.2). 이 문서는 다음 용도로 쓰는 **논리 스키마 기준본**이다.
> - 백엔드가 코드로 보장해야 하는 제약(유일성, 참조 무결성, 값 범위, 연쇄 삭제)을 한곳에 명시한다.
> - 시드·평가 데이터 검증, 나중에 RDB로 옮길 때의 출발점으로 쓴다.
>
> 데이터 모델이 바뀌면 ARCHITECTURE.md 5장 → ERD.md → 이 문서 순서로 고친다.

- **방언**: SQLite 3 (로컬 데모 환경. LangGraph 체크포인터도 SQLite를 씀). `PRAGMA foreign_keys = ON` 필요.
- **날짜**: `YYYY-MM-DD` 문자열(KST), 시각은 ISO 8601 문자열. `CHECK (date(x) IS x)`로 형식을 검증한다 (`=`를 쓰면 잘못된 형식일 때 결과가 NULL이 되어 통과하므로 `IS`를 쓴다).
- **리스트 필드**: 필터에 쓰는 종·연령대는 불리언 플래그 컬럼으로 펼친다 (ARCHITECTURE.md 3.5와 같은 방식). 나머지 리스트는 JSON 텍스트(`json_valid` 검사)로 둔다.
- **사용자 격리**: 하위 테이블은 `(pet_id, user_id)` 복합 FK로 `pets`를 참조해, 다른 사용자의 반려동물에 데이터를 붙일 수 없게 한다.
- **연쇄 삭제**: `ON DELETE CASCADE`로 ARCHITECTURE.md 5장의 삭제 범위를 표현한다. Chroma에서는 백엔드가 같은 범위를 순서대로 지운다.

---

## 1. 카탈로그

ERD의 `CATALOG_ACTIVITY` / `CATALOG_DIET` / `CATALOG_HEALTH`는 공통 속성을 `catalog_items`(상위 테이블)에 두고, 영역별 속성을 하위 테이블로 나눈다. 이렇게 해야 `tasks`·`interactions`가 영역에 상관없이 하나의 FK로 카탈로그를 참조할 수 있다.

```sql
PRAGMA foreign_keys = ON;

-- 카탈로그 공통 (reviewed = 1 인 항목만 적재)
CREATE TABLE catalog_items (
    item_id            TEXT    PRIMARY KEY,
    category           TEXT    NOT NULL CHECK (category IN ('activity', 'diet', 'health')),
    name               TEXT    NOT NULL,
    description        TEXT    NOT NULL DEFAULT '',
    species_dog        INTEGER NOT NULL DEFAULT 0 CHECK (species_dog IN (0, 1)),
    species_cat        INTEGER NOT NULL DEFAULT 0 CHECK (species_cat IN (0, 1)),
    age_junior         INTEGER NOT NULL DEFAULT 0 CHECK (age_junior IN (0, 1)),
    age_adult          INTEGER NOT NULL DEFAULT 0 CHECK (age_adult IN (0, 1)),
    age_senior         INTEGER NOT NULL DEFAULT 0 CHECK (age_senior IN (0, 1)),
    cautions           TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(cautions)),
    contraindications  TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(contraindications)),  -- 질환 태그
    tags               TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(tags)),
    recommendable      INTEGER NOT NULL DEFAULT 1 CHECK (recommendable IN (0, 1)),
    reviewed           INTEGER NOT NULL CHECK (reviewed = 1),          -- 검수 안 된 항목은 적재 금지
    review_notes       TEXT    NOT NULL DEFAULT '',
    CHECK (species_dog = 1 OR species_cat = 1),
    CHECK (age_junior = 1 OR age_adult = 1 OR age_senior = 1),
    CHECK (item_id LIKE CASE category
                          WHEN 'activity' THEN 'act\_%'
                          WHEN 'diet'     THEN 'diet\_%'
                          ELSE                 'hc\_%' END ESCAPE '\'),
    UNIQUE (item_id, category)                                          -- tasks 복합 FK 대상
);

-- 카탈로그 출처 (항목당 1개 이상 필요 — 적재 스크립트에서 검사)
CREATE TABLE catalog_sources (
    item_id    TEXT NOT NULL REFERENCES catalog_items (item_id) ON DELETE CASCADE,
    seq        INTEGER NOT NULL,
    title      TEXT NOT NULL,
    publisher  TEXT NOT NULL,
    url        TEXT NOT NULL CHECK (url LIKE 'http%'),
    accessed   TEXT NOT NULL CHECK (date(accessed) IS accessed),
    PRIMARY KEY (item_id, seq)
);

-- 운동·놀이
CREATE TABLE catalog_activity (
    item_id       TEXT    PRIMARY KEY,
    category      TEXT    NOT NULL DEFAULT 'activity' CHECK (category = 'activity'),
    intensity     TEXT    NOT NULL CHECK (intensity IN ('low', 'medium', 'high')),
    duration_min  INTEGER CHECK (duration_min > 0),
    duration_max  INTEGER CHECK (duration_max >= duration_min),
    frequency     TEXT    NOT NULL DEFAULT '',
    FOREIGN KEY (item_id, category) REFERENCES catalog_items (item_id, category) ON DELETE CASCADE
);

-- 식단 (harmful_food 는 정보 제공용 → recommendable = 0)
CREATE TABLE catalog_diet (
    item_id        TEXT PRIMARY KEY,
    category       TEXT NOT NULL DEFAULT 'diet' CHECK (category = 'diet'),
    subtype        TEXT NOT NULL CHECK (subtype IN ('feeding_guide', 'treat', 'topping', 'hydration',
                                                    'weight_management', 'harmful_food')),
    serving_guide  TEXT NOT NULL DEFAULT '',
    kcal_note      TEXT NOT NULL DEFAULT '',
    allergens      TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(allergens)),
    FOREIGN KEY (item_id, category) REFERENCES catalog_items (item_id, category) ON DELETE CASCADE
);

-- 정기 건강관리 (접종·검진·구충 등)
CREATE TABLE catalog_health (
    item_id                TEXT    PRIMARY KEY,
    category               TEXT    NOT NULL DEFAULT 'health' CHECK (category = 'health'),
    type                   TEXT    NOT NULL CHECK (type IN ('vaccine', 'checkup', 'deworming', 'heartworm',
                                                            'external_parasite', 'dental', 'other')),
    core                   INTEGER CHECK (core IN (0, 1)),
    legal_required_kr      INTEGER CHECK (legal_required_kr IN (0, 1)),
    dose_schedule          TEXT    CHECK (dose_schedule IS NULL OR json_valid(dose_schedule)),
                                   -- [{dose_no, at_age_weeks | after_prev_weeks}, ...]
    booster_interval_days  INTEGER CHECK (booster_interval_days > 0),
    interval_days          INTEGER CHECK (interval_days > 0),
    start_age_weeks        INTEGER CHECK (start_age_weeks >= 0),
    FOREIGN KEY (item_id, category) REFERENCES catalog_items (item_id, category) ON DELETE CASCADE
);

-- 추천 후보 필터용 인덱스 (recommendable · 종 · 연령)
CREATE INDEX idx_catalog_filter
    ON catalog_items (category, recommendable, species_dog, species_cat);
```

## 2. 계정·반려동물

```sql
-- 계정 (Backend만 접근). id = 'usr_' + sha256(소문자 이메일) 앞 12자리
CREATE TABLE users (
    id             TEXT PRIMARY KEY CHECK (id LIKE 'usr\_%' ESCAPE '\' AND length(id) = 16),
    email          TEXT NOT NULL UNIQUE CHECK (email = lower(email)),
    password_hash  TEXT NOT NULL,                                       -- 비밀번호 원문 저장 금지
    nickname       TEXT NOT NULL,
    created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+09:00', 'now', '+9 hours'))
);

-- 반려동물 (개·고양이만)
CREATE TABLE pets (
    id              TEXT    PRIMARY KEY CHECK (id LIKE 'pet\_%' ESCAPE '\'),
    user_id         TEXT    NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name            TEXT    NOT NULL,
    species         TEXT    NOT NULL CHECK (species IN ('dog', 'cat')),
    breed           TEXT    NOT NULL DEFAULT '',
    sex             TEXT    CHECK (sex IN ('male', 'female')),
    neutered        INTEGER NOT NULL DEFAULT 0 CHECK (neutered IN (0, 1)),
    size            TEXT    CHECK (size IN ('small', 'medium', 'large')),  -- 대형견 시니어 판정(6세)에 사용
    birth_date      TEXT    NOT NULL CHECK (date(birth_date) IS birth_date),
    weight_kg       REAL,                                               -- 최신 체중 기록 (아래 CHECK)
    activity_level  TEXT    CHECK (activity_level IN ('low', 'normal', 'high')),
    allergies       TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(allergies)),   -- 예: ["chicken"]
    conditions      TEXT    NOT NULL DEFAULT '[]' CHECK (json_valid(conditions)),  -- 예: ["joint_disease"]
    memo            TEXT    NOT NULL DEFAULT '',
    default_times   TEXT    NOT NULL DEFAULT '{}' CHECK (json_valid(default_times)), -- 급여·산책 시간대
    created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+09:00', 'now', '+9 hours')),
    -- 체중 허용 범위 (SERVICE F12): 개 0.5~100kg, 고양이 0.3~15kg
    CHECK (weight_kg IS NULL
           OR (species = 'dog' AND weight_kg BETWEEN 0.5 AND 100)
           OR (species = 'cat' AND weight_kg BETWEEN 0.3 AND 15)),
    UNIQUE (id, user_id)                                                -- 하위 테이블 소유권 복합 FK 대상
);

CREATE INDEX idx_pets_user ON pets (user_id, created_at);              -- 등록 순서 = 목록 순서
```

## 3. 건강 일정·할 일·체중

```sql
-- 건강 일정
CREATE TABLE health_events (
    id               TEXT    PRIMARY KEY CHECK (id LIKE 'evt\_%' ESCAPE '\'),
    user_id          TEXT    NOT NULL,
    pet_id           TEXT    NOT NULL,
    catalog_item_id  TEXT    NOT NULL REFERENCES catalog_health (item_id),
    type             TEXT    NOT NULL CHECK (type IN ('vaccine', 'checkup', 'deworming', 'heartworm',
                                                      'external_parasite', 'dental', 'other')),
    dose_no          INTEGER CHECK (dose_no >= 1),
    due_date         TEXT    NOT NULL CHECK (date(due_date) IS due_date),
    due_ts           INTEGER NOT NULL,                                  -- 비교용 epoch (KST 자정)
    status           TEXT    NOT NULL DEFAULT 'scheduled'
                             CHECK (status IN ('scheduled', 'done', 'overdue', 'needs_history')),
    completed_date   TEXT    CHECK (date(completed_date) IS completed_date),
    CHECK ((status = 'done') = (completed_date IS NOT NULL)),           -- 완료일은 done일 때만
    FOREIGN KEY (pet_id, user_id) REFERENCES pets (id, user_id) ON DELETE CASCADE
);

CREATE INDEX idx_health_events_due ON health_events (user_id, pet_id, status, due_date);

-- 오늘의 할 일
CREATE TABLE tasks (
    id               TEXT    PRIMARY KEY CHECK (id LIKE 'task\_%' ESCAPE '\'),
    user_id          TEXT    NOT NULL,
    pet_id           TEXT    NOT NULL,
    date             TEXT    NOT NULL CHECK (date(date) IS date),
    time             TEXT    CHECK (time IS NULL OR time GLOB '[0-2][0-9]:[0-5][0-9]'),
    category         TEXT    NOT NULL CHECK (category IN ('diet', 'activity', 'health', 'custom')),
    source           TEXT    NOT NULL CHECK (source IN ('auto', 'chat', 'custom')),
    catalog_item_id  TEXT,
    health_event_id  TEXT    REFERENCES health_events (id) ON DELETE CASCADE,
    title            TEXT    NOT NULL,
    done             INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1)),
    -- 영역별 참조 규칙: diet/activity → 카탈로그, health → 건강 일정, custom → 참조 없음
    CHECK (
        (category IN ('diet', 'activity') AND catalog_item_id IS NOT NULL AND health_event_id IS NULL) OR
        (category = 'health'             AND health_event_id IS NOT NULL AND catalog_item_id IS NULL) OR
        (category = 'custom'             AND catalog_item_id IS NULL     AND health_event_id IS NULL)
    ),
    CHECK (category <> 'custom' OR source = 'custom'),
    FOREIGN KEY (pet_id, user_id) REFERENCES pets (id, user_id) ON DELETE CASCADE,
    -- 할 일 영역과 카탈로그 영역이 같아야 함 (diet 할 일에 activity 항목 금지)
    FOREIGN KEY (catalog_item_id, category) REFERENCES catalog_items (item_id, category)
);

CREATE INDEX idx_tasks_day ON tasks (user_id, pet_id, date);

-- 체중 기록 (하루 1건)
CREATE TABLE weight_logs (
    id         TEXT PRIMARY KEY CHECK (id LIKE 'wt\_%' ESCAPE '\'),
    user_id    TEXT NOT NULL,
    pet_id     TEXT NOT NULL,
    date       TEXT NOT NULL CHECK (date(date) IS date),
    weight_kg  REAL NOT NULL CHECK (weight_kg BETWEEN 0.3 AND 100),     -- 종별 범위는 백엔드가 검사 (6장)
    UNIQUE (pet_id, date),
    FOREIGN KEY (pet_id, user_id) REFERENCES pets (id, user_id) ON DELETE CASCADE
);
```

## 4. 취향·대화

```sql
-- 취향 신호 원본
CREATE TABLE interactions (
    id               TEXT PRIMARY KEY CHECK (id LIKE 'int\_%' ESCAPE '\'),
    user_id          TEXT NOT NULL,
    pet_id           TEXT NOT NULL,
    catalog_item_id  TEXT REFERENCES catalog_items (item_id),           -- custom 신호면 NULL 가능
    signal           TEXT NOT NULL CHECK (signal IN ('like', 'dislike', 'complete',
                                                     'swap', 'remove', 'custom')),
    created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+09:00', 'now', '+9 hours')),
    CHECK (signal = 'custom' OR catalog_item_id IS NOT NULL),
    FOREIGN KEY (pet_id, user_id) REFERENCES pets (id, user_id) ON DELETE CASCADE
);

CREATE INDEX idx_interactions_pet ON interactions (user_id, pet_id, catalog_item_id, signal);

-- 취향 요약 (추천 점수에 사용). pet_id 가 NULL 이면 사용자 공통 취향
CREATE TABLE preferences (
    id              TEXT PRIMARY KEY CHECK (id LIKE 'pref\_%' ESCAPE '\'),
    user_id         TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    pet_id          TEXT,
    kind            TEXT NOT NULL CHECK (kind IN ('like', 'dislike', 'constraint')),
    target          TEXT NOT NULL,                                      -- 카탈로그 item_id 또는 자유 텍스트
    note            TEXT NOT NULL DEFAULT '',
    score           REAL NOT NULL DEFAULT 0,
    excluded_until  TEXT CHECK (date(excluded_until) IS excluded_until),
    updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+09:00', 'now', '+9 hours')),
    CHECK (excluded_until IS NULL OR kind = 'dislike'),                 -- 제외 기한은 dislike 전용
    FOREIGN KEY (pet_id, user_id) REFERENCES pets (id, user_id) ON DELETE CASCADE
);

-- 같은 범위(사용자 공통 / 반려동물별)에서 같은 대상의 같은 종류 취향은 하나만
CREATE UNIQUE INDEX ux_preferences_target
    ON preferences (user_id, ifnull(pet_id, ''), kind, target);

-- 대화 기록 (PII 마스킹된 값만 저장). thread_id 는 user_id 에 묶인다
CREATE TABLE chat_logs (
    id          TEXT PRIMARY KEY CHECK (id LIKE 'log\_%' ESCAPE '\'),
    user_id     TEXT NOT NULL,
    pet_id      TEXT NOT NULL,
    thread_id   TEXT NOT NULL CHECK (thread_id LIKE 'thr\_' || user_id || '\_%' ESCAPE '\'),
    question    TEXT NOT NULL,                                          -- 마스킹된 값
    answer      TEXT NOT NULL,                                          -- 마스킹된 값
    trace       TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(trace)),   -- 마스킹된 값
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%S+09:00', 'now', '+9 hours')),
    FOREIGN KEY (pet_id, user_id) REFERENCES pets (id, user_id) ON DELETE CASCADE
);

CREATE INDEX idx_chat_logs_thread ON chat_logs (thread_id, user_id, created_at);
```

## 5. RAG 지식

실제로는 임베딩이 필요해 Chroma `pet_knowledge` 컬렉션에만 둔다. 아래는 메타데이터 구조를 맞춰 두기 위한 참고용 정의다.

```sql
CREATE TABLE pet_knowledge (
    id        TEXT PRIMARY KEY,                                         -- 적재 시 자동 생성
    source    TEXT NOT NULL,
    species   TEXT CHECK (species IN ('dog', 'cat', 'all')),
    category  TEXT CHECK (category IN ('activity', 'diet', 'health', 'general')),
    document  TEXT NOT NULL                                             -- 지식 청크 본문
);
```

---

## 6. 이 DDL로 표현하지 않는 것

| 항목 | 이유 / 처리 위치 |
|------|------------------|
| LangGraph 체크포인트 | `SqliteSaver`가 `data/checkpoints/`에 자체 스키마로 만든다. 여기서 정의하지 않는다. 반려동물을 삭제할 때 해당 `thread_id`의 체크포인트는 백엔드가 따로 지운다. |
| thread 소유자 일관성 | 같은 `thread_id`의 모든 행이 같은 `user_id`인지는 `CHECK`(접두사 검사)로 일부만 보장한다. resume·기록 조회 때 백엔드·Agent가 소유자를 확인한다. |
| 카탈로그 출처 1개 이상 | 테이블 간 개수 제약이라 `CHECK`로 표현할 수 없다. 카탈로그 검증 스크립트(ARCHITECTURE.md 7.5)가 확인한다. |
| `preferences.target` 참조 | 카탈로그 ID 또는 자유 텍스트라 FK를 걸지 않는다. |
| 건강 일정 상태 갱신 | `overdue` 전환은 백엔드 `node-cron`(매일 KST 00:05)이 한다. |
| 체중 기록의 종별 범위 | `weight_logs`에는 종이 없어 공통 범위(0.3~100kg)만 검사한다. 종별 범위(개 0.5~100 / 고양이 0.3~15)는 백엔드가 `pets.species`로 검사한다. |
| 연령 구간 판정 | 기준일(KST 오늘, `TODAY_OVERRIDE`)에 따라 바뀌므로 저장하지 않고 조회할 때 `birth_date`로 계산한다. |
