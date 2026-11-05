import { defineConfig } from "vitest/config";

// 기본 5초 타임아웃은 병렬 워커에서 bcrypt 로그인을 여러 번 하는 테스트가 부하를 받을 때 모자랄 수 있다
// (2026-11-05 Prettier 직후 실행에서 1회 2건 실패, 이후 15회 연속 통과로 재현 안 됨). 여유를 둔다.
export default defineConfig({
  test: {
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});
