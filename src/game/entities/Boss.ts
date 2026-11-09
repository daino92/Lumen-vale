import Phaser from "phaser";
import { Enemy } from "./Enemy";
import { Sfx } from "../audio/Sfx";
import type { World } from "./types";
import { DEPTH } from "../config/constants";

export interface Hazard {
  rect: Phaser.Geom.Rectangle;
  dmg: number;
  kind: string;
}

type Move = "slam" | "orbs" | "lightning" | "ice" | "charge";

/**
 * Thornmaw, the Gloam Warden. Every attack has a readable tell (pose, core glow, floor sigil or frost line) before
 * it can hurt. Below half health it adds ice lines and a charge, and moves faster.
 */
export class Boss extends Enemy {
  awake = false;
  hazards: Hazard[] = [];
  private move: Move | "walk" | "intro" | "dying" = "intro";
  private mt = 0;
  private lastMove: Move | null = null;
  private orbs: { img: Phaser.GameObjects.Sprite; vx: number; vy: number; life: number }[] = [];
  private shocks: { x: number; dir: number; life: number }[] = [];
  private strikes: { x: number; t: number }[] = [];
  private ice: { x: number; dir: number; t: number } | null = null;
  private fired = 0;
  private arena: { left: number; right: number; floor: number };

  constructor(world: World, x: number, y: number, id: string, arena: { left: number; right: number; floor: number }) {
    super(world, x, y, "boss", "boss", id);
    this.arena = arena;
    this.setOrigin(30 / 64, 1);
    this.body.setSize(30, 38).setOffset(15, 17);
    this.body.setImmovable(true);
    this.play("boss-idle");
    this.contactDamage = true;
  }

  get phase2(): boolean {
    return this.hp <= this.def.hp / 2;
  }

  wake(): void {
    if (this.awake) return;
    this.awake = true;
    this.move = "intro";
    this.mt = 0;
    this.world.shake(0.4, 0.006);
    Sfx.play("boom");
  }

  protected think(dt: number): void {
    this.hazards = [];
    this.updateProjectiles(dt);
    if (!this.awake) { this.setVelocityX(0); return; }
    this.mt += dt;
    const p = this.world.playerPos(), dx = p.x - this.x;
    const speedK = this.phase2 ? 1.3 : 1;
    switch (this.move) {
      case "intro":
        this.setFrame(2);
        this.anims.stop();
        if (this.mt > 1.0) this.next("walk");
        break;
      case "walk": {
        if (this.anims.currentAnim?.key !== "boss-idle" || !this.anims.isPlaying) this.play("boss-idle");
        this.facing = Math.sign(dx) || 1;
        const far = Math.abs(dx) > 50;
        this.setVelocityX(far ? this.facing * this.def.speed * 0.6 * speedK : 0);
        if (this.mt > (this.phase2 ? 0.7 : 1.1)) this.pickMove(Math.abs(dx));
        break;
      }
      case "slam": this.doSlam(); break;
      case "orbs": this.doOrbs(p); break;
      case "lightning": this.doLightning(p); break;
      case "ice": this.doIce(p); break;
      case "charge": this.doCharge(dx); break;
      case "dying": break;
    }
    this.x = Phaser.Math.Clamp(this.x, this.arena.left + 22, this.arena.right - 22);
  }

  private pickMove(dist: number): void {
    const pool: Move[] = dist < 70 ? ["slam", "slam", "lightning", "orbs"] : ["orbs", "lightning", "slam"];
    if (this.phase2) pool.push("ice", "charge", dist > 70 ? "charge" : "ice");
    let m = pool[Math.floor(Math.random() * pool.length)];
    if (m === this.lastMove) m = pool[(pool.indexOf(m) + 1) % pool.length];
    this.lastMove = m;
    this.next(m);
  }

  private next(m: Move | "walk"): void {
    this.move = m;
    this.mt = 0;
    this.fired = 0;
    this.anims.stop();
    this.setVelocityX(0);
    if (m !== "walk") Sfx.play("telegraph");
  }

  private doSlam(): void {
    const tell = this.phase2 ? 0.55 : 0.75;
    if (this.mt < tell) {
      this.setFrame(2);
      this.setTint(Math.floor(this.mt * 12) % 2 ? 0xffb0ff : 0xffffff);
      return;
    }
    if (!this.fired) {
      this.fired = 1;
      this.clearTint();
      this.setFrame(3);
      Sfx.play("boom");
      this.world.shake(0.3, 0.012);
      this.world.hitStop(0.06);
      this.world.fx.play("bossSlam", this.x + this.facing * 8, this.arena.floor);
      this.shocks.push({ x: this.x, dir: -1, life: 0.8 }, { x: this.x, dir: 1, life: 0.8 });
      this.hazards.push({ rect: new Phaser.Geom.Rectangle(this.x - 34, this.arena.floor - 20, 68, 20), dmg: 3, kind: "slam" });
    }
    if (this.mt > tell + 0.9) this.next("walk");
  }

  private doOrbs(p: { x: number; y: number }): void {
    this.setFrame(4);
    const n = this.phase2 ? 5 : 3;
    if (this.mt < 0.5) { this.setTint(Math.floor(this.mt * 14) % 2 ? 0xffd0ff : 0xffffff); return; }
    this.clearTint();
    const k = Math.floor((this.mt - 0.5) / 0.28);
    if (k >= this.fired && this.fired < n) {
      this.fired++;
      const sx = this.x + this.facing * 26, sy = this.y - 28;
      const ang = Math.atan2(p.y - 12 - sy, p.x - sx) + (this.fired - (n + 1) / 2) * 0.12;
      const sp = this.phase2 ? 105 : 90;
      const img = this.world.add.sprite(sx, sy, "orb").setDepth(DEPTH.enemies + 1).play("orb");
      this.orbs.push({ img, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 3.5 });
      Sfx.play("shard");
    }
    if (this.mt > 0.5 + n * 0.28 + 0.6) this.next("walk");
  }

