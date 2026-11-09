import Phaser from "phaser";

/** A set of key codes bound to one action, tied to the Controls instance that tracks them. */
export type Bind = number[] & { ctl: Controls };

/**
 * Keyboard bindings: A/D or arrows move, Space jump, J attack, K special, E interact, I inventory, Esc pause.
 * Presses are latched until the end of the frame, so a tap shorter than one frame is never lost.
 */
export class Controls {
  private held = new Set<number>();
  private pressedNow = new Set<number>();
  private releasedNow = new Set<number>();
  left: Bind; right: Bind; up: Bind; down: Bind; jump: Bind; attack: Bind; special: Bind; interact: Bind;
  inventory: Bind; pause: Bind; run: Bind; confirm: Bind; select: Bind;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!, C = Phaser.Input.Keyboard.KeyCodes;
    const b = (...codes: number[]): Bind => Object.assign(codes, { ctl: this });
    this.left = b(C.A, C.LEFT);
    this.right = b(C.D, C.RIGHT);
    this.up = b(C.W, C.UP);
    this.down = b(C.S, C.DOWN);
    this.jump = b(C.SPACE);
    this.attack = b(C.J, C.X);
    this.special = b(C.K, C.C);
    this.interact = b(C.E);
    this.inventory = b(C.I, C.TAB);
    this.pause = b(C.ESC, C.P);
    this.run = b(C.SHIFT);
    this.confirm = b(C.ENTER, C.SPACE, C.J, C.E);
    this.select = b(C.ENTER, C.J);
    kb.addCapture([C.SPACE, C.UP, C.DOWN, C.LEFT, C.RIGHT, C.TAB]);
    const onDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      this.held.add(e.keyCode);
      this.pressedNow.add(e.keyCode);
    };
    const onUp = (e: KeyboardEvent) => {
      this.held.delete(e.keyCode);
      this.releasedNow.add(e.keyCode);
    };
    const clear = () => {
      this.pressedNow.clear();
      this.releasedNow.clear();
    };
    const blur = () => this.held.clear();
    kb.on("keydown", onDown);
    kb.on("keyup", onUp);
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, clear);
    scene.game.events.on(Phaser.Core.Events.BLUR, blur);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb.off("keydown", onDown);
      kb.off("keyup", onUp);
      scene.events.off(Phaser.Scenes.Events.POST_UPDATE, clear);
      scene.game.events.off(Phaser.Core.Events.BLUR, blur);
    });
    // a paused scene doesn't run update, so drop presses that arrive while it sleeps
    scene.events.on(Phaser.Scenes.Events.RESUME, () => { clear(); this.held.clear(); });
  }

  /** Held now, or tapped during this frame. */
  static down(b: Bind): boolean {
    return b.some((k) => b.ctl.held.has(k) || b.ctl.pressedNow.has(k));
  }
  static pressed(b: Bind): boolean {
    return b.some((k) => b.ctl.pressedNow.has(k));
  }
  static released(b: Bind): boolean {
    return b.some((k) => b.ctl.releasedNow.has(k));
  }
}
