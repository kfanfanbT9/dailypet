import { describe, expect, it } from "vitest";
import { loadCatalog } from "../src/catalog.js";
import { markOverdue } from "../src/jobs/overdue.js";
import { estimateDose, nextAfter } from "../src/services/healthSchedule.js";
import { USERS, createTestApp, loginAs } from "./helpers.js";

const catalog = loadCatalog();

describe("일정 계산 규칙 (ARCHITECTURE.md 6.1)", () => {
  it("완료일 기준 다음 회차, 마지막 회차 → 추가접종, interval → 주기", () => {
    const dhpp = catalog.get("hc_dog_dhpp");
    expect(nextAfter(dhpp, { doseNo: 3, doneDate: "2026-11-14", birthDate: "2026-07-10" })).toEqual({
      due_date: "2026-12-12",
      dose_no: 4,
    });
    expect(nextAfter(dhpp, { doseNo: 5, doneDate: "2027-02-01", birthDate: "2026-07-10" })).toEqual({
      due_date: "2030-01-31",
      dose_no: null,
    });
    expect(nextAfter(catalog.get("hc_cat_senior_checkup"), { doseNo: null, doneDate: "2026-06-10" })).toEqual(
      { due_date: "2026-12-07", dose_no: null },
    );
    expect(
      nextAfter(catalog.get("hc_dog_deworming_puppy"), {
        doseNo: 8,
        doneDate: "2026-12-30",
        birthDate: "2026-07-10",
      }),
    ).toBeNull();
  });
  it("회차를 모르면 완료 주령으로 추정 (콩이 10/25 = 15주령 → 퍼피 구충 5차)", () => {
    const ds = catalog.get("hc_dog_deworming_puppy").dose_schedule;
    expect(estimateDose(ds, "2026-07-10", "2026-10-25")).toBe(5);
    expect(estimateDose(ds, "2026-07-10", "2026-07-15")).toBe(1);
  });
});

