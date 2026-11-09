export type EnemyKind = "slime" | "wing" | "knight" | "boss";

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  hp: number;
  attack: number;
  defense: number;
  xp: number;
  coins: [number, number];
  speed: number;
  body: { w: number; h: number; ox: number; oy: number };
  knockbackResist: number; // 0 = flies away, 1 = immovable
  dropChanceTonic: number;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  slime: { kind: "slime", name: "Gloomlet", hp: 4, attack: 1, defense: 0, xp: 6, coins: [1, 3], speed: 70, body: { w: 12, h: 10, ox: 2, oy: 4 }, knockbackResist: 0, dropChanceTonic: 0.15 },
  wing: { kind: "wing", name: "Gloamwing", hp: 3, attack: 1, defense: 0, xp: 8, coins: [2, 4], speed: 46, body: { w: 10, h: 8, ox: 3, oy: 2 }, knockbackResist: 0.2, dropChanceTonic: 0.15 },
  knight: { kind: "knight", name: "Hollow Knight", hp: 12, attack: 3, defense: 1, xp: 25, coins: [5, 9], speed: 34, body: { w: 12, h: 22, ox: 6, oy: 4 }, knockbackResist: 0.6, dropChanceTonic: 0.4 },
  boss: { kind: "boss", name: "Thornmaw, Gloam Warden", hp: 70, attack: 3, defense: 1, xp: 120, coins: [30, 30], speed: 60, body: { w: 30, h: 36, ox: 13, oy: 12 }, knockbackResist: 1, dropChanceTonic: 0 },
};
