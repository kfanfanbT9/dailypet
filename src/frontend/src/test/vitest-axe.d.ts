// vitest-axe 0.1은 예전 `Vi` 네임스페이스만 확장한다 → Vitest 5의 `vitest` 모듈에 matcher 타입을 붙인다.
import "vitest";

interface AxeMatchers<R = unknown> {
  toHaveNoViolations(): R;
}

declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T = unknown> extends AxeMatchers<T> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