describe("건강 일정 API (S11, TODAY=2026-11-14)", () => {
  it("DHPP 3차 11/14 완료 → done, 4차 due 2026-12-12 (예정일 아닌 완료일 기준)", async () => {
    const t = await createTestApp({ today: "2026-11-14" });
    const a = await loginAs(t.app, "haneul");
    const res = await a
      .patch("/api/health-events/evt_kongi_dhpp3/complete")
      .send({ completed_date: "2026-11-14" });
    expect(res.status).toBe(200);
    expect(res.body.event).toMatchObject({ status: "done", completed_date: "2026-11-14" });
    expect(res.body.next).toMatchObject({
      catalog_item_id: "hc_dog_dhpp",
      dose_no: 4,
      due_date: "2026-12-12",
      status: "scheduled",
    });
    expect(
      (await a.patch("/api/health-events/evt_kongi_dhpp3/complete").send({ completed_date: "2026-11-14" }))
        .status,
    ).toBe(409);
  });

  it("구충 이력 입력(10/25) → needs_history 해소, 다음 구충 일정 생성", async () => {
    const t = await createTestApp({ today: "2026-11-14" });
    const a = await loginAs(t.app, "haneul");
    const res = await a.patch("/api/health-events/evt_kongi_deworm").send({ last_done_date: "2026-10-25" });
    expect(res.status).toBe(200);
    expect(res.body.event.status).toBe("done");
    expect(res.body.next).toMatchObject({
      catalog_item_id: "hc_dog_deworming_puppy",
      dose_no: 6,
      due_date: "2026-11-22",
      status: "scheduled",
    });
    const list = (await a.get("/api/pets/pet_kongi/health-events")).body;
    expect(list.needs_history.map((e) => e.id)).not.toContain("evt_kongi_deworm");
  });

  it("미래 완료일·과거 날짜 변경·둘 다/둘 다 없음 → 400", async () => {
    const t = await createTestApp({ today: "2026-11-14" });
    const a = await loginAs(t.app, "haneul");
    expect(
      (await a.patch("/api/health-events/evt_kongi_rabies/complete").send({ completed_date: "2026-11-20" }))
        .status,
    ).toBe(400);
    expect(
      (await a.patch("/api/health-events/evt_kongi_rabies").send({ due_date: "2026-11-01" })).status,
    ).toBe(400);
    expect((await a.patch("/api/health-events/evt_kongi_rabies").send({})).status).toBe(400);
    expect(
      (
        await a
          .patch("/api/health-events/evt_kongi_rabies")
          .send({ due_date: "2026-11-30", last_done_date: "2026-11-01" })
      ).status,
    ).toBe(400);
    const ok = await a.patch("/api/health-events/evt_kongi_rabies").send({ due_date: "2026-11-30" });
    expect(ok.body.event).toMatchObject({ due_date: "2026-11-30", status: "scheduled", due_ts: 1795964400 });
  });

  it("마지막 회차 완료 → booster_interval_days 뒤 추가접종 1건", async () => {
    const t = await createTestApp({ today: "2026-11-14" });
    const a = await loginAs(t.app, "haneul");
    await a.patch("/api/health-events/evt_kongi_rabies/complete").send({ completed_date: "2026-11-14" });
    const up = (await a.get("/api/pets/pet_kongi/health-events")).body.upcoming;
    expect(up.filter((e) => e.catalog_item_id === "hc_dog_rabies")).toMatchObject([
      { due_date: "2027-11-14", dose_no: null },
    ]);
  });

  it("mallory로 콩이 일정 완료 → 404", async () => {
    const t = await createTestApp();
    const m = await loginAs(t.app, "mallory");
    expect(
      (await m.patch("/api/health-events/evt_kongi_dhpp3/complete").send({ completed_date: "2026-11-10" }))
        .status,
    ).toBe(404);
  });

  it("완료하면 그 일정의 할 일도 done", async () => {
    const t = await createTestApp({ today: "2026-11-10" });
    await t.repos.tasks.put(USERS.haneul.id, {
      id: "task_h1",
      user_id: USERS.haneul.id,
      pet_id: "pet_kongi",
      date: "2026-11-10",
      time: null,
      category: "health",
      source: "auto",
      catalog_item_id: null,
      health_event_id: "evt_kongi_dhpp3",
      title: "💉 종합백신 3차 D-3",
      done: 0,
    });
    const a = await loginAs(t.app, "haneul");
    await a.patch("/api/health-events/evt_kongi_dhpp3/complete").send({ completed_date: "2026-11-10" });
    expect((await t.repos.tasks.get(USERS.haneul.id, "task_h1")).done).toBe(1);
  });
});

describe("알림 (S03, 콩이)", () => {
  const kinds = async (today, overdue = false) => {
    const t = await createTestApp({ today });
    if (overdue) await markOverdue(t.store, today);
    const a = await loginAs(t.app, "haneul");
    const res = await a.get("/api/notifications");
    return res.body.map((n) => [n.event_id, n.kind]);
  };
  it("11/10 → 광견병 D-7만 (DHPP D-3 없음)", async () =>
    expect(await kinds("2026-11-10")).toEqual([["evt_kongi_rabies", "d7"]]));
  it("11/06 → DHPP d7", async () => expect(await kinds("2026-11-06")).toEqual([["evt_kongi_dhpp3", "d7"]]));
  it("11/12 → DHPP d1", async () => expect(await kinds("2026-11-12")).toEqual([["evt_kongi_dhpp3", "d1"]]));
  it("11/13 → DHPP today", async () =>
    expect(await kinds("2026-11-13")).toEqual([["evt_kongi_dhpp3", "today"]]));
  it("11/14 markOverdue 후 → DHPP overdue", async () =>
    expect(await kinds("2026-11-14", true)).toEqual([["evt_kongi_dhpp3", "overdue"]]));
  it("needs_history는 어떤 날짜에도 없다", async () => {
    for (const d of ["2026-10-13", "2026-10-19", "2026-10-20", "2026-11-10"]) {
      expect((await kinds(d)).map(([id]) => id)).not.toContain("evt_kongi_deworm");
    }
  });
  it("markOverdue를 두 번 돌려도 같다", async () => {
    const t = await createTestApp({ today: "2026-11-14" });
    expect(await markOverdue(t.store, "2026-11-14")).toBe(0); // createTestApp이 이미 한 번 돌림
    const evt = await t.repos.healthEvents.get(USERS.haneul.id, "evt_kongi_dhpp3");
    expect(evt.status).toBe("overdue");
  });
});
