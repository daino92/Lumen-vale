export type ItemKind = "consumable" | "weapon" | "armor" | "accessory" | "quest" | "key";
export type EquipSlot = "weapon" | "armor" | "accessory";

export interface StatBonus {
  attack?: number;
  defense?: number;
  maxHp?: number;
}

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  icon: string; // frame name in the "icons" texture
  desc: string;
  bonus?: StatBonus;
  heal?: number;
  stack: number;
}

export const ITEMS: Record<string, ItemDef> = {
  "berry-tonic": { id: "berry-tonic", name: "Berry Tonic", kind: "consumable", icon: "tonic", desc: "Restores 4 HP.", heal: 4, stack: 9 },
  "twig-sword": { id: "twig-sword", name: "Twig Sword", kind: "weapon", icon: "sword1", desc: "A practice blade. ATK +1", bonus: { attack: 1 }, stack: 1 },
  "ruin-blade": { id: "ruin-blade", name: "Ruin Blade", kind: "weapon", icon: "sword2", desc: "Old steel, still keen. ATK +3", bonus: { attack: 3 }, stack: 1 },
  "travel-tunic": { id: "travel-tunic", name: "Travel Tunic", kind: "armor", icon: "tunic", desc: "Sturdy cloth. DEF +1", bonus: { defense: 1 }, stack: 1 },
  "knight-plate": { id: "knight-plate", name: "Knight Plate", kind: "armor", icon: "plate", desc: "Cleansed armor. DEF +3, HP +2", bonus: { defense: 3, maxHp: 2 }, stack: 1 },
  "moss-ring": { id: "moss-ring", name: "Mossguard Ring", kind: "accessory", icon: "ring", desc: "Hums with forest life. HP +3, DEF +1", bonus: { maxHp: 3, defense: 1 }, stack: 1 },
  "gloam-shard": { id: "gloam-shard", name: "Gloam Shard", kind: "quest", icon: "shard", desc: "Corruption, crystallised. Elder Moss wants these.", stack: 99 },
  "zephyr-feather": { id: "zephyr-feather", name: "Zephyr Feather", kind: "key", icon: "feather", desc: "Lets you jump again in mid-air.", stack: 1 },
  "sun-tome": { id: "sun-tome", name: "Sunspark Tome", kind: "key", icon: "tome", desc: "Teaches Sunspark: K hurls a fire bolt.", stack: 1 },
};

export const SLOT_FOR_KIND: Partial<Record<ItemKind, EquipSlot>> = { weapon: "weapon", armor: "armor", accessory: "accessory" };
