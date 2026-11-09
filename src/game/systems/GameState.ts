import type { EquipSlot } from "../data/items";
import type { QuestState } from "../data/quests";
import type { AbilityId } from "../data/abilities";

export interface Checkpoint {
  id: string;
  x: number;
  y: number;
}

/** Everything that persists between sessions. Plain data so it serialises cleanly. */
export interface GameState {
  level: number;
  xp: number;
  hp: number;
  coins: number;
  inventory: Record<string, number>;
  equipment: Record<EquipSlot, string | null>;
  abilities: AbilityId[];
  quests: Record<string, { state: QuestState; progress: number }>;
  checkpoint: Checkpoint;
  opened: string[]; // chests / one-time pickups taken
  defeated: string[]; // enemies that stay dead
  flags: Record<string, boolean>;
  playTime: number;
}

export const BASE_STATS = { maxHp: 10, attack: 2, defense: 0 };

export function newGameState(spawn: Checkpoint): GameState {
  return {
    level: 1,
    xp: 0,
    hp: BASE_STATS.maxHp,
    coins: 0,
    inventory: { "berry-tonic": 1, "twig-sword": 1, "travel-tunic": 1 },
    equipment: { weapon: "twig-sword", armor: "travel-tunic", accessory: null },
    abilities: [],
    quests: { cleanse: { state: "inactive", progress: 0 } },
    checkpoint: spawn,
    opened: [],
    defeated: [],
    flags: {},
    playTime: 0,
  };
}
