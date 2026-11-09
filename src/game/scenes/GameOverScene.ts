import Phaser from "phaser";
import { GAME_W, GAME_H } from "../config/constants";
import { PixelMenu, panel } from "../ui/widgets";
import { Controls } from "../systems/Controls";
import { Sfx } from "../audio/Sfx";
import { hasSave } from "../systems/save";

export class GameOverScene extends Phaser.Scene {
  private menu!: PixelMenu;
  private controls!: Controls;
  private ready = 0;
  constructor() {
    super("GameOver");
  }
  create(): void {
    this.ready = 0;
    this.add.image(0, 0, "px").setOrigin(0).setDisplaySize(GAME_W, GAME_H).setTint(0x1a0614).setAlpha(0.75);
    panel(this, GAME_W / 2 - 80, 46, 160, 86, 0.95, true);
    this.add.bitmapText(GAME_W / 2, 56, "big", "YOU FELL").setOrigin(0.5, 0).setScale(2).setTint(0xff6a7a);
    this.add.bitmapText(GAME_W / 2, 78, "mini", "THE LAST SHRINE STILL REMEMBERS YOU").setOrigin(0.5, 0).setTint(0xc8c0e0);
    const go = (key: string, data?: object) => {
      Sfx.play("checkpoint");
      this.scene.stop("UI");
      this.scene.stop("Game");
      this.scene.start(key, data);
    };
    this.menu = new PixelMenu(this, [
      { label: "Try again", action: () => go("Game", { mode: hasSave() ? "continue" : "new" }) },
      { label: "Main menu", action: () => go("Menu") },
    ], GAME_W / 2 + 5, 100, 14);
    this.controls = new Controls(this);
  }
  update(_t: number, dms: number): void {
    this.ready += dms / 1000;
    if (this.ready < 0.4) return;
    const c = this.controls;
    if (Controls.pressed(c.up)) { this.menu.move(-1); Sfx.play("ui"); }
    if (Controls.pressed(c.down)) { this.menu.move(1); Sfx.play("ui"); }
    if (Controls.pressed(c.confirm)) this.menu.confirm();
  }
}
