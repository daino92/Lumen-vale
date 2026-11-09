import Phaser from "phaser";
import { DEPTH, GAME_H, GAME_W, MOVE, TILE } from "../config/constants";
import { buildLevel, CHEST_LOOT, sectionAtX, type LevelData, type Spawn } from "../data/level";
import { renderTerrain } from "../assets/terrain";
import { heroIdleFrame } from "../assets/registerArt";
import { FxSystem } from "../effects/FxSystem";
import type { FxName } from "../effects/catalog";
import { Player } from "../entities/Player";
import { Enemy, Knight, Slime, Wing } from "../entities/Enemy";
import { Boss } from "../entities/Boss";
import type { World } from "../entities/types";
import { Controls } from "../systems/Controls";
import { newGameState, type GameState } from "../systems/GameState";
import { addXp, calcDamage, computeStats, type Stats } from "../systems/progression";
import { addItem } from "../systems/inventory";
import { acceptQuest, completeQuest, questOf, syncQuest, wantsQuestDrop } from "../systems/quests";
import { loadGame, saveGame } from "../systems/save";
import { ITEMS } from "../data/items";
import { ELDER_DIALOGUE, SIGN_TEXT, type DialogueLine } from "../data/dialogue";
import { Sfx, type SfxName } from "../audio/Sfx";
import type { UIScene } from "./UIScene";

interface Pickup {
  sprite: Phaser.Physics.Arcade.Sprite;
  kind: "coin" | "shard" | "tonic" | "heart";
  id?: string; // level pickups that never come back once taken
  age: number;
}

interface Interactable {
  kind: "elder" | "sign" | "chest" | "shrine" | "feather";
  x: number;
  y: number;
  id: string;
  sprite: Phaser.GameObjects.Sprite;
  data?: string;
}

interface Bolt {
  sprite: Phaser.GameObjects.Image;
  dir: number;
  life: number;
  fx: ReturnType<FxSystem["play"]>;
}

export interface GameSceneData {
  mode: "new" | "continue";
}

export class GameScene extends Phaser.Scene implements World {
  fx!: FxSystem;
  state!: GameState;
  level!: LevelData;
  controls!: Controls;
  player!: Player;
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private enemies: Enemy[] = [];
  private boss: Boss | null = null;
  private pickups: Pickup[] = [];
  private interactables: Interactable[] = [];
  private bolts: Bolt[] = [];
  private secret!: Phaser.GameObjects.Image;
  private secretAlpha = 1;
  private parallax: { img: Phaser.GameObjects.TileSprite; f: number; fy: number; drift?: number; region?: (x: number) => number }[] = [];
  private gate: { sprite: Phaser.Physics.Arcade.Image; x: number; closed: boolean } | null = null;
  private stopT = 0;
  private section = "";
  private ambience: ReturnType<FxSystem["playScreen"]> | null = null;
  private ui!: UIScene;
  private lookAhead = 0;
  private dyingT = -1;
  private ended = false;
  private hazardCd = 0;
  private spawnPoint = { id: "start", x: 0, y: 0 };

  constructor() {
    super("Game");
  }

  init(data: GameSceneData): void {
    this.enemies = [];
    this.pickups = [];
    this.interactables = [];
    this.bolts = [];
    this.parallax = [];
    this.boss = null;
    this.gate = null;
    this.section = "";
    this.ambience = null;
    this.dyingT = -1;
    this.ended = false;
    this.stopT = 0;
    this.level = buildLevel();
    const p = this.level.spawns.find((s) => s.ch === "P")!;
    this.spawnPoint = { id: "start", x: p.x, y: p.y };
    this.state = newGameState(this.spawnPoint);
    if (data?.mode === "continue") {
      const r = loadGame(this.spawnPoint);
      if (r.ok) this.state = r.state;
    }
  }

