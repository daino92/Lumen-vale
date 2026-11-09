import Phaser from "phaser";
import { ENEMIES, type EnemyDef, type EnemyKind } from "../data/enemies";
import { DEPTH } from "../config/constants";
import type { World } from "./types";

/** Shared enemy behaviour: health, hit flash, knockback, contact damage. Subclasses add AI in think(). */
export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  def: EnemyDef;
  hp: number;
  dead = false;
  facing = -1;
  protected flashT = 0;
  protected stunT = 0;
  protected t = 0;
  contactDamage = true;
  spawnId: string;

  constructor(protected world: World, x: number, y: number, kind: EnemyKind, texture: string, spawnId: string) {
    super(world, x, y, texture, 0);
    this.def = ENEMIES[kind];
    this.hp = this.def.hp;
    this.spawnId = spawnId;
    world.add.existing(this);
    world.physics.add.existing(this);
    this.setOrigin(0.5, 1).setDepth(DEPTH.enemies);
    const b = this.def.body;
    this.body.setSize(b.w, b.h).setOffset(b.ox, b.oy);
  }

  /** Returns true if this hit killed it. */
  takeHit(dmg: number, dir: number, power = 1): boolean {
    if (this.dead) return false;
    this.hp -= dmg;
    this.flashT = 0.1;
    this.setTintFill(0xffffff);
    const kb = (1 - this.def.knockbackResist) * power;
    if (kb > 0) {
      this.setVelocity(dir * 140 * kb, this.body.allowGravity ? -110 * kb : -40 * kb);
      this.stunT = 0.25 * kb + 0.05;
    }
    this.onHit(dir);
    if (this.hp <= 0) {
      this.dead = true;
      return true;
    }
    return false;
  }

  protected onHit(_dir: number): void {}

  get center(): { x: number; y: number } {
    return { x: this.body.center.x, y: this.body.center.y };
  }

  tick(dt: number): void {
    if (this.dead) return;
    this.t += dt;
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) this.clearTint();
    }
    if (this.stunT > 0) {
      this.stunT -= dt;
      if (this.body.blocked.down) this.setVelocityX(this.body.velocity.x * 0.85);
      return;
    }
    this.think(dt);
    this.setFlipX(this.facing > 0 ? this.flipWhenRight() : !this.flipWhenRight());
  }

  /** Art faces right by default. */
  protected flipWhenRight(): boolean {
    return false;
  }

  protected abstract think(dt: number): void;

  /** Ground ahead and no wall: safe to keep walking this way. */
  protected canWalk(dir: number): boolean {
    const ahead = dir > 0 ? this.body.right + 2 : this.body.left - 2;
    const floor = this.world.isSolidAt(ahead, this.body.bottom + 4);
    const wall = this.world.isSolidAt(ahead, this.body.bottom - 4);
    return floor && !wall;
  }
}

export class Slime extends Enemy {
  private wait = 0.6 + Math.random();
  private home: number;
  constructor(world: World, x: number, y: number, id: string) {
    super(world, x, y, "slime", "slime", id);
    this.home = x;
    this.play("slime-idle");
  }
  protected think(dt: number): void {
    const p = this.world.playerPos(), dx = p.x - this.x;
    // chase only near home: slimes guard their patch of forest
    const near = Math.abs(dx) < 110 && Math.abs(p.y - this.y) < 50 && Math.abs(p.x - this.home) < 120;
    if (this.body.blocked.down) {
      this.setVelocityX(0);
      if (this.anims.currentAnim?.key !== "slime-idle") this.play("slime-idle");
      this.wait -= dt;
      if (this.wait <= 0) {
        let dir = near ? Math.sign(dx) || 1 : this.facing;
        if (!near && Math.abs(this.x - this.home) > 48) dir = Math.sign(this.home - this.x);
        if (!this.canWalk(dir)) dir = -dir;
        this.facing = dir;
        if (this.canWalk(dir)) {
          this.setVelocity(dir * this.def.speed * (near ? 1.1 : 0.8), near ? -200 : -150);
          this.play("slime-hop");
        }
        this.wait = near ? 0.45 + Math.random() * 0.3 : 0.9 + Math.random() * 0.8;
      }
    }
  }
}

