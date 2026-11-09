import Phaser from "phaser";
import { GAME_W, GAME_H } from "../config/constants";
import { PAL, hexNum } from "../config/palette";
import { PixelMenu, panel } from "../ui/widgets";
import { Controls } from "../systems/Controls";
import { saveGame } from "../systems/save";
import { Sfx } from "../audio/Sfx";
import type { GameScene } from "./GameScene";

export class PauseScene extends Phaser.Scene {
  private menu!: PixelMenu;
  private controls!: Controls;
  private resume: () => void = () => {};
  constructor() {
    super("Pause");
  }
  create(): void {
    const game = this.scene.get("Game") as GameScene;
    this.add.image(0, 0, "px").setOrigin(0).setDisplaySize(GAME_W, GAME_H).setTint(0x0b0a14).setAlpha(0.6);
    panel(this, GAME_W / 2 - 60, 40, 120, 100, 0.95, true);
    this.add.bitmapText(GAME_W / 2, 50, "big", "PAUSED").setOrigin(0.5, 0).setTint(hexNum(PAL.gold[2]));
    const resume = () => {
      Sfx.play("uiBack");
      this.scene.stop();
      game.onResume();
      this.scene.resume("Game");
    };
    this.menu = new PixelMenu(this, [
      { label: "Resume", action: resume },
      { label: "Inventory", action: () => { this.scene.stop(); this.scene.launch("Inventory", { state: game.state }); } },
      { label: Sfx.muted ? "Sound: Off" : "Sound: On", action: () => { Sfx.setMuted(!Sfx.muted); this.menu.setLabel(2, Sfx.muted ? "Sound: Off" : "Sound: On"); } },
      { label: "Save & Quit", action: () => { saveGame(game.state); this.scene.stop(); this.scene.stop("Game"); this.scene.start("Menu"); } },
    ], GAME_W / 2 + 5, 76, 14);
    this.controls = new Controls(this);
    this.resume = resume;
  }
  update(): void {
    const c = this.controls;
    if (Controls.pressed(c.pause)) return this.resume();
    if (Controls.pressed(c.up)) { this.menu.move(-1); Sfx.play("ui"); }
    if (Controls.pressed(c.down)) { this.menu.move(1); Sfx.play("ui"); }
    if (Controls.pressed(c.select) || Controls.pressed(c.jump)) this.menu.confirm();
  }
}
