// 라우트 공통 도우미: 소유 확인(남의 것이면 404), 응답 표현(0/1 → boolean, 연령 구간 계산).
import { z } from "zod";
import { ageGroup, isValidDate, isValidTime } from "../lib/dates.js";
import { notFound } from "../lib/errors.js";

export const zDate = z.string().refine(isValidDate, "YYYY-MM-DD");
export const zTime = z.string().refine(isValidTime, "HH:MM");

export async function loadPet(deps, userId, petId) {
  const pet = await deps.repos.pets.get(userId, petId);
  if (!pet) throw notFound("반려동물을 찾을 수 없어요.");
  return pet;
}

export function presentPet(pet, today) {
  return {
    ...pet,
    neutered: Boolean(pet.neutered),
    age_group: ageGroup({ species: pet.species, size: pet.size, birthDate: pet.birth_date }, today),
  };
}

export function presentTask(task) {
  return { ...task, done: Boolean(task.done) };
}

/** 할 일 정렬: time 오름차순, 시간 없는 항목(건강)은 맨 아래 (wireframe W05) */
export function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (!a.time && !b.time) return a.id.localeCompare(b.id);
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time) || a.id.localeCompare(b.id);
  });
}
