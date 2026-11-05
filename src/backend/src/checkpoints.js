// LangGraph checkpoint(SQLite)에서 thread 삭제 — 반려동물·대화 삭제 때 (ARCHITECTURE.md 5장).
// 테이블 이름은 langgraph-checkpoint-sqlite==3.1.3 SqliteSaver.setup()에서 확인했다.
import { existsSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

export const CHECKPOINT_TABLES = ["checkpoints", "writes"];
const BUSY_TIMEOUT_MS = 3000; // Agent가 파일을 열어 둔 경우 잠금 대기

export function createCheckpoints(path) {
  function withDb(fn) {
    if (!path || !existsSync(path)) return 0; // 파일이 없으면 지울 것도 없다
    const db = new DatabaseSync(path);
    try {
      db.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);
      const tables = new Set(
        db
          .prepare("SELECT name FROM sqlite_master WHERE type='table'")
          .all()
          .map((r) => r.name),
      );
      return fn(db, tables);
    } finally {
      db.close();
    }
  }

  return {
    path,
    /** 주어진 thread들의 checkpoint·writes 행을 지운다. 지운 행 수. */
    deleteThreads(threadIds) {
      const ids = [...new Set(threadIds)].filter(Boolean);
      if (ids.length === 0) return 0;
      return withDb((db, tables) => {
        let n = 0;
        const marks = ids.map(() => "?").join(",");
        for (const t of CHECKPOINT_TABLES) {
          if (!tables.has(t)) continue;
          n += Number(db.prepare(`DELETE FROM ${t} WHERE thread_id IN (${marks})`).run(...ids).changes);
        }
        return n;
      });
    },
    /** 모든 thread 비우기 (시드 리셋). 파일 삭제 대신 테이블을 비워 Agent가 연 연결을 깨지 않는다. */
    clearAll() {
      return withDb((db, tables) => {
        let n = 0;
        for (const t of CHECKPOINT_TABLES) {
          if (tables.has(t)) n += Number(db.prepare(`DELETE FROM ${t}`).run().changes);
        }
        return n;
      });
    },
    countThread(threadId) {
      return withDb((db, tables) =>
        CHECKPOINT_TABLES.filter((t) => tables.has(t)).reduce(
          (n, t) => n + db.prepare(`SELECT COUNT(*) AS c FROM ${t} WHERE thread_id = ?`).get(threadId).c,
          0,
        ),
      );
    },
  };
}
