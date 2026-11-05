// 테마·움직임 줄이기 설정 (Style-guide.md 10장). localStorage에만 두고, 실패하면 기본값(자동).
import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";

export type ThemeSetting = "auto" | "light" | "dark";
const THEME_KEY = "dp.theme";
const MOTION_KEY = "dp.reduceMotion";

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 저장 실패는 무시 (이번 세션에만 적용)
  }
}

/** index.html과 같은 규칙으로 <html data-theme data-motion>에 실제 값을 넣는다 */
export function applySettings(theme: ThemeSetting, reduceMotion: boolean) {
  const root = document.documentElement;
  const mq = (q: string) => (typeof window.matchMedia === "function" ? window.matchMedia(q).matches : false);
  root.dataset.theme = theme === "auto" ? (mq("(prefers-color-scheme: dark)") ? "dark" : "light") : theme;
  root.dataset.motion = reduceMotion || mq("(prefers-reduced-motion: reduce)") ? "reduced" : "full";
}

interface SettingsValue {
  theme: ThemeSetting;
  reduceMotion: boolean;
  /** 실제로 움직임을 줄이는지 (사용자 설정 OR 기기 설정) */
  motionReduced: boolean;
  setTheme: (t: ThemeSetting) => void;
  setReduceMotion: (v: boolean) => void;
}

const SettingsContext = createContext<SettingsValue | null>(null);

/** 미디어 쿼리 구독 (matchMedia가 없으면 false) */
function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const mq = window.matchMedia(query);
      mq.addEventListener?.("change", onChange);
      return () => mq.removeEventListener?.("change", onChange);
    },
    () => (typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false),
    () => false,
  );
}

function readTheme(): ThemeSetting {
  const t = safeGet(THEME_KEY);
  return t === "light" || t === "dark" ? t : "auto";
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeSetting>(readTheme);
  const [reduceMotion, setReduceState] = useState(() => safeGet(MOTION_KEY) === "1");
  const systemReduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)");
  // 첫 렌더부터 실제 값 — 첫 화면 모달이 움직이지 않게. 사용자 설정 OR 기기 설정 OR (테스트 등) 이미 넣힌 속성
  const motionReduced =
    reduceMotion || systemReduced || document.documentElement.dataset.motion === "reduced";

  // DOM 속성 반영만 한다 (상태 갱신 없음). 기기 설정이 바뀌면 systemDark·systemReduced가 바뀌어 다시 실행된다
  useEffect(() => {
    applySettings(theme, reduceMotion);
  }, [theme, reduceMotion, systemDark, systemReduced]);

  const value: SettingsValue = {
    theme,
    reduceMotion,
    motionReduced,
    setTheme: (t) => {
      safeSet(THEME_KEY, t);
      setThemeState(t);
    },
    setReduceMotion: (v) => {
      safeSet(MOTION_KEY, v ? "1" : "0");
      setReduceState(v);
    },
  };
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("SettingsProvider가 필요하다");
  return ctx;
}

/** 움직임 줄이기 여부 (Provider 밖에서는 html 속성으로 판단) */
export function useMotionReduced(): boolean {
  const ctx = useContext(SettingsContext);
  return ctx ? ctx.motionReduced : document.documentElement.dataset.motion === "reduced";
}
