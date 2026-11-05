// 카탈로그 읽기 전용 캐시 (data/catalog/*.json, reviewed:true만). Backend는 카탈로그를 수정하지 않는다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./config.js";

const FILES = ["activities.json", "diets.json", "health_checks.json"];

export function loadCatalog(dir = join(ROOT, "data", "catalog")) {
  const items = new Map();
  for (const f of FILES) {
    const data = JSON.parse(readFileSync(join(dir, f), "utf8"));
    for (const it of Array.isArray(data) ? data : data.items) {
      if (it.reviewed === true) items.set(it.item_id, it);
    }
  }
  return {
    size: items.size,
    get: (itemId) => items.get(itemId) ?? null,
    has: (itemId) => items.has(itemId),
    /** @param {{category?: string, species?: string, recommendableOnly?: boolean}} q */
    list({ category, species, recommendableOnly = false } = {}) {
      return [...items.values()].filter(
        (it) =>
          (!category || it.category === category) &&
          (!species || it.species.includes(species)) &&
          (!recommendableOnly || it.recommendable !== false),
      );
    },
    healthItems(species) {
      return [...items.values()].filter((it) => it.category === "health" && it.species.includes(species));
    },
  };
}
