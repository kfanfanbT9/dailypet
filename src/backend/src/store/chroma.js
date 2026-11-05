// 실제 Chroma 저장소 (server mode). 메모리 저장소와 같은 인터페이스.
// 앱 데이터 컬렉션만 연다 — 카탈로그·지식 컬렉션은 열지 않는다 (PROTECTED_COLLECTIONS).
import { AdminClient, ChromaClient } from "chromadb";
import {
  APP_COLLECTIONS,
  DUMMY_EMBEDDING,
  PROTECTED_COLLECTIONS,
  decodeAppRecord,
  encodeAppRecord,
} from "./record.js";

const PAGE = 1000;

export async function ensureDatabase({ host, port, database }) {
  if (!database) return;
  const admin = new AdminClient({ host, port });
  try {
    await admin.getDatabase({ name: database, tenant: "default_tenant" });
  } catch {
    await admin.createDatabase({ name: database, tenant: "default_tenant" });
  }
}

export function createChromaStore({ host = "localhost", port = 8001, database } = {}) {
  const client = new ChromaClient({ host, port, ...(database ? { database } : {}) });
  const handles = new Map();

  async function col(name) {
    if (PROTECTED_COLLECTIONS.includes(name)) throw new Error(`보호 컬렉션은 열지 않는다: ${name}`);
    if (!APP_COLLECTIONS.includes(name)) throw new Error(`앱 데이터 컬렉션이 아니다: ${name}`);
    if (!handles.has(name)) {
      handles.set(name, await client.getOrCreateCollection({ name, embeddingFunction: null }));
    }
    return handles.get(name);
  }

  return {
    kind: "chroma",
    client,
    async get(name, { ids, where, limit } = {}) {
      const c = await col(name);
      const out = [];
      let offset = 0;
      for (;;) {
        const pageLimit = limit ? Math.min(limit - out.length, PAGE) : PAGE;
        const res = await c.get({
          ids,
          where,
          limit: pageLimit,
          offset,
          include: ["documents", "metadatas"],
        });
        res.ids.forEach((id, i) =>
          out.push({ id, row: decodeAppRecord(res.documents[i]), metadata: res.metadatas[i] ?? {} }),
        );
        if (res.ids.length < pageLimit || (limit && out.length >= limit) || ids) break;
        offset += res.ids.length;
      }
      return out;
    },
    async upsert(name, rows) {
      if (rows.length === 0) return;
      const c = await col(name);
      const enc = rows.map(encodeAppRecord);
      // Chroma upsert는 metadata를 합친다(빠진 키가 남음) → 이미 있는 id는 지우고 다시 넣는다 (ARCHITECTURE.md 5.1)
      const ids = enc.map((e) => e.id);
      const existing = (await c.get({ ids, include: [] })).ids;
      if (existing.length) await c.delete({ ids: existing });
      await c.add({
        ids: enc.map((e) => e.id),
        documents: enc.map((e) => e.document),
        metadatas: enc.map((e) => e.metadata),
        embeddings: enc.map(() => DUMMY_EMBEDDING),
      });
    },
    async delete(name, { ids, where } = {}) {
      if (!ids && !where) throw new Error("delete에는 ids 또는 where가 필요하다");
      if (ids && ids.length === 0) return;
      const c = await col(name);
      await c.delete({ ids, where });
    },
    async count(name) {
      return (await col(name)).count();
    },
    async resetCollections(names) {
      for (const name of names) {
        if (PROTECTED_COLLECTIONS.includes(name) || !APP_COLLECTIONS.includes(name)) {
          throw new Error(`리셋할 수 없는 컬렉션: ${name}`);
        }
        try {
          await client.deleteCollection({ name });
        } catch {
          // 없으면 무시
        }
        handles.delete(name);
        await col(name);
      }
    },
    async listCollections() {
      return (await client.listCollections()).map((c) => (typeof c === "string" ? c : c.name));
    },
    async heartbeat() {
      await client.heartbeat();
      return true;
    },
  };
}
