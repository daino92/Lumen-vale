import { MOVE } from "../config/constants";

/**
 * The pure jump-feel logic (coyote time, jump buffering, double jump), separate from Phaser so it can be tested.
 * Feed it ground contact and button events every tick; it tells you when to launch.
 */
export class JumpController {
  coyote = 0;
  buffer = 0;
  airJumpsUsed = 0;
  jumping = false;

  constructor(public airJumps = 0) {}

  /** Returns "ground" | "air" | null: which jump to perform this tick. */
  tick(dt: number, onGround: boolean, pressed: boolean): "ground" | "air" | null {
    if (onGround) {
      this.coyote = MOVE.coyoteTime;
      this.airJumpsUsed = 0;
      this.jumping = false;
    } else this.coyote = Math.max(0, this.coyote - dt);
    if (pressed) this.buffer = MOVE.jumpBuffer;
    else this.buffer = Math.max(0, this.buffer - dt);

    if (this.buffer > 0 && this.coyote > 0) {
      this.buffer = 0;
      this.coyote = 0;
      this.jumping = true;
      return "ground";
    }
    if (pressed && !onGround && this.coyote <= 0 && this.airJumpsUsed < this.airJumps) {
      this.buffer = 0;
      this.airJumpsUsed++;
      this.jumping = true;
      return "air";
    }
    return null;
  }
}