  private doLightning(p: { x: number; y: number }): void {
    this.setFrame(2);
    const n = this.phase2 ? 3 : 2;
    // each call marks the floor under the player; the bolt lands 0.76 s later (pixelfx lightning-strike timing)
    const k = Math.floor(this.mt / 0.55);
    if (k >= this.fired && this.fired < n) {
      this.fired++;
      const x = Phaser.Math.Clamp(p.x, this.arena.left + 16, this.arena.right - 16);
      this.strikes.push({ x, t: 0 });
      this.world.fx.play("bossLightning", x, this.arena.floor);
    }
    if (this.mt > n * 0.55 + 1.2) this.next("walk");
  }

  private doIce(p: { x: number; y: number }): void {
    this.setFrame(3);
    if (!this.fired) {
      this.fired = 1;
      const dir = Math.sign(p.x - this.x) || 1;
      this.ice = { x: this.x + dir * 12, dir, t: 0 };
      this.world.fx.play("bossIce", this.x + dir * 12, this.arena.floor, { flip: dir < 0 });
      Sfx.play("ice");
    }
    if (this.mt > 2.0) this.next("walk");
  }

  private doCharge(dx: number): void {
    if (this.mt < 0.6) {
      this.setFrame(4);
      this.facing = Math.sign(dx) || this.facing;
      this.setTint(Math.floor(this.mt * 14) % 2 ? 0xff9090 : 0xffffff);
      this.setVelocityX(-this.facing * 20);
      return;
    }
    this.clearTint();
    if (!this.fired) { this.fired = 1; Sfx.play("boom"); }
    this.setVelocityX(this.facing * 220);
    this.hazards.push({ rect: new Phaser.Geom.Rectangle(this.body.x - 4, this.body.y, this.body.width + 8, this.body.height), dmg: 3, kind: "charge" });
    const hitWall = (this.facing > 0 && this.x >= this.arena.right - 24) || (this.facing < 0 && this.x <= this.arena.left + 24);
    if (hitWall || this.mt > 2) {
      this.setVelocityX(0);
      this.world.shake(0.25, 0.01);
      this.world.fx.play("landDust", this.x + this.facing * 14, this.arena.floor, { power: 1 });
      this.next("walk");
    }
  }

  private updateProjectiles(dt: number): void {
    const floor = this.arena.floor;
    for (const o of this.orbs) {
      o.life -= dt;
      o.img.x += o.vx * dt;
      o.img.y += o.vy * dt;
      if (this.world.isSolidAt(o.img.x, o.img.y) || o.img.y > floor - 2) o.life = 0;
      if (o.life <= 0) { this.world.fx.play("hit", o.img.x, o.img.y, { palette: ["#14061e", "#3a1458", "#6a2a9a", "#a050e0", "#e090ff", "#ffd8ff", "#ffffff"] }); o.img.destroy(); continue; }
      this.hazards.push({ rect: new Phaser.Geom.Rectangle(o.img.x - 4, o.img.y - 4, 8, 8), dmg: 2, kind: "orb" });
    }
    this.orbs = this.orbs.filter((o) => o.life > 0);
    for (const s of this.shocks) {
      s.life -= dt;
      s.x += s.dir * 150 * dt;
      if (s.life > 0.05) this.hazards.push({ rect: new Phaser.Geom.Rectangle(s.x - 6, floor - 9, 12, 9), dmg: 2, kind: "shock" });
    }
    this.shocks = this.shocks.filter((s) => s.life > 0);
    for (const s of this.strikes) {
      s.t += dt;
      if (s.t >= 0.76 && s.t - dt < 0.76) { Sfx.play("zap"); this.world.shake(0.15, 0.006); }
      if (s.t >= 0.76 && s.t < 1.0) this.hazards.push({ rect: new Phaser.Geom.Rectangle(s.x - 14, floor - 120, 28, 120), dmg: 3, kind: "lightning" });
    }
    this.strikes = this.strikes.filter((s) => s.t < 1.3);
    if (this.ice) {
      const i = this.ice;
      i.t += dt;
      // ice-spikes: frost line runs out over 0.44 s, spikes stand until ~1.4 s
      if (i.t > 0.5 && i.t < 1.35) {
        const reach = 150 * Math.min(1, (i.t - 0.04) / 0.4);
        const x0 = i.dir > 0 ? i.x : i.x - reach;
        this.hazards.push({ rect: new Phaser.Geom.Rectangle(x0, floor - 22, reach, 22), dmg: 3, kind: "ice" });
      }
      if (i.t > 1.5) this.ice = null;
    }
  }

  killFx(): void {
    this.move = "dying";
    this.setVelocity(0, 0);
    this.setFrame(5);
    this.anims.stop();
    for (const o of this.orbs) o.img.destroy();
    this.orbs = [];
    this.shocks = [];
    this.strikes = [];
    this.ice = null;
    this.hazards = [];
  }

  resetFight(x: number, y: number): void {
    this.awake = false;
    this.hp = this.def.hp;
    this.dead = false;
    this.setPosition(x, y);
    this.killFx();
    this.move = "intro";
    this.clearTint();
    this.play("boss-idle");
    this.setActive(true).setVisible(true);
    this.body.enable = true;
  }
}