  create(): void {
    const L = this.level;
    this.controls = new Controls(this);
    this.physics.world.gravity.y = MOVE.gravity;
    this.physics.world.setBounds(0, -64, L.width, L.height + 128);
    this.physics.world.setBoundsCollision(true, true, false, false);

    this.buildParallax();
    const art = renderTerrain(L.grid);
    const addCanvas = (key: string, cv: HTMLCanvasElement) => {
      if (this.textures.exists(key)) this.textures.remove(key);
      this.textures.addCanvas(key, cv);
    };
    addCanvas("terrain-back", art.back);
    addCanvas("terrain-main", art.main);
    addCanvas("terrain-secret", art.secret);
    this.add.image(0, 0, "terrain-back").setOrigin(0).setDepth(DEPTH.decorBack - 1);
    this.add.image(0, 0, "terrain-main").setOrigin(0).setDepth(DEPTH.terrain);
    this.secret = this.add.image(0, 0, "terrain-secret").setOrigin(0).setDepth(DEPTH.terrainFront);
    this.buildCollision();
    this.buildWater();

    this.fx = new FxSystem(this, DEPTH.player - 1, DEPTH.fx);
    this.spawnEntities();

    const cp = this.state.checkpoint;
    this.player = new Player(this, cp.x, cp.y);
    this.player.refreshAbilities();
    this.physics.add.collider(this.player, this.layer, undefined, (_p, t) => this.oneWayFilter(t as Phaser.Tilemaps.Tile, true), this);
    this.physics.add.collider(this.enemies, this.layer, undefined, (_e, t) => this.oneWayFilter(t as Phaser.Tilemaps.Tile, false), this);
    if (this.gate) this.physics.add.collider(this.player, this.gate.sprite, undefined, () => !!this.gate?.closed, this);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, L.width, L.height);
    cam.startFollow(this.player, true, 0.14, 0.12, 0, 20);
    cam.setDeadzone(24, 28);
    cam.setRoundPixels(true);
    cam.fadeIn(400, 11, 10, 20);

