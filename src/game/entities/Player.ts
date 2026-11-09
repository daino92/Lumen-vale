import Phaser from "phaser";
import { MOVE, DEPTH } from "../config/constants";
import { JumpController } from "../systems/platformerTimers";
import { Controls } from "../systems/Controls";
import { approach } from "../utils/rng";
import { Sfx } from "../audio/Sfx";
import { ABILITIES } from "../data/abilities";
import type { World } from "./types";

type Mode = "normal" | "attack" | "cast" | "hurt" | "dead" | "victory" | "locked";

const ATTACK_TIME = 0.26, ATTACK_COOLDOWN = 0.3, HIT_START = 0.04, HIT_END = 0.14;

export class Player extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  mode: Mode = "normal";
  facing = 1;
  jump = new JumpController(0);
  private modeT = 0;
  private attackCd = 0;
  private castCd = 0;
  private invuln = 0;
  private wasGround = true;
  private prevVy = 0;
  private cut = false;
  private hitSet = new Set<unknown>();
  private slashed = false;
  private stepT = 0;
  dropThrough = 0;
  lastSafe = { x: 0, y: 0 };
  private safeT = 0;

  constructor(private world: World, x: number, y: number) {
    super(world, x, y, "hero", 0);
    world.add.existing(this);
    world.physics.add.existing(this);
    this.setOrigin(10 / 24, 1).setDepth(DEPTH.player);
    this.body.setSize(10, 20).setOffset(5, 4);
    this.body.setMaxVelocityY(MOVE.maxFall);
    this.play("hero-idle");
    this.lastSafe = { x, y };
  }

  get feet(): { x: number; y: number } {
    return { x: this.body.center.x, y: this.body.bottom };
  }

  get invulnerable(): boolean {
    return this.invuln > 0 || this.mode === "dead" || this.mode === "victory";
  }

  refreshAbilities(): void {
    this.jump.airJumps = this.world.state.abilities.includes("double-jump") ? 1 : 0;
  }

  lock(on: boolean): void {
    if (this.mode === "dead" || this.mode === "victory") return;
    this.mode = on ? "locked" : "normal";
    if (on) this.setVelocityX(0);
  }

  hurt(fromX: number): void {
    if (this.invulnerable) return;
    this.mode = "hurt";
    this.modeT = 0;
    this.invuln = MOVE.invulnTime;
    const dir = this.x < fromX ? -1 : 1;
    this.setVelocity(dir * MOVE.knockbackX, MOVE.knockbackY);
    this.play("hero-hurt");
  }

  die(): void {
    this.mode = "dead";
    this.modeT = 0;
    this.setVelocity(0, -120);
    this.setAlpha(1);
    this.play("hero-death");
  }

  celebrate(): void {
    this.mode = "victory";
    this.setVelocityX(0);
    this.play("hero-victory");
  }

  revive(x: number, y: number): void {
    this.setPosition(x, y);
    this.setVelocity(0, 0);
    this.mode = "normal";
    this.invuln = 1.2;
    this.setAlpha(1);
    this.play("hero-idle");
    this.lastSafe = { x, y };
  }

  update(dt: number): void {
    const c = this.world.controls, onGround = this.body.blocked.down;
    this.modeT += dt;
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.castCd = Math.max(0, this.castCd - dt);
    this.dropThrough = Math.max(0, this.dropThrough - dt);
    if (this.invuln > 0) {
      this.invuln -= dt;
      this.setAlpha(this.invuln > 0 && Math.floor(this.invuln * 16) % 2 ? 0.35 : 1);
    }

    if (this.mode === "dead") {
      this.setVelocityX(approach(this.body.velocity.x, 0, 600 * dt));
      return;
    }
    if (this.mode === "victory") {
      this.setVelocityX(approach(this.body.velocity.x, 0, 900 * dt));
      return;
    }

    // remember where we last stood safely, for hazard respawns
    this.safeT += dt;
    if (onGround && this.safeT > 0.25 && this.world.isSolidAt(this.body.left + 1, this.body.bottom + 4) && this.world.isSolidAt(this.body.right - 1, this.body.bottom + 4)) {
      this.safeT = 0;
      this.lastSafe = { x: this.x, y: this.y };
    }

    const locked = this.mode === "locked" || this.mode === "hurt";
    if (this.mode === "hurt" && this.modeT > MOVE.hurtStun) this.mode = "normal";

    const dir = locked ? 0 : (Controls.down(c.right) ? 1 : 0) - (Controls.down(c.left) ? 1 : 0);
    const jumpPressed = !locked && Controls.pressed(c.jump);
    const jumpHeld = Controls.down(c.jump);
    const attackPressed = !locked && Controls.pressed(c.attack);
    const specialPressed = !locked && Controls.pressed(c.special);

    // horizontal: accelerate towards the target speed, slower in the air, slowed while swinging on the ground
    const running = Controls.down(c.run);
    let target = dir * (running ? MOVE.runSpeed : MOVE.walkSpeed);
    if (this.mode === "attack" && onGround) target *= 0.35;
    const accel = onGround ? (dir ? MOVE.groundAccel : MOVE.groundDecel) : dir ? MOVE.airAccel : MOVE.airDecel;
    if (this.mode !== "hurt") this.setVelocityX(approach(this.body.velocity.x, target, accel * dt));
    if (dir && this.mode !== "attack") this.facing = dir;
    this.setFlipX(this.facing < 0);

    // drop through one-way platforms with down + jump
    let jp = jumpPressed;
    if (jp && Controls.down(c.down) && onGround && this.standingOnOneWay()) {
      this.dropThrough = 0.25;
      jp = false;
    }

    // jumping: coyote time, buffering and an optional air jump
    const j = this.mode === "locked" ? null : this.jump.tick(dt, onGround, jp);
    if (j === "ground") {
      this.setVelocityY(MOVE.jumpVelocity);
      this.cut = false;
      Sfx.play("jump");
      this.world.fx.play("jumpDust", this.feet.x, this.feet.y);
    } else if (j === "air") {
      this.setVelocityY(MOVE.doubleJumpVelocity);
      this.cut = false;
      Sfx.play("doubleJump");
      this.world.fx.play("jumpDust", this.feet.x, this.feet.y + 2, { power: 0.3 });
    }
    // variable height: let go early to cut the jump short
    if (!jumpHeld && !this.cut && this.body.velocity.y < 0 && this.jump.jumping) {
      this.setVelocityY(this.body.velocity.y * MOVE.jumpCutMul);
      this.cut = true;
    }
    // heavier on the way down
    this.body.setGravityY(this.body.velocity.y > 0 ? MOVE.gravity * (MOVE.fallGravityMul - 1) : 0);

    // landing
    if (onGround && !this.wasGround && this.prevVy > 160) {
      this.world.fx.play("landDust", this.feet.x, this.feet.y, { power: Math.min(1, this.prevVy / 320) });
      Sfx.play("land");
    }
    // footsteps puff a little when running
    if (onGround && Math.abs(this.body.velocity.x) > 110) {
      this.stepT += dt;
      if (this.stepT > 0.3) { this.stepT = 0; this.world.fx.play("jumpDust", this.feet.x - this.facing * 4, this.feet.y, { power: 0.3 }); }
    }

    // attacks
    if (attackPressed && this.attackCd <= 0 && this.mode === "normal") this.startAttack();
    if (specialPressed && this.mode === "normal") this.tryCast();
    if (this.mode === "attack") this.updateAttack();
    if (this.mode === "cast" && this.modeT > 0.22) this.mode = "normal";

    this.wasGround = onGround;
    this.prevVy = this.body.velocity.y;
    this.pickAnim(onGround);
  }

  private standingOnOneWay(): boolean {
    const l = this.world.level, tx = Math.floor(this.body.center.x / 16), ty = Math.floor((this.body.bottom + 2) / 16);
    const ch = l.grid[ty]?.[tx];
    return ch === "=" || ch === "-";
  }

  private startAttack(): void {
    this.mode = "attack";
    this.modeT = 0;
    this.attackCd = ATTACK_COOLDOWN;
    this.hitSet.clear();
    this.slashed = false;
    this.play("hero-attack", true);
    Sfx.play("attack");
  }

  private updateAttack(): void {
    const t = this.modeT;
    if (!this.slashed && t >= HIT_START - 0.02) {
      this.slashed = true;
      const heavy = this.world.state.equipment.weapon === "ruin-blade";
      this.world.fx.play(heavy ? "slashHeavy" : "slash", this.x + this.facing * 4, this.y - 1, { flip: this.facing < 0 }, () => ({ x: this.x + this.facing * 4, y: this.y - 1, flip: this.facing < 0 }));
    }
    if (t >= HIT_START && t <= HIT_END) {
      const w = 26, h = 22;
      const box = new Phaser.Geom.Rectangle(this.facing > 0 ? this.x - 2 : this.x - w + 2, this.y - 24, w, h);
      this.world.playerSlash(box, 1, this.facing, this.hitSet);
    }
    if (t >= ATTACK_TIME) this.mode = "normal";
  }

  private tryCast(): void {
    const st = this.world.state;
    if (!st.abilities.includes("sunspark") || this.castCd > 0) return;
    this.castCd = ABILITIES.sunspark.cooldown;
    this.mode = "cast";
    this.modeT = 0;
    this.play("hero-cast", true);
    this.world.spawnPlayerBolt(this.x + this.facing * 10, this.y - 13, this.facing);
    Sfx.play("fire");
  }

  get castReady(): number {
    return 1 - this.castCd / ABILITIES.sunspark.cooldown;
  }

  private pickAnim(onGround: boolean): void {
    if (this.mode === "attack" || this.mode === "cast") return;
    if (this.mode === "hurt") return void this.play("hero-hurt", true);
    let k = "hero-idle";
    if (!onGround) k = this.body.velocity.y < 0 ? "hero-jump" : "hero-fall";
    else if (Math.abs(this.body.velocity.x) > 12) k = "hero-run";
    if (this.anims.currentAnim?.key !== k) this.play(k);
    if (k === "hero-run") this.anims.timeScale = Math.abs(this.body.velocity.x) > 110 ? 1.3 : 1;
    else this.anims.timeScale = 1;
  }
}