export class Wing extends Enemy {
  private home: { x: number; y: number };
  private swoop = 0;
  constructor(world: World, x: number, y: number, id: string) {
    super(world, x, y - 8, "wing", "wing", id);
    this.home = { x, y: y - 8 };
    this.body.setAllowGravity(false);
    this.play("wing-fly");
    this.t = Math.random() * 6;
  }
  protected think(dt: number): void {
    const p = this.world.playerPos(), dx = p.x - this.x, dy = p.y - 12 - this.y;
    const near = Math.hypot(dx, dy) < 100 && Math.abs(p.x - this.home.x) < 160;
    let tx: number, ty: number;
    if (near) {
      this.swoop += dt;
      // circle above the player, then dive on a timer
      const diving = this.swoop % 2.6 > 1.8;
      tx = p.x + (diving ? 0 : Math.cos(this.t * 2) * 30);
      ty = diving ? p.y - 10 : p.y - 46 + Math.sin(this.t * 3) * 6;
    } else {
      this.swoop = 0;
      tx = this.home.x + Math.sin(this.t * 0.8) * 40;
      ty = this.home.y + Math.sin(this.t * 2.1) * 10;
    }
    const sp = near ? 70 : this.def.speed;
    const ang = Math.atan2(ty - this.y, tx - this.x), dist = Math.hypot(tx - this.x, ty - this.y);
    const v = Math.min(sp, dist * 3);
    this.setVelocity(Math.cos(ang) * v, Math.sin(ang) * v);
    if (Math.abs(this.body.velocity.x) > 4) this.facing = Math.sign(this.body.velocity.x);
  }
}

export class Knight extends Enemy {
  private mode: "walk" | "windup" | "strike" | "rest" = "walk";
  private st = 0;
  private home: number;
  strikeBox: Phaser.Geom.Rectangle | null = null;
  constructor(world: World, x: number, y: number, id: string) {
    super(world, x, y, "knight", "knight", id);
    this.home = x;
    this.play("knight-walk");
    this.body.setSize(12, 22).setOffset(6, 5);
  }
  protected onHit(dir: number): void {
    // a heavy hit interrupts the wind-up
    if (this.mode === "windup" && this.hp < this.def.hp / 2) { this.mode = "rest"; this.st = 0; this.play("knight-walk"); }
    this.facing = -dir;
  }
  protected think(dt: number): void {
    this.st += dt;
    this.strikeBox = null;
    const p = this.world.playerPos(), dx = p.x - this.x, near = Math.abs(dx) < 120 && Math.abs(p.y - this.y) < 40;
    switch (this.mode) {
      case "walk": {
        let dir = near ? Math.sign(dx) || 1 : this.facing;
        if (!near && Math.abs(this.x - this.home) > 56) dir = Math.sign(this.home - this.x);
        if (!this.canWalk(dir)) { dir = near ? 0 : -dir; }
        if (dir) this.facing = dir;
        this.setVelocityX(dir * this.def.speed * (near ? 1.4 : 1));
        if (this.anims.currentAnim?.key !== "knight-walk") this.play("knight-walk");
        this.anims.timeScale = dir ? 1 : 0;
        if (near && Math.abs(dx) < 34) { this.mode = "windup"; this.st = 0; this.play("knight-windup"); this.setVelocityX(0); this.facing = Math.sign(dx) || this.facing; }
        break;
      }
      case "windup":
        this.setVelocityX(0);
        // telegraph: shake in place
        this.x += Math.sin(this.st * 80) * 0.3;
        if (this.st > 0.5) { this.mode = "strike"; this.st = 0; this.play("knight-strike"); this.setVelocityX(this.facing * 90); }
        break;
      case "strike":
        this.setVelocityX(this.body.velocity.x * 0.85);
        if (this.st < 0.18) this.strikeBox = new Phaser.Geom.Rectangle(this.facing > 0 ? this.x : this.x - 28, this.y - 24, 28, 22);
        if (this.st > 0.4) { this.mode = "rest"; this.st = 0; this.play("knight-walk"); this.anims.timeScale = 0; }
        break;
      case "rest":
        this.setVelocityX(0);
        if (this.st > 0.7) { this.mode = "walk"; this.st = 0; }
        break;
    }
  }
}
