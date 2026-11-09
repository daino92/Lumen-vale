import { ITEMS, SLOT_FOR_KIND } from "../data/items";
import type { GameState } from "./GameState";
import { computeStats } from "./progression";

export function countOf(s: GameState, id: string): number {
  return s.inventory[id] ?? 0;
}

/** Adds items up to the stack limit. Returns how many were actually added. */
export function addItem(s: GameState, id: string, n = 1): number {
  const def = ITEMS[id];
  if (!def) return 0;
  const have = countOf(s, id);
  const add = Math.max(0, Math.min(n, def.stack - have));
  if (add > 0) s.inventory[id] = have + add;
  return add;
}

export function removeItem(s: GameState, id: string, n = 1): boolean {
  const have = countOf(s, id);
  if (have < n) return false;
  if (have === n) delete s.inventory[id];
  else s.inventory[id] = have - n;
  return true;
}

/** Equips an owned piece of equipment into its slot. */
export function equip(s: GameState, id: string): boolean {
  const def = ITEMS[id];
  const slot = def && SLOT_FOR_KIND[def.kind];
  if (!slot || countOf(s, id) < 1) return false;
  s.equipment[slot] = id;
  s.hp = Math.min(s.hp, computeStats(s).maxHp);
  return true;
}

export function isEquipped(s: GameState, id: string): boolean {
  return Object.values(s.equipment).includes(id);
}

/** Uses a consumable. Returns false when it can't be used (none owned, or HP already full). */
export function useItem(s: GameState, id: string): boolean {
  const def = ITEMS[id];
  if (!def || def.kind !== "consumable" || countOf(s, id) < 1) return false;
  const max = computeStats(s).maxHp;
  if (def.heal && s.hp >= max) return false;
  removeItem(s, id);
  if (def.heal) s.hp = Math.min(max, s.hp + def.heal);
  return true;
}

/** Inventory entries in a stable display order: equipment, consumables, quest, key items. */
export function listInventory(s: GameState): { id: string; count: number }[] {
  const order = ["weapon", "armor", "accessory", "consumable", "quest", "key"];
  return Object.entries(s.inventory)
    .filter(([id, n]) => n > 0 && ITEMS[id])
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => order.indexOf(ITEMS[a.id].kind) - order.indexOf(ITEMS[b.id].kind) || a.id.localeCompare(b.id));
}
