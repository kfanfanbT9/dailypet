# data/seed — 데모·평가용 시드 데이터

[doc/USER_SCENARIO.md](../../doc/USER_SCENARIO.md) 2장의 시드 정의를 컬렉션별 JSON으로 옮긴 것이다. 필드 이름과 값 범위는 [database/schema.md](../../database/schema.md)를 따른다.

## 적재

```bash
cd src/backend && npm run seed:reset                      # 기본 시드
cd src/backend && npm run seed:reset -- --variant <이름>   # 변형 시드
```

- 앱 데이터 컬렉션과 `data/checkpoints/`를 비운 뒤 아래 JSON을 적재한다. 카탈로그·지식 컬렉션은 건드리지 않는다.
- checkpoint는 **파일을 지우지 않고 `checkpoints`·`writes` 테이블을 비운다**. Agent 서버가 SQLite 파일을 열어 둔 상태에서도 연결이 깨지지 않게 하기 위해서다 (`busy_timeout` 3초). `CHECKPOINT_PATH`가 `data/checkpoints/` 밖이면 거부한다.
- 적재 전에 모든 행을 `database/schema.md` 제약으로 검증하고, 하나라도 틀리면 아무것도 쓰지 않는다.
- 적재 직후 `overdue` 갱신을 한 번 실행한다 (`TODAY_OVERRIDE` 기준 결과를 결정적으로 만들기 위해).
- 변형 시드는 기본 시드를 적재한 다음에 적용한다.

## 파일

| 파일 | 내용 |
|------|------|
| `users.json` | 사용자 6명 (P1~P4, 공격자, 삭제 전용) |
| `pets.json` | 반려동물 7마리. 사용자별 등록 순서는 `created_at` 순서 |
| `health_events.json` | 건강 일정 |
| `tasks.json` | 지난 할 일 기록 |
| `weight_logs.json` | 체중 기록 (보리 2건, 코코 1건) |
| `interactions.json` | 취향 신호 원본 |
| `preferences.json` | 취향 요약 (모카 👎 낚싯대 놀이, 박서준 공통 제약 "19:00 이후", 코코 좋아요) |
| `chat_logs.json` | 대화 기록 (코코 1건, PII 없음) |
| `variants/*.json` | 변형 시드 (2.4) |

**건강 일정**
- 2.3의 활성 일정 5건이 들어 있다.
- 다음 회차를 계산하는 근거가 되는 완료 이력 3건(`status: done`)도 넣었다: 콩이 DHPP 1·2차, 호두의 지난 노령 검진.
- S20 삭제용으로 코코 일정 1건이 있다.

**지난 할 일**
- 보리 3일치(11/03·11/05·11/08)가 있다. 노즈워크 완료 3회와 최근 14일 추천 이력이 들어 있어 다양성 판정에 쓴다.
- 모카(11/08)와 코코(11/09)의 기록도 있다.
- 기준일(11/10) 목록은 대시보드에 들어갈 때 자동으로 만들어지므로 시드에 넣지 않았다.

## 변형 시드 형식

```json
{ "name": "...", "description": "...", "used_by": ["S07"],
  "update": { "<컬렉션>": [ { "id": "...", "<필드>": "<새 값>" } ] },
  "add":    { "<컬렉션>": [ { ...행 전체... } ] },
  "delete": { "<컬렉션>": [ "<id>" ] },
  "setup_queries": [ { "user_id": "...", "pet_id": "...", "thread_id": "...", "question": "..." } ] }
```

| 이름 | 내용 |
|------|------|
| `mocha_joint` | 모카에 `joint_disease`를 추가한다 |
| `hodu_dislikes` | 호두가 11/09에 노령묘 활동 9개에 👎를 표시한 상태로 만든다. 질환 금기가 아닌 노령묘 활동은 `act_cat_scratching_stretch_01` 하나만 남는다 |
| `bori_pending_hitl` | 보리 thread에 승인 대기 요청 1건이 있는 상태로 만든다 |

`bori_pending_hitl`의 승인 대기(interrupt) 상태는 LangGraph checkpoint에 저장되므로 JSON으로 만들 수 없다. 그래서 `seed:reset`이 `setup_queries`를 Agent `POST /query`로 실행해 만든다. 이 변형을 쓰려면 Agent 서버가 떠 있어야 한다.

## 규칙

- 비밀번호는 bcrypt 해시(`$2b$`)만 저장한다. 데모 비밀번호는 USER_SCENARIO.md 1.1에만 적는다.
- 이메일은 `@demo.dailypet` 도메인만 쓰고, 실제 개인정보를 넣지 않는다.
- `user_id`는 `usr_` + sha256(소문자 이메일) 앞 12자리다.
- 참조하는 카탈로그 ID는 모두 `data/catalog/`에 있어야 한다. 카탈로그 검수로 ID가 바뀌면 이 파일들도 함께 고친다.
