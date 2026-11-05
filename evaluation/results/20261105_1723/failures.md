# 무효 실행 — 5차 `20261105_1723` (`--repeat-failed 2`)

**리포트 수치로 쓰지 않는다.** 실행 실패 22건 — 품질 판정이 아니라 실행 환경 문제다.

- 원인 ① 실행 시작부터 Bedrock 주 모델 `ThrottlingException` (Agent 로그 183건, 일시적 — 직후 단건 호출은 정상)
- 원인 ② 예비 모델 ID가 `.env`에서 `us.anthropic.claude-sonnet-4-6`로 바뀌어 있었고, 이 리전(ap-northeast-2)에서는 `ValidationException`("model identifier is invalid", 76건)이라 폴백도 실패 → 503
- 조치: `.env`(커밋 안 함)의 `AWS_FALLBACK_MODEL`을 직접 호출로 확인한 `global.anthropic.claude-sonnet-4-6`로 되돌리고 Agent(:8020/:8010) 재시작 후 다시 실행
- 실행된 문항의 응답 자체에서는 PII 잔존 0, 카탈로그 준수율 100%
