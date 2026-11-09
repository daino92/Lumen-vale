// Parses the ASCII layout into a collision grid plus entity spawns. Pure data: no Phaser.
import { VILLAGE, FOREST, RUINS, BOSS } from "./levelLayout";
import { TILE } from "../config/constants";

/**
 * Legend
 *  .  empty            #  earth (grass on top)   B  ruin bricks        f  false wall (looks solid, walk through)
 *  =  wood one-way     -  stone one-way           ~  water (hazard)     ^  gloam thorns (hazard)
 *  P  player spawn     H  checkpoint shrine       N  Elder Moss         s  signpost
 *  S  Gloomlet slime   W  Gloamwing (flyer)       K  Hollow Knight      X  boss: Thornmaw
 *  C  coin             !  berry tonic             1-3 chests            Z  Zephyr Feather   G  boss gate
 *  T tree  h house  b bush  l lamp  r ruined pillar  t torch            (decor)
 */
export const SECTIONS = [
  { id: "village", name: "Brightmoss Village", rows: VILLAGE, music: "vale", ambience: "ambPetals" },
  { id: "forest", name: "Enchanted Forest", rows: FOREST, music: "vale", ambience: "ambLeaves" },
  { id: "ruins", name: "Ancient Ruins", rows: RUINS, music: "ruins", ambience: "ambFog" },
  { id: "boss", name: "Warden's Hollow", rows: BOSS, music: "boss", ambience: null },
] as const;

export type SectionId = (typeof SECTIONS)[number]["id"];

export const CHEST_LOOT: Record<string, { item: string; coins: number }> = {
  "1": { item: "moss-ring", coins: 10 },
  "2": { item: "knight-plate", coins: 5 },
  "3": { item: "ruin-blade", coins: 8 },
};

export interface Spawn {
  ch: string;
  id: string; // stable id for save data, e.g. "S@46,11"
  tx: number;
  ty: number;
  x: number; // world px: tile centre x
  y: number; // world px: tile bottom (feet)
  section: SectionId;
}

export interface LevelData {
  grid: string[];
  cols: number;
  rows: number;
  width: number;
  height: number;
  spawns: Spawn[];
  sectionStarts: { id: SectionId; name: string; x: number; music: string; ambience: string | null }[];
}

const TERRAIN = new Set([".", "#", "B", "f", "=", "-", "~", "^"]);

export function buildLevel(): LevelData {
  const rows = VILLAGE.length;
  for (const s of SECTIONS) {
    if (s.rows.length !== rows) throw new Error(`section ${s.id} has ${s.rows.length} rows, expected ${rows}`);
    const w = s.rows[0].length;
    s.rows.forEach((r, i) => {
      if (r.length !== w) throw new Error(`section ${s.id} row ${i} is ${r.length} wide, expected ${w}`);
    });
  }
  const raw = Array.from({ length: rows }, (_, y) => SECTIONS.map((s) => s.rows[y]).join(""));
  const cols = raw[0].length;
  const spawns: Spawn[] = [];
  const sectionStarts: LevelData["sectionStarts"] = [];
  let x0 = 0;
  const sectionAt: SectionId[] = [];
  for (const s of SECTIONS) {
    sectionStarts.push({ id: s.id, name: s.name, x: x0 * TILE, music: s.music, ambience: s.ambience });
    for (let i = 0; i < s.rows[0].length; i++) sectionAt.push(s.id);
    x0 += s.rows[0].length;
  }
  const grid = raw.map((r, y) =>
    [...r]
      .map((ch, x) => {
        if (TERRAIN.has(ch)) return ch;
        spawns.push({ ch, id: `${ch}@${x},${y}`, tx: x, ty: y, x: x * TILE + TILE / 2, y: (y + 1) * TILE, section: sectionAt[x] });
        return ".";
      })
      .join(""),
  );
  return { grid, cols, rows, width: cols * TILE, height: rows * TILE, spawns, sectionStarts };
}

export function sectionAtX(level: LevelData, x: number): LevelData["sectionStarts"][number] {
  let cur = level.sectionStarts[0];
  for (const s of level.sectionStarts) if (x >= s.x) cur = s;
  return cur;
}
