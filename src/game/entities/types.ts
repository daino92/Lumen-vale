import type Phaser from "phaser";
import type { FxSystem } from "../effects/FxSystem";
import type { GameState } from "../systems/GameState";
import type { Stats } from "../systems/progression";
import type { Controls } from "../systems/Controls";
import type { LevelData } from "../data/level";

/** What entities can ask of the world. GameScene implements it. */
export interface World extends Phaser.Scene {
  fx: FxSystem;
  state: GameState;
  level: LevelData;
  controls: Controls;
  stats(): Stats;
  hitStop(seconds: number): void;
  shake(duration: number, intensity: number): void;
  damagePlayer(amount: number, fromX: number, kind?: string): void;
  isSolidAt(x: number, y: number): boolean;
  playerPos(): { x: number; y: number };
  spawnPlayerBolt(x: number, y: number, dir: number): void;
  playerSlash(hitbox: Phaser.Geom.Rectangle, damageMul: number, dir: number, hitSet: Set<unknown>): boolean;
}
