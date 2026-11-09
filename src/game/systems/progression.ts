import { ITEMS } from "../data/items";
import { BASE_STATS, type GameState } from "./GameState";

export interface Stats {
  maxHp: number;
  attack: number;
  defense: number;
}

export const MAX_LEVEL = 10;

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return Math.round(20 * Math.pow(level, 1.45));
}

/** Stats from level growth plus every equipped item's bonus. */
export function computeStats(s: Pick<GameState, "level" | "equipment">): Stats {
  const lv = s.level - 1;
  const out: Stats = { maxHp: BASE_STATS.maxHp + lv * 2, attack: BASE_STATS.attack + lv, defense: BASE_STATS.defense + Math.floor(lv / 2) };
  for (const id of Object.values(s.equipment)) {
    const b = id ? ITEMS[id]?.bonus : undefined;
    if (!b) continue;
    out.maxHp += b.maxHp ?? 0;
    out.attack += b.attack ?? 0;
    out.defense += b.defense ?? 0;
  }
  return out;
}

/** Adds XP, levelling up as many times as it covers. Returns how many levels were gained. Heals on level-up. */
export function addXp(s: GameState, amount: number): number {
  let gained = 0;
  s.xp += Math.max(0, Math.floor(amount));
  while (s.level < MAX_LEVEL && s.xp >= xpToNext(s.level)) {
    s.xp -= xpToNext(s.level);
    s.level++;
    gained++;
  }
  if (s.level >= MAX_LEVEL) s.xp = Math.min(s.xp, xpToNext(MAX_LEVEL));
  if (gained) s.hp = computeStats(s).maxHp;
  return gained;
}

/** Damage after defense; never below 1 so every hit counts. */
export function calcDamage(attack: number, defense: number, mul = 1, crit = false): number {
  const raw = attack * mul * (crit ? 1.5 : 1) - defense * 0.6;
  return Math.max(1, Math.round(raw));
}
