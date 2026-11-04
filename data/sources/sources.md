# 카탈로그 출처 목록 (인덱스)

초기 카탈로그(`data/catalog/`)를 만들 때 쓴 웹 검색 질의와 출처는 영역별 파일에 정리되어 있다.

| 영역 | 카탈로그 | 출처·검색 질의 | 항목 수 (개 / 고양이) |
|------|----------|----------------|------------------------|
| 활동 | `catalog/activities.json` | [sources_activity.md](sources_activity.md) | 14 / 14 |
| 식단 | `catalog/diets.json` | [sources_diet.md](sources_diet.md) | 추천 15 + 유해 10 / 추천 15 + 유해 10 |
| 정기점검 | `catalog/health_checks.json` | [sources_health.md](sources_health.md) | 15 / 14 |

- 작성일: 2026-11-04 (Claude 웹 검색 초안)
- 상태: **검수 완료 (2026-11-04)** — 107개 항목 모두 사람 검수를 마치고 `reviewed: true`로 바꿨다 (CLAUDE.md 4.5.1)
- 검수 방법: 각 항목의 `review_notes`에 적힌 수치를 출처 원문과 대조 → 수정 → `reviewed: true`
- 출처 확인 수준(원문 열람 / 검색 결과 요약만)은 영역별 파일에 표시되어 있다.
