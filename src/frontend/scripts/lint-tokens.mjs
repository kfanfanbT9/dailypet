// lint:tokens — 컴포넌트·화면 코드에 디자인 값을 직접 쓰지 않았는지 검사한다 (Style-guide.md 14장, phase3_task.md F-1).
// 잡는 것: hex 색(#abc, #aabbcc…), px 리터럴(숫자px), 글꼴 이름. 예외: styles/tokens.css, 마스코트 SVG.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = () => fileURLToPath(new URL("..", import.meta.url));
const EXEMPT = [join("src", "styles", "tokens.css"), join("src", "components", "mascot") + sep];
// 파일 첫머리에 "lint-tokens-allow: font"(또는 hex·px)를 적으면 그 규칙만 건너뛴다 (예: 라이선스 화면이 글꼴 이름을 내용으로 보여 줄 때)
const RULES = [
  ["hex", /#[0-9a-fA-F]{3,8}\b(?![\w-])/g, "hex 색은 tokens.css에만"],
  ["px", /\b\d+(\.\d+)?px\b/g, "px 값은 tokens.css에만 (Tailwind 토큰 클래스 사용)"],
  ["font", /\b(Jua|Nanum Gothic|Malgun Gothic|Apple SD Gothic)\b/g, "글꼴 이름은 tokens.css에만"],
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

export function lintText(text) {
  const problems = [];
  const allowed = new Set(
    [...text.matchAll(/lint-tokens-allow:\s*([a-z, ]+)/g)].flatMap((m) => m[1].split(/[ ,]+/)),
  );
  // 주석과 import 경로는 검사하지 않는다
  const code = text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/^import .*$/gm, "");
  for (const [name, re, message] of RULES) {
    if (allowed.has(name)) continue;
    for (const m of code.matchAll(re)) problems.push({ match: m[0], message });
  }
  return problems;
}

export function lintFiles(files) {
  const found = [];
  for (const f of files) {
    const rel = relative(root(), f);
    if (EXEMPT.some((e) => rel === e || rel.startsWith(e))) continue;
    for (const p of lintText(readFileSync(f, "utf8"))) found.push(`${rel}: ${p.match} — ${p.message}`);
  }
  return found;
}

if (
  import.meta.url.startsWith("file:") &&
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1]
) {
  const found = lintFiles(walk(join(root(), "src")));
  if (found.length) {
    console.error(`lint:tokens 위반 ${found.length}건\n${found.join("\n")}`);
    process.exit(1);
  }
  console.log("lint:tokens 통과");
}
