import jwt from "jsonwebtoken";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { apiRouter } from "../src/routes/index.js";
import { DEMO_PASSWORD, TEST_JWT, USERS, captureLogs, createTestApp, loginAs } from "./helpers.js";

describe("가입 (S01)", () => {
  it("NewBie@Demo.DailyPet → 소문자 저장, id 고정, bcrypt 해시, 가입 즉시 로그인", async () => {
    const t = await createTestApp();
    const agent = request.agent(t.app);
    const pw = "Spring!2026";
    const stop = captureLogs();
    const res = await agent
      .post("/api/auth/signup")
      .send({ email: "NewBie@Demo.DailyPet", password: pw, nickname: " 새봄 " });
    const logs = stop().join("\n");
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      user_id: "usr_fce210e795d0",
      email: "newbie@demo.dailypet",
      nickname: "새봄",
    });
    const [rec] = await t.store.get("users", { ids: ["usr_fce210e795d0"] });
    expect(rec.row.email).toBe("newbie@demo.dailypet");
    expect(rec.row.password_hash.startsWith("$2")).toBe(true);
    expect(JSON.stringify(rec)).not.toContain(pw);
    expect(JSON.stringify(res.body) + logs).not.toContain(pw);
    expect(res.headers["set-cookie"].join(";")).toMatch(/dp_session=.*HttpOnly.*SameSite=Lax/i);
    expect((await agent.get("/api/me")).body.email).toBe("newbie@demo.dailypet");
  });

  it("대소문자만 다른 시드 이메일 → 409, 행 수 변화 없음", async () => {
    const t = await createTestApp();
    const before = await t.store.count("users");
    const res = await t
      .http()
      .post("/api/auth/signup")
      .send({ email: "HANEUL@demo.dailypet", password: "abcdefgh", nickname: "x" });
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: "email_taken", message: "이미 사용 중인 이메일이에요." });
    expect(await t.store.count("users")).toBe(before);
  });

  it.each([
    [{ email: "not-email", password: "abcdefgh", nickname: "x" }, "email"],
    [{ email: "a@b.co", password: "short", nickname: "x" }, "password"],
    [{ email: "a@b.co", password: "abcdefgh", nickname: "" }, "nickname"],
    [{ email: "a@b.co", password: "abcdefgh", nickname: "가".repeat(21) }, "nickname"],
  ])("입력 규칙 위반 400 (%j)", async (body, field) => {
    const t = await createTestApp();
    const res = await t.http().post("/api/auth/signup").send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.fields.map((f) => f.field)).toContain(field);
  });
});

describe("로그인·로그아웃·세션", () => {
  it("시드 계정이 데모 비밀번호로 로그인된다 ($2b$ 해시 호환)", async () => {
    const t = await createTestApp();
    for (const who of Object.keys(USERS)) await loginAs(t.app, who);
  });

  it("틀린 비밀번호·없는 이메일 모두 같은 401 문구", async () => {
    const t = await createTestApp();
    const a = await t
      .http()
      .post("/api/auth/login")
      .send({ email: USERS.haneul.email, password: "wrong-pass" });
    const b = await t
      .http()
      .post("/api/auth/login")
      .send({ email: "nobody@demo.dailypet", password: DEMO_PASSWORD });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body).toEqual(b.body);
  });

  it("로그아웃 후 /api/me 401, 위조·만료 토큰 401", async () => {
    const t = await createTestApp();
    const agent = await loginAs(t.app, "haneul");
    expect((await agent.get("/api/me")).status).toBe(200);
    await agent.post("/api/auth/logout");
    expect((await agent.get("/api/me")).status).toBe(401);
    const forged = jwt.sign({ sub: USERS.haneul.id }, "other-secret");
    const expired = jwt.sign({ sub: USERS.haneul.id, exp: Math.floor(Date.now() / 1000) - 10 }, TEST_JWT);
    for (const tok of [forged, expired, "garbage"]) {
      expect((await t.http().get("/api/me").set("Cookie", `dp_session=${tok}`)).status).toBe(401);
    }
  });

  it("GET /api/me에 비밀번호 해시가 없다", async () => {
    const t = await createTestApp();
    const res = await (await loginAs(t.app, "jiwoo")).get("/api/me");
    expect(Object.keys(res.body).sort()).toEqual(["created_at", "email", "nickname", "user_id"]);
  });
});

describe("requireAuth가 /api/auth/*를 뺀 모든 라우트에 걸린다", () => {
  it("apiRouter의 모든 경로·메서드가 쿠키 없이 401", async () => {
    const t = await createTestApp();
    const router = apiRouter(t.deps);
    const routes = [];
    const walk = (stack) => {
      for (const layer of stack) {
        if (layer.route) {
          for (const m of Object.keys(layer.route.methods)) routes.push([m, layer.route.path]);
        } else if (layer.handle?.stack) walk(layer.handle.stack);
      }
    };
    walk(router.stack);
    expect(routes.length).toBeGreaterThan(0);
    for (const [method, path] of routes) {
      const url = `/api${path.replace(/:(\w+)/g, "x_$1")}`;
      const res = await t.http()[method](url).send({});
      expect([method, url, res.status]).toEqual([method, url, 401]);
    }
  });
});
