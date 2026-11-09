import { QUESTS } from "../data/quests";
import type { GameState } from "./GameState";
import { addItem, countOf, removeItem } from "./inventory";
import { addXp } from "./progression";

export function questOf(s: GameState, id: string) {
  return (s.quests[id] ??= { state: "inactive", progress: 0 });
}

export function acceptQuest(s: GameState, id: string): void {
  const q = questOf(s, id);
  if (q.state === "inactive") q.state = "active";
  syncQuest(s, id);
}

/** Recomputes progress from the inventory and flips active <-> ready. */
export function syncQuest(s: GameState, id: string): void {
  const def = QUESTS[id], q = questOf(s, id);
  if (q.state !== "active" && q.state !== "ready") return;
  q.progress = Math.min(def.needed, countOf(s, def.item));
  q.state = q.progress >= def.needed ? "ready" : "active";
}

/** Whether a defeated enemy should drop the quest item. */
export function wantsQuestDrop(s: GameState, id: string): boolean {
  const q = questOf(s, id);
  return q.state !== "done" && countOf(s, QUESTS[id].item) < QUESTS[id].needed;
}

export interface QuestReward {
  xp: number;
  coins: number;
  levels: number;
  ability?: string;
}

/** Hands the quest in. Returns the reward, or null when it isn't ready. */
export function completeQuest(s: GameState, id: string): QuestReward | null {
  const def = QUESTS[id], q = questOf(s, id);
  syncQuest(s, id);
  if (q.state !== "ready") return null;
  removeItem(s, def.item, def.needed);
  q.state = "done";
  q.progress = def.needed;
  s.coins += def.rewardCoins;
  if (def.rewardAbility && !s.abilities.includes(def.rewardAbility)) {
    s.abilities.push(def.rewardAbility);
    if (def.rewardAbility === "sunspark") addItem(s, "sun-tome");
  }
  const levels = addXp(s, def.rewardXp);
  return { xp: def.rewardXp, coins: def.rewardCoins, levels, ability: def.rewardAbility };
}
