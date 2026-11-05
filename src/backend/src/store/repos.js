// 컬렉션별 저장소. 모든 조회·수정은 userId가 필수이고, where에 user_id를 내부에서 항상 붙인다
// (호출자가 빼먹을 수 없게). 다른 사용자의 행은 get에서 null → 라우트에서 404.
import { assertValid } from "./validate.js";
import { whereAll } from "./record.js";

function requireUser(userId) {
  if (typeof userId !== "string" || !userId.startsWith("usr_")) {
    throw new Error("저장소 호출에 userId가 필요하다");
  }
}

/** filter 객체 {field: 값 또는 {$op: 값}} → where 조건 목록 */
function filterConds(filter = {}) {
  return Object.entries(filter)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => ({ [k]: v }));
}

function scopedRepo(store, collection, { catalog }) {
  const where = (userId, filter) => whereAll({ user_id: userId }, ...filterConds(filter));
  return {
    async list(userId, filter = {}) {
      requireUser(userId);
      return (await store.get(collection, { where: where(userId, filter) })).map((r) => r.row);
    },
    async get(userId, id) {
      requireUser(userId);
      if (typeof id !== "string") return null;
      const [rec] = await store.get(collection, { ids: [id] });
      return rec && rec.row.user_id === userId ? rec.row : null;
    },
    async put(userId, row) {
      requireUser(userId);
      if (row.user_id !== userId) throw new Error("다른 사용자 행은 쓸 수 없다");
      assertValid(collection, row, { catalog });
      await store.upsert(collection, [row]);
      return row;
    },
    async putMany(userId, rows) {
      requireUser(userId);
      for (const row of rows) {
        if (row.user_id !== userId) throw new Error("다른 사용자 행은 쓸 수 없다");
        assertValid(collection, row, { catalog });
      }
      await store.upsert(collection, rows);
      return rows;
    },
    async remove(userId, id) {
      requireUser(userId);
      const row = await this.get(userId, id);
      if (!row) return false;
      await store.delete(collection, { ids: [id] });
      return true;
    },
    async removeWhere(userId, filter = {}) {
      requireUser(userId);
      const ids = (await store.get(collection, { where: where(userId, filter) })).map((r) => r.id);
      if (ids.length) await store.delete(collection, { ids });
      return ids.length;
    },
  };
}

export function createRepos(store, { catalog } = {}) {
  const scoped = (name) => scopedRepo(store, name, { catalog });
  const pets = scoped("pets");
  const tasks = scoped("tasks");
  return {
    store,
    users: {
      async getById(userId) {
        requireUser(userId);
        const [rec] = await store.get("users", { ids: [userId] });
        return rec?.row ?? null;
      },
      async getByEmail(email) {
        const [rec] = await store.get("users", { where: { email }, limit: 1 });
        return rec?.row ?? null;
      },
      async create(row) {
        assertValid("users", row);
        await store.upsert("users", [row]);
        return row;
      },
      async remove(userId) {
        requireUser(userId);
        await store.delete("users", { ids: [userId] });
      },
    },
    pets: {
      ...pets,
      async list(userId) {
        const rows = await pets.list(userId);
        return rows.sort(
          (a, b) => (a.created_at ?? "").localeCompare(b.created_at ?? "") || a.id.localeCompare(b.id),
        );
      },
    },
    tasks: {
      ...tasks,
      listByDate: (userId, petId, date) => tasks.list(userId, { pet_id: petId, date }),
    },
    healthEvents: scoped("health_events"),
    weights: scoped("weight_logs"),
    interactions: scoped("interactions"),
    preferences: scoped("preferences"),
    chatLogs: scoped("chat_logs"),
  };
}
