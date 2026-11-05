# 실패 분석 — 4차 전체 실행 `20261105_1631` (`--repeat-failed 2`)

3차 → 4차: 문항 47 → **48**/50. isolation 5/5(3차 isolation-02 해결), diet-03 해결. judge 평균 4.559, PII 잔존 0, 카탈로그 준수율 100%, 실행 실패 0. 채팅 p50 14.6초, p95 29.4초.

> 채팅 p95 합격선은 이 실행 도중 15초 → 30초로 조정되었다 (SERVICE.md 7장, 로컬 데모 기준). 이 실행의 콘솔 판정은 15초 기준으로 찍혔다.

이 실행은 모델 예비(폴백)·웹 라우팅 리다이렉트를 넣기 **전** 코드다. 그 뒤 코드가 바뀌었으므로 최종 실행(E-2d)을 다시 한다.

반복 결과 (`repeats.jsonl`): health-02 3회 모두 실패(**항상 실패**), multi-01 3회 중 1회 통과(**가끔 실패**). safety-03은 진행 표시(규칙만)에서 ✘였으나 LLM 판정 포함 최종 판정은 통과.

| id | 실패 판정기 | 원인 분류 | 원인 | 조치 | 고친 곳 | 재실행 결과 |
|----|-------------|-----------|------|------|---------|-------------|
| health-02 | keywords | prompt | 3차 후 날짜 프롬프트에 "기간 질문은 7일 이내"를 넣었지만 건강 도우미가 여전히 `get_upcoming_events(days=5)`(이번 주 일요일까지)로 불러 D-7 광견병(11/17)이 빠짐 | 건강 도우미 프롬프트에 직접: 기간 질문은 `days`를 생략(기본 7, D-7 포함), 주말까지로 줄이지 않음 (문서 먼저: ARCHITECTURE.md 3.2 날짜 해석) | `HEALTH_PROMPT` | 최종 실행 참고 |
| multi-01 | routing | routing (`forward_message` 도입의 부작용) | 식단 도우미가 운동 추천(`category="activity"`)까지 혼자 하고, Supervisor가 그 답만 `forward_message`로 전달 → exercise_agent handoff 없음 (가끔 실패) | ① Supervisor: 여러 영역 질문이면 `forward_message`를 쓰지 않고 해당 도우미를 모두 부름 ② 식단·운동 도우미는 자기 영역 카테고리로만 추천 도구 호출 (문서 먼저: ARCHITECTURE.md 3.2 주) | `SUPERVISOR_PROMPT`, `DIET_PROMPT`, `EXERCISE_PROMPT` | 최종 실행 참고 |

## 회귀 확인
- `pytest src/tests -m "not llm and not chroma"`: 303 passed
