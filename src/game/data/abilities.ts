export type AbilityId = "double-jump" | "sunspark";

export interface AbilityDef {
  id: AbilityId;
  name: string;
  desc: string;
  cooldown: number;
  damageMul?: number;
}

/** Data for unlockable abilities. Add an entry here and handle it in Player to add more. */
export const ABILITIES: Record<AbilityId, AbilityDef> = {
  "double-jump": { id: "double-jump", name: "Zephyr Step", desc: "Jump again in mid-air.", cooldown: 0 },
  sunspark: { id: "sunspark", name: "Sunspark", desc: "K: hurl a bolt of sunfire.", cooldown: 0.9, damageMul: 1.6 },
};