    this.scene.launch("UI");
    this.ui = this.scene.get("UI") as UIScene;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scene.stop("UI");
      Sfx.music(null);
    });

    if (!this.state.flags.introSeen) {
      this.state.flags.introSeen = true;
      this.time.delayedCall(700, () => this.ui.toast("Talk to Elder Moss: walk up and press E"));
    }
    if (!this.state.opened.includes("shrine:start")) {
      this.state.opened.push("shrine:start");
      saveGame(this.state);
    }
  }

  // ------------------------------------------------------------------ world interface
  stats(): Stats {
    return computeStats(this.state);
  }

  hitStop(seconds: number): void {
    this.stopT = Math.max(this.stopT, seconds);
  }

  shake(duration: number, intensity: number): void {
    this.cameras.main.shake(duration * 1000, intensity);
  }

  playerPos(): { x: number; y: number } {
    return { x: this.player.x, y: this.player.y };
  }

  isSolidAt(x: number, y: number): boolean {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || tx >= this.level.cols) return true;
    if (ty < 0) return false;
    if (ty >= this.level.rows) return true;
    const ch = this.level.grid[ty][tx];
    if (ch === "#" || ch === "B") return true;
    if ((ch === "=" || ch === "-") && y - ty * TILE < 6) return true;
    if (this.gate?.closed && Math.abs(x - this.gate.x) < 8) return true;
    return false;
  }

  sfx(n: SfxName): void {
    Sfx.play(n);
  }

  // ------------------------------------------------------------------ build
  private buildParallax(): void {
    const S = this.level.sectionStarts, ruinsX = S[2].x, bossX = S[3].x, forestX = S[1].x;
    const w = (from: number, to: number) => (x: number) => Phaser.Math.Clamp((x - from) / (to - from), 0, 1);
    const day = (x: number) => 1 - w(ruinsX - 200, ruinsX + 60)(x);
    const dusk = (x: number) => w(ruinsX - 200, ruinsX + 60)(x) * (1 - w(bossX - 160, bossX + 40)(x));
    const gloam = (x: number) => w(bossX - 160, bossX + 40)(x);
    const forest = (x: number) => w(forestX - 120, forestX + 80)(x) * (1 - w(ruinsX - 160, ruinsX + 40)(x));
    const add = (key: string, f: number, fy: number, region?: (x: number) => number, drift?: number) => {
      const img = this.add.tileSprite(0, 0, GAME_W, GAME_H, key).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.sky + this.parallax.length);
      this.parallax.push({ img, f, fy, region, drift });
    };
    add("sky-day", 0, 0, day);
    add("sky-dusk", 0, 0, (x) => dusk(x));
    add("sky-gloam", 0, 0, gloam);
    add("clouds", 0.04, 0.02, (x) => day(x) * 0.9 + dusk(x) * 0.4, 3);
    add("mountains", 0.1, 0.05);
    add("hills", 0.25, 0.12, (x) => 1 - w(ruinsX - 160, ruinsX + 40)(x));
    add("ruins-far", 0.25, 0.12, (x) => w(ruinsX - 160, ruinsX + 40)(x));
    add("forest-near", 0.45, 0.2, forest);
  }

  private buildCollision(): void {
    const L = this.level;
    const data = L.grid.map((r) => [...r].map((ch) => (ch === "#" || ch === "B" ? 1 : ch === "=" || ch === "-" ? 2 : -1)));
    if (!this.textures.exists("collision-tiles")) {
      const cv = document.createElement("canvas");
      cv.width = 48; cv.height = 16;
      this.textures.addCanvas("collision-tiles", cv);
    }
    const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const ts = map.addTilesetImage("collision-tiles", "collision-tiles", TILE, TILE, 0, 0)!;
    this.layer = map.createLayer(0, ts, 0, 0)!.setVisible(false);
    this.layer.setCollision([1, 2]);
    this.layer.forEachTile((t: Phaser.Tilemaps.Tile) => {
      if (t.index === 2) t.setCollision(false, false, true, false);
    });
  }

  private oneWayFilter(tile: Phaser.Tilemaps.Tile, isPlayer: boolean): boolean {
    if (tile.index !== 2) return true;
    if (isPlayer && this.player.dropThrough > 0) return false;
    return true;
  }

  private buildWater(): void {
    const g = this.level.grid;
    for (let y = 0; y < g.length; y++) {
      let x = 0;
      while (x < g[y].length) {
        if (g[y][x] === "~" && (y === 0 || g[y - 1][x] !== "~")) {
          let x1 = x;
          while (x1 < g[y].length && g[y][x1] === "~") x1++;
          const n = x1 - x;
          for (let i = 0; i < n; i++) {
            this.add.sprite((x + i) * TILE, y * TILE + 2, "water").setOrigin(0).setDepth(DEPTH.water).setAlpha(0.88).play({ key: "water", startFrame: i % 4 });
          }
          x = x1;
        } else x++;
      }
    }
  }

  private spawnEntities(): void {
    const st = this.state, S = this.level.sectionStarts;
    const bossArena = { left: S[3].x + 12 * TILE, right: S[3].x + 31 * TILE, floor: 12 * TILE };
    for (const s of this.level.spawns) {
      switch (s.ch) {
        case "S": if (!st.defeated.includes(s.id)) this.enemies.push(new Slime(this, s.x, s.y, s.id)); break;
        case "W": if (!st.defeated.includes(s.id)) this.enemies.push(new Wing(this, s.x, s.y, s.id)); break;
        case "K": if (!st.defeated.includes(s.id)) this.enemies.push(new Knight(this, s.x, s.y, s.id)); break;
        case "X":
          if (!st.flags.bossDefeated) {
            this.boss = new Boss(this, s.x, s.y, s.id, bossArena);
            this.enemies.push(this.boss);
          }
          break;
        case "C": if (!st.opened.includes(s.id)) this.addPickup("coin", s.x, s.y - 6, false, s.id); break;
        case "!": if (!st.opened.includes(s.id)) this.addPickup("tonic", s.x, s.y - 6, false, s.id); break;
        case "N": this.addInteract("elder", s, this.add.sprite(s.x, s.y, "elder").setOrigin(0.5, 1).setDepth(DEPTH.props).play("elder-idle").setFlipX(true)); break;
        case "s": this.addInteract("sign", s, this.add.sprite(s.x, s.y, "sign").setOrigin(0.5, 1).setDepth(DEPTH.props)); break;
        case "H": {
          const id = `shrine:${s.id}`;
          const lit = st.checkpoint.id === id;
          this.addInteract("shrine", s, this.add.sprite(s.x, s.y, "shrine", lit ? 1 : 0).setOrigin(0.5, 1).setDepth(DEPTH.props), id);
          break;
        }
        case "1": case "2": case "3": {
          const open = st.opened.includes(s.id);
          this.addInteract("chest", s, this.add.sprite(s.x, s.y, "chest", open ? 1 : 0).setOrigin(0.5, 1).setDepth(DEPTH.props), s.ch);
          break;
        }
        case "Z": {
          this.add.image(s.x, s.y, "pedestal").setOrigin(0.5, 1).setDepth(DEPTH.props);
          if (!st.abilities.includes("double-jump")) {
            const f = this.add.sprite(s.x, s.y - 18, "feather").setDepth(DEPTH.pickups);
            this.tweens.add({ targets: f, y: s.y - 22, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
            this.addInteract("feather", s, f);
          }
          break;
        }
        case "G": {
          const img = this.physics.add.staticImage(s.x, s.y - 32, "gate").setDepth(DEPTH.props);
          this.gate = { sprite: img as unknown as Phaser.Physics.Arcade.Image, x: s.x, closed: false };
          img.setY(s.y - 32 - 64).setVisible(true);
          (img.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
          if (st.flags.bossDefeated) img.setVisible(false);
          break;
        }
        case "T": this.add.image(s.x, s.y + 1, (s.tx % 2 ? "tree0" : "tree1")).setOrigin(0.5, 1).setDepth(DEPTH.decorBack); break;
        case "h": this.add.image(s.x, s.y, "house").setOrigin(0.5, 1).setDepth(DEPTH.decorBack); break;
        case "b": this.add.image(s.x, s.y + 1, "bush").setOrigin(0.5, 1).setDepth(DEPTH.decorBack + 1); break;
        case "l": this.add.image(s.x, s.y, "lamp").setOrigin(0.5, 1).setDepth(DEPTH.decorBack); break;
        case "r": this.add.image(s.x, s.y, s.tx % 2 ? "pillar" : "pillar-broken").setOrigin(0.5, 1).setDepth(DEPTH.decorBack); break;
        case "t": this.add.sprite(s.x, s.y - 14, "torch").setOrigin(0.5, 1).setDepth(DEPTH.decorBack).play({ key: "torch", startFrame: s.tx % 3 }); break;
      }
    }
  }

  private addInteract(kind: Interactable["kind"], s: Spawn, sprite: Phaser.GameObjects.Sprite, data?: string): void {
    this.interactables.push({ kind, x: s.x, y: s.y, id: s.id, sprite, data });
  }

  private addPickup(kind: Pickup["kind"], x: number, y: number, physics: boolean, id?: string): Pickup {
    const tex = kind === "coin" ? "coin" : kind === "shard" ? "shard" : kind === "heart" ? "gloam-heart" : "icons";
    const sp = this.physics.add.sprite(x, y, tex, kind === "tonic" ? 0 : 0).setDepth(DEPTH.pickups);
    if (kind === "coin") sp.play({ key: "coin-spin", startFrame: Math.floor(x / 16) % 4 });
    if (kind === "shard") sp.play("shard-glint");
    const body = sp.body as Phaser.Physics.Arcade.Body;
    if (physics) {
      body.setSize(6, 6).setBounce(0.45).setDrag(40, 0);
      this.physics.add.collider(sp, this.layer);
    } else {
      body.setAllowGravity(false);
      this.tweens.add({ targets: sp, y: y - 2, duration: 700 + (x % 5) * 60, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
    const p: Pickup = { sprite: sp, kind, id, age: physics ? 0 : 99 };
    this.pickups.push(p);
    return p;
  }

  // ------------------------------------------------------------------ combat
  playerSlash(box: Phaser.Geom.Rectangle, mul: number, dir: number, hitSet: Set<unknown>): boolean {
    let hit = false;
    for (const e of this.enemies) {
      if (e.dead || hitSet.has(e) || !e.active) continue;
      const b = e.body;
      if (!Phaser.Geom.Rectangle.Overlaps(box, new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height))) continue;
      if (e instanceof Boss && !e.awake) continue;
      hitSet.add(e);
      hit = true;
      this.damageEnemy(e, mul, dir, "hit");
    }
    return hit;
  }

  private damageEnemy(e: Enemy, mul: number, dir: number, fxName: FxName): void {
    const st = this.stats(), crit = Math.random() < 0.1;
    const dmg = calcDamage(st.attack, e.def.defense, mul, crit);
    const killed = e.takeHit(dmg, dir, 1);
    const c = e.center;
    this.fx.play(fxName, c.x + dir * 3, c.y + 2, { flip: dir < 0 });
    this.fx.play("damage", c.x, e.body.y - 2, { text: `${crit ? "!" : "-"}${dmg}` });
    this.hitStop(killed ? 0.09 : crit ? 0.07 : 0.045);
    if (killed) this.shake(0.12, 0.004);
    Sfx.play("hit");
    if (killed) this.onEnemyKilled(e);
  }

  private onEnemyKilled(e: Enemy): void {
    const c = e.center, st = this.state;
    if (e instanceof Boss) return this.onBossKilled(e);
    this.fx.play("enemyDeath", c.x, e.body.bottom);
    Sfx.play("enemyDeath");
    st.defeated.push(e.spawnId);
    e.setActive(false).setVisible(false);
    e.body.enable = false;
    const [lo, hi] = e.def.coins;
    const n = lo + Math.floor(Math.random() * (hi - lo + 1));
    for (let i = 0; i < Math.min(n, 6); i++) this.dropPickup("coin", c.x, c.y);
    if (wantsQuestDrop(st, "cleanse") && this.pickups.filter((k) => k.kind === "shard").length + (st.inventory["gloam-shard"] ?? 0) < 5) this.dropPickup("shard", c.x, c.y);
    if (Math.random() < e.def.dropChanceTonic) this.dropPickup("tonic", c.x, c.y);
    this.gainXp(e.def.xp, c.x, c.y - 12);
  }

  private dropPickup(kind: Pickup["kind"], x: number, y: number): void {
    const p = this.addPickup(kind, x, y - 4, true);
    p.sprite.setVelocity(Phaser.Math.Between(-70, 70), Phaser.Math.Between(-210, -140));
  }

  gainXp(xp: number, x: number, y: number): void {
    this.ui.floatText(`+${xp} XP`, x, y, 0xc8a0ff);
    const levels = addXp(this.state, xp);
    if (levels > 0) this.levelUpFx();
  }

  private levelUpFx(): void {
    const f = heroIdleFrame!;
    const mask = { w: f.w, h: f.h, data: Uint8Array.from(f.data, (v) => (v ? 1 : 0)) };
    const actor = { mask, pixels: f.data, x: -10, y: -24, w: f.w, h: f.h, k: 1, head: [0, -20], chest: [0, -12] };
    this.fx.play("levelUp", this.player.x, this.player.y, { actor, flip: this.player.facing < 0 }, () => (this.player.active ? { x: this.player.x, y: this.player.y } : null));
    Sfx.play("levelUp");
    this.ui.toast(`Level ${this.state.level}! HP, ATK and DEF rose.`);
  }

  spawnPlayerBolt(x: number, y: number, dir: number): void {
    const sprite = this.add.image(x, y, "firebolt").setVisible(false);
    const fx = this.fx.play("fireball", x, y, { flip: dir < 0 }, () => (sprite.active ? { x: sprite.x, y: sprite.y, flip: dir < 0 } : null));
    this.bolts.push({ sprite, dir, life: 0.9, fx });
  }

  private updateBolts(dt: number): void {
    for (const b of this.bolts) {
      b.life -= dt;
      b.sprite.x += b.dir * 240 * dt;
      let hit = this.isSolidAt(b.sprite.x + b.dir * 3, b.sprite.y) && !this.isOneWayAt(b.sprite.x, b.sprite.y);
      for (const e of this.enemies) {
        if (hit) break;
        if (e.dead || !e.active || (e instanceof Boss && !e.awake)) continue;
        const r = e.body;
        if (b.sprite.x > r.x - 3 && b.sprite.x < r.right + 3 && b.sprite.y > r.y - 3 && b.sprite.y < r.bottom + 3) {
          this.damageEnemy(e, 1.6, b.dir, "fireHit");
          hit = true;
        }
      }
      if (hit) {
        if (!this.bolts.some((o) => o === b && o.life <= 0)) this.fx.play("fireHit", b.sprite.x, b.sprite.y);
        b.life = 0;
      }
      if (b.life <= 0) {
        b.fx.fx.stop();
        b.sprite.destroy();
      }
    }
    this.bolts = this.bolts.filter((b) => b.life > 0);
  }

  private isOneWayAt(x: number, y: number): boolean {
    const ch = this.level.grid[Math.floor(y / TILE)]?.[Math.floor(x / TILE)];
    return ch === "=" || ch === "-";
  }

  damagePlayer(amount: number, fromX: number): void {
    if (this.player.invulnerable || this.ended) return;
    const st = this.stats();
    const dmg = Math.max(1, Math.round(amount - st.defense * 0.5));
    this.state.hp = Math.max(0, this.state.hp - dmg);
    this.player.hurt(fromX);
    this.fx.play("damagePlayer", this.player.x, this.player.y - 26, { text: `-${dmg}` });
    this.fx.play("hit", this.player.x, this.player.y - 12, { palette: ["#1a0508", "#4a0b12", "#8c1420", "#d42a2e", "#ff5a4a", "#ffd8cc", "#ffffff"] });
    this.hitStop(0.08);
    this.shake(0.18, 0.006);
    Sfx.play("hurt");
    if (this.state.hp <= 0) this.killPlayer();
  }

  private killPlayer(): void {
    this.player.die();
    this.dyingT = 0;
    Sfx.music(null);
    Sfx.play("gameOver");
  }

  // ------------------------------------------------------------------ interaction
  private nearestInteractable(): Interactable | null {
    let best: Interactable | null = null, bd = 1e9;
    for (const it of this.interactables) {
      if (!it.sprite.active) continue;
      if (it.kind === "chest" && this.state.opened.includes(it.id)) continue;
      const dx = Math.abs(it.x - this.player.x), dy = Math.abs(it.y - this.player.y);
      if (dx < 18 && dy < 28 && dx < bd) { bd = dx; best = it; }
    }
    return best;
  }

  private interact(it: Interactable): void {
    const st = this.state;
    switch (it.kind) {
      case "elder": {
        const q = questOf(st, "cleanse");
        syncQuest(st, "cleanse");
        const key = st.flags.bossDefeated ? "boss" : q.state;
        const lines: DialogueLine[] = ELDER_DIALOGUE[key];
        this.talk(lines, () => {
          if (q.state === "inactive") {
            acceptQuest(st, "cleanse");
            this.ui.toast("Quest: Shards of the Gloam");
            Sfx.play("checkpoint");
            saveGame(st);
          } else if (q.state === "ready") {
            const r = completeQuest(st, "cleanse");
            if (r) {
              Sfx.play("levelUp");
              this.fx.play("checkpoint", this.player.x, this.player.y, { palette: ["#2a1405", "#7a4612", "#c47f1e", "#f2c03a", "#fff0a0", "#ffffff"] });
              this.ui.toast(`Quest complete! +${r.xp} XP, +${r.coins} coins. Learned SUNSPARK (K)`);
              if (r.levels > 0) this.levelUpFx();
              saveGame(st);
            }
          }
        });
        break;
      }
      case "sign":
        this.talk(SIGN_TEXT);
        break;
      case "chest": {
        if (st.opened.includes(it.id)) return;
        st.opened.push(it.id);
        it.sprite.setFrame(1);
        const loot = CHEST_LOOT[it.data!];
        addItem(st, loot.item);
        st.coins += loot.coins;
        Sfx.play("chest");
        this.fx.play("coin", it.x, it.y - 6);
        this.ui.toast(`Found ${ITEMS[loot.item].name}! (+${loot.coins} coins) Press I to equip.`);
        if (it.id.startsWith("1")) { st.flags.secret = true; this.ui.toast("Secret found!"); }
        break;
      }
      case "shrine":
        this.activateShrine(it);
        break;
      case "feather":
        this.takeFeather(it);
        break;
    }
  }

  private talk(lines: DialogueLine[], done?: () => void): void {
    this.player.lock(true);
    this.ui.showDialogue(lines, () => {
      this.player.lock(false);
      done?.();
    });
  }

  private activateShrine(it: Interactable): void {
    const id = it.data!;
    const st = this.state;
    st.hp = this.stats().maxHp;
    if (st.checkpoint.id === id) return;
    st.checkpoint = { id, x: it.x, y: it.y };
    for (const o of this.interactables) if (o.kind === "shrine") o.sprite.setFrame(o === it ? 1 : 0);
    this.fx.play("checkpoint", it.x, it.y);
    Sfx.play("checkpoint");
    saveGame(st);
    this.ui.toast("Shrine awakened. Progress saved, HP restored.");
  }

  private takeFeather(it: Interactable): void {
    const st = this.state;
    if (st.abilities.includes("double-jump")) return;
    st.abilities.push("double-jump");
    addItem(st, "zephyr-feather");
    this.player.refreshAbilities();
    it.sprite.destroy();
    this.fx.play("checkpoint", it.x, it.y, { palette: ["#14304a", "#2a6a9a", "#5ab0e0", "#9be3f2", "#e6faff", "#ffffff"] });
    Sfx.play("levelUp");
    saveGame(st);
    this.ui.toast("Zephyr Feather! Press SPACE in mid-air to jump again.");
  }

  // ------------------------------------------------------------------ boss
  private updateBossGate(): void {
    if (!this.gate || !this.boss || this.state.flags.bossDefeated) return;
    if (!this.gate.closed && this.player.x > this.gate.x + 28 && this.player.mode !== "dead") {
      this.gate.closed = true;
      const s = this.gate.sprite;
      this.tweens.add({ targets: s, y: this.gate.sprite.y + 64, duration: 260, ease: "Bounce.easeOut", onComplete: () => (s.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject() });
      Sfx.play("gate");
      this.shake(0.2, 0.006);
      this.time.delayedCall(400, () => {
        this.boss?.wake();
        this.ui.bossBar(this.boss!.def.name, 1);
        Sfx.music("boss");
      });
    }
  }

  private onBossKilled(b: Boss): void {
    b.killFx();
    this.ui.bossBar(null, 0);
    Sfx.music(null);
    Sfx.play("boom");
    this.hitStop(0.25);
    this.shake(1.2, 0.01);
    this.fx.play("bossDeath", b.x, b.y - 4);
    this.state.flags.bossDefeated = true;
    this.state.defeated.push(b.spawnId);
    this.tweens.add({ targets: b, alpha: 0, delay: 600, duration: 1400, onComplete: () => b.setVisible(false) });
    b.body.enable = false;
    this.time.delayedCall(1400, () => {
      const h = this.addPickup("heart", b.x, b.y - 30, true);
      h.sprite.setVelocity(0, -160);
    });
    this.gainXp(b.def.xp, b.x, b.y - 50);
    this.state.coins += 30;
    if (this.gate) {
      const s = this.gate.sprite;
      this.gate.closed = false;
      this.tweens.add({ targets: s, y: s.y - 64, duration: 900, delay: 1500 });
    }
  }

  private finish(): void {
    if (this.ended) return;
    this.ended = true;
    this.player.celebrate();
    Sfx.play("victory");
    this.fx.play("levelUp", this.player.x, this.player.y, { text: "VICTORY!" });
    this.state.flags.gameComplete = true;
    saveGame(this.state);
    this.time.delayedCall(3000, () => {
      this.cameras.main.fadeOut(800, 255, 248, 236);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.stop("UI");
        this.scene.start("Victory", { state: this.state });
      });
    });
  }

  // ------------------------------------------------------------------ loop
  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs, 50) / 1000;
    this.state.playTime += dt;
    const c = this.controls;

    if (this.stopT > 0) {
      // hit-stop: freeze the world, effects included, for a few frames
      this.stopT -= dt;
      this.physics.world.isPaused = true;
      this.anims.pauseAll();
      this.fx.render();
      return;
    }
    if (this.physics.world.isPaused) {
      this.physics.world.isPaused = false;
      this.anims.resumeAll();
    }

    if (!this.ui.dialogueOpen && !this.ended && this.player.mode !== "dead") {
      if (Controls.pressed(c.pause)) return this.openOverlay("Pause");
      if (Controls.pressed(c.inventory)) return this.openOverlay("Inventory");
    }

    this.player.update(dt);
    for (const e of this.enemies) e.tick(dt);
    this.updateBolts(dt);
    this.updateHazards(dt);
    this.updatePickups(dt);
    this.updateBossGate();
    if (this.boss && this.boss.awake && !this.boss.dead) this.ui.bossBar(this.boss.def.name, this.boss.hp / this.boss.def.hp);

    // interaction prompt
    const near = this.player.mode === "normal" ? this.nearestInteractable() : null;
    this.ui.prompt(near && near.kind !== "shrine" ? { x: near.x, y: near.y - (near.kind === "feather" ? 30 : near.sprite.height + 4) } : null);
    if (near && Controls.pressed(c.interact) && !this.ui.dialogueOpen) this.interact(near);
    // shrines wake when touched
    for (const it of this.interactables)
      if (it.kind === "shrine" && Math.abs(it.x - this.player.x) < 14 && Math.abs(it.y - this.player.y) < 40 && this.state.checkpoint.id !== it.data && this.player.mode !== "dead") this.activateShrine(it);

    // secret wall fades when you're inside it
    const tx = Math.floor(this.player.x / TILE), ty = Math.floor((this.player.y - 8) / TILE);
    const inside = this.level.grid[ty]?.[tx] === "f" || this.inCave(tx, ty);
    this.secretAlpha = Phaser.Math.Linear(this.secretAlpha, inside ? 0.18 : 1, 0.15);
    this.secret.setAlpha(this.secretAlpha);
    if (inside && !this.state.flags.secretSeen) {
      this.state.flags.secretSeen = true;
      this.ui.toast("A hidden hollow!");
      Sfx.play("shard");
    }

    // falling out of the world
    if (this.player.y > this.level.height + 40 && this.player.mode !== "dead") this.hazardRespawn(2);

    // death -> game over
    if (this.dyingT >= 0) {
      this.dyingT += dt;
      if (this.dyingT > 1.6) {
        this.dyingT = -1;
        this.scene.pause();
        this.scene.launch("GameOver");
      }
    }

    this.updateSection();
    this.updateCamera(dt);
    this.fx.update(dt);
    this.fx.render();
  }

  private inCave(tx: number, ty: number): boolean {
    // the hollow behind a false wall: open cell, earth overhead, a false wall somewhere to the left on this row
    const g = this.level.grid;
    if (g[ty]?.[tx] !== "." || g[ty - 1]?.[tx] !== "#") return false;
    for (let i = 1; i < 9; i++) if (g[ty]?.[tx - i] === "f") return true;
    return false;
  }

  private openOverlay(key: "Pause" | "Inventory"): void {
    Sfx.play("ui");
    this.scene.pause();
    this.scene.launch(key, { state: this.state });
  }

  /** Called by overlays when they close. */
  onResume(): void {
    this.player.refreshAbilities();
    this.state.hp = Math.min(this.state.hp, this.stats().maxHp);
  }

  private updateHazards(dt: number): void {
    const pb = this.player.body, pr = new Phaser.Geom.Rectangle(pb.x, pb.y, pb.width, pb.height);
    this.hazardCd = Math.max(0, this.hazardCd - dt);
    if (this.player.mode === "dead") return;
    for (const e of this.enemies) {
      if (e.dead || !e.active) continue;
      if (e instanceof Boss) {
        for (const h of e.hazards) if (Phaser.Geom.Rectangle.Overlaps(pr, h.rect)) this.damagePlayer(e.def.attack + h.dmg - 2, h.rect.centerX);
        if (!e.awake) continue;
      }
      if (e instanceof Knight && e.strikeBox && Phaser.Geom.Rectangle.Overlaps(pr, e.strikeBox)) this.damagePlayer(e.def.attack, e.x);
      const eb = e.body;
      if (e.contactDamage && Phaser.Geom.Rectangle.Overlaps(pr, new Phaser.Geom.Rectangle(eb.x + 1, eb.y + 1, eb.width - 2, eb.height - 2)))
        this.damagePlayer(Math.max(1, e.def.attack - (e instanceof Knight ? 2 : 0)), eb.center.x);
    }
    // thorns and water
    const feetY = pb.bottom - 2, cells = [pb.left + 2, pb.center.x, pb.right - 2].map((x) => this.level.grid[Math.floor(feetY / TILE)]?.[Math.floor(x / TILE)]);
    if (cells.includes("^") && feetY % TILE > 6) this.damagePlayer(2, this.player.x - this.player.facing * 10);
    if (cells.includes("~") && feetY % TILE > 4) this.hazardRespawn(1);
  }

  private hazardRespawn(dmg: number): void {
    if (this.hazardCd > 0) return;
    this.hazardCd = 0.5;
    this.fx.play("hit", this.player.x, this.player.y - 8, { palette: ["#0a1430", "#1a2f5a", "#28508a", "#3f7fc0", "#7cc4ec", "#d0f2ff", "#ffffff"] });
    Sfx.play("hurt");
    this.state.hp = Math.max(0, this.state.hp - dmg);
    if (this.state.hp <= 0) {
      this.player.setVelocity(0, 0);
      this.player.setPosition(this.player.lastSafe.x, this.player.lastSafe.y);
      return this.killPlayer();
    }
    this.cameras.main.flash(150, 120, 160, 255);
    this.player.revive(this.player.lastSafe.x, this.player.lastSafe.y);
  }

  private updatePickups(dt: number): void {
    const p = this.player, st = this.state;
    for (const k of this.pickups) {
      if (!k.sprite.active) continue;
      k.age += dt;
      if (k.age < 0.35) continue;
      const dx = k.sprite.x - p.x, dy = k.sprite.y - (p.y - 10);
      // magnet: dropped loot drifts to you once it settles
      if (k.age > 0.6 && k.age < 99 && Math.hypot(dx, dy) < 40 && k.kind !== "heart") {
        k.sprite.x -= dx * Math.min(1, dt * 6);
        k.sprite.y -= dy * Math.min(1, dt * 6);
      }
      if (Math.abs(dx) > 11 || Math.abs(dy) > 16 || p.mode === "dead") continue;
      k.sprite.destroy();
      if (k.id) st.opened.push(k.id);
      switch (k.kind) {
        case "coin":
          st.coins++;
          Sfx.play("coin");
          this.fx.play("coin", k.sprite.x, k.sprite.y + 6);
          break;
        case "shard":
          addItem(st, "gloam-shard");
          syncQuest(st, "cleanse");
          Sfx.play("shard");
          this.fx.play("shard", k.sprite.x, k.sprite.y + 6);
          {
            const q = questOf(st, "cleanse");
            if (q.state === "ready") this.ui.toast("5 Gloam Shards! Return to Elder Moss.");
            else if (q.state === "active") this.ui.toast(`Gloam Shard ${q.progress}/5`);
            else this.ui.toast("A Gloam Shard. Someone in the village may want this.");
          }
          break;
        case "tonic":
          addItem(st, "berry-tonic");
          Sfx.play("heal");
          this.fx.play("heal", k.sprite.x, k.sprite.y + 6);
          this.ui.toast("Berry Tonic! Use it from the inventory (I).");
          break;
        case "heart":
          this.fx.play("checkpoint", k.sprite.x, k.sprite.y + 8, { palette: ["#2a0f3a", "#5a1f78", "#9a3fc0", "#d77df0", "#ffd0ff", "#ffffff"] });
          this.finish();
          break;
      }
    }
    this.pickups = this.pickups.filter((k) => k.sprite.active);
  }

  private updateSection(): void {
    const s = sectionAtX(this.level, this.player.x);
    if (s.id === this.section) return;
    this.section = s.id;
    this.ui.banner(s.name);
    if (!(s.id === "boss" && !this.gate?.closed)) Sfx.music(s.music as "vale");
    this.ambience?.fx.stop();
    this.ambience = s.ambience ? this.fx.playScreen(s.ambience as FxName) : null;
  }

  private updateCamera(dt: number): void {
    const target = this.player.facing * 24;
    this.lookAhead = Phaser.Math.Linear(this.lookAhead, target, Math.min(1, dt * 2.5));
    this.cameras.main.setFollowOffset(-this.lookAhead, 20);
    const cam = this.cameras.main;
    for (const l of this.parallax) {
      l.img.tilePositionX = cam.scrollX * l.f + (l.drift ? this.state.playTime * l.drift : 0);
      l.img.tilePositionY = (cam.scrollY - 60) * l.fy;
      if (l.region) l.img.setAlpha(l.region(cam.scrollX + GAME_W / 2));
    }
  }
}
