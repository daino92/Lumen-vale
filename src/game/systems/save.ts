import { SAVE_KEY, SAVE_VERSION } from "../config/constants";
import type { GameState } from "./GameState";
import { newGameState } from "./GameState";
import { computeStats } from "./progression";

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

interface SaveFile {
  version: number;
  savedAt: number;
  state: GameState;
}

function storage(): StorageLike | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
}

/** Upgrades older save files. v1 had no `flags`/`playTime`. */
function migrate(file: { version: number; state: Record<string, unknown> }): Record<string, unknown> {
  const st = { ...file.state };
  if (file.version < 2) {
    st.flags ??= {};
    st.playTime ??= 0;
  }
  return st;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Rebuilds a GameState from untrusted data, field by field, falling back to defaults. */
export function sanitize(raw: unknown, spawn: GameState["checkpoint"]): GameState | null {
  if (!isObj(raw)) return null;
  const d = newGameState(spawn);
  const s: GameState = { ...d };
  if (isNum(raw.level)) s.level = Math.max(1, Math.min(10, Math.floor(raw.level)));
  if (isNum(raw.xp)) s.xp = Math.max(0, raw.xp);
  if (isNum(raw.coins)) s.coins = Math.max(0, Math.floor(raw.coins));
  if (isObj(raw.inventory)) {
    s.inventory = {};
    for (const [k, v] of Object.entries(raw.inventory)) if (isNum(v) && v > 0) s.inventory[k] = Math.floor(v);
  }
  if (isObj(raw.equipment)) {
    const e = raw.equipment;
    s.equipment = {
      weapon: typeof e.weapon === "string" ? e.weapon : d.equipment.weapon,
      armor: typeof e.armor === "string" ? e.armor : d.equipment.armor,
      accessory: typeof e.accessory === "string" ? e.accessory : null,
    };
  }
  if (Array.isArray(raw.abilities)) s.abilities = raw.abilities.filter((a): a is GameState["abilities"][number] => a === "double-jump" || a === "sunspark");
  if (isObj(raw.quests)) {
    s.quests = { ...d.quests };
    for (const [k, v] of Object.entries(raw.quests))
      if (isObj(v) && typeof v.state === "string" && ["inactive", "active", "ready", "done"].includes(v.state))
        s.quests[k] = { state: v.state as GameState["quests"][string]["state"], progress: isNum(v.progress) ? v.progress : 0 };
  }
  if (isObj(raw.checkpoint) && typeof raw.checkpoint.id === "string" && isNum(raw.checkpoint.x) && isNum(raw.checkpoint.y))
    s.checkpoint = { id: raw.checkpoint.id, x: raw.checkpoint.x, y: raw.checkpoint.y };
  if (Array.isArray(raw.opened)) s.opened = raw.opened.filter((x): x is string => typeof x === "string");
  if (Array.isArray(raw.defeated)) s.defeated = raw.defeated.filter((x): x is string => typeof x === "string");
  if (isObj(raw.flags)) for (const [k, v] of Object.entries(raw.flags)) if (typeof v === "boolean") s.flags[k] = v;
  if (isNum(raw.playTime)) s.playTime = raw.playTime;
  const max = computeStats(s).maxHp;
  s.hp = isNum(raw.hp) ? Math.max(1, Math.min(max, raw.hp)) : max;
  return s;
}

export function saveGame(state: GameState, store: StorageLike | null = storage()): boolean {
  if (!store) return false;
  try {
    const file: SaveFile = { version: SAVE_VERSION, savedAt: Date.now(), state };
    store.setItem(SAVE_KEY, JSON.stringify(file));
    return true;
  } catch {
    return false;
  }
}

export type LoadResult = { ok: true; state: GameState } | { ok: false; reason: "none" | "corrupt" | "unavailable" };

export function loadGame(spawn: GameState["checkpoint"], store: StorageLike | null = storage()): LoadResult {
  if (!store) return { ok: false, reason: "unavailable" };
  let text: string | null;
  try {
    text = store.getItem(SAVE_KEY);
  } catch {
    return { ok: false, reason: "unavailable" };
  }
  if (!text) return { ok: false, reason: "none" };
  try {
    const file = JSON.parse(text);
    if (!isObj(file) || !isNum(file.version) || file.version > SAVE_VERSION || !isObj(file.state)) return { ok: false, reason: "corrupt" };
    const state = sanitize(migrate(file as { version: number; state: Record<string, unknown> }), spawn);
    return state ? { ok: true, state } : { ok: false, reason: "corrupt" };
  } catch {
    return { ok: false, reason: "corrupt" };
  }
}

export function hasSave(store: StorageLike | null = storage()): boolean {
  try {
    return !!store?.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

export function deleteSave(store: StorageLike | null = storage()): void {
  try {
    store?.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}
