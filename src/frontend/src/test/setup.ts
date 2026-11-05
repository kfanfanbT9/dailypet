import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect } from "vitest";
import * as axeMatchers from "vitest-axe/matchers";
import "vitest-axe/extend-expect";
import { resetMockDb, server } from "@/mocks/server";

expect.extend(axeMatchers);

// jsdom에 없는 브라우저 API
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
window.scrollTo = () => {};
Element.prototype.scrollIntoView = function () {};

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetMockDb();
  try {
    window.localStorage.clear();
  } catch {
    // 무시
  }
  document.documentElement.dataset.motion = "full";
  document.documentElement.dataset.theme = "light";
});
afterAll(() => server.close());
