import Phaser from "phaser";
import { GAME_W, GAME_H } from "../config/constants";
import { PAL, hexNum } from "../config/palette";
import { PixelMenu, panel } from "../ui/widgets";
import { Controls } from "../systems/Controls";
import { deleteSave, hasSave, loadGame } from "../systems/save";
import { Sfx } from "../audio/Sfx";
import { FxSystem } from "../effects/FxSystem";

export class MenuScene extends Phaser.Scene {
  private menu!: PixelMenu;
  private controls!: Controls;
  private layers: { img: Phaser.GameObjects.TileSprite; f: number }[] = [];
  private help: Phaser.GameObjects.Container | null = null;
  private fx!: FxSystem;
  private confirmNew = false;

  constructor() {
    super("Menu");
  }

  create(): void {
    this.layers = [];
    this.help = null;
    this.confirmNew = false;
    for (const [key, f] of [["sky-day", 0], ["clouds", 0.1], ["mountains", 0.2], ["hills", 0.5], ["forest-near", 1]] as const)
      this.layers.push({ img: this.add.tileSprite(0, 0, GAME_W, GAME_H, key).setOrigin(0), f });
    this.layers[4].img.setAlpha(0.9);
    this.fx = new FxSystem(this, 0, 0);
    this.fx.playScreen("ambPetals");

    const title = this.add.bitmapText(GAME_W / 2, 34, "big", "LUMEN VALE").setOrigin(0.5).setScale(2).setTint(hexNum(PAL.gold[3])).setDropShadow(2, 2, 0x140f22, 1);
    this.tweens.add({ targets: title, y: 37, duration: 1600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    this.add.bitmapText(GAME_W / 2, 56, "mini", "A TINY TALE OF LIGHT AND GLOAM").setOrigin(0.5).setTint(0xfff8ec).setDropShadow(1, 1, 0x140f22, 1);
    this.add.sprite(46, 158, "hero").setOrigin(0.5, 1).play("hero-idle").setScale(1);

    panel(this, GAME_W / 2 - 52, 76, 104, 54, 0.85, true);
    const saved = hasSave();
    const corrupt = saved && !loadGame({ id: "x", x: 0, y: 0 }).ok;
    this.menu = new PixelMenu(this, [
      { label: "Continue", action: () => this.start("continue"), enabled: saved && !corrupt },
      { label: "New Game", action: () => this.newGame(saved) },
      { label: "Controls", action: () => this.toggleHelp() },
    ], GAME_W / 2 + 6, 89, 14);
    if (corrupt) this.add.bitmapText(GAME_W / 2, 136, "mini", "SAVE DATA UNREADABLE - START A NEW GAME").setOrigin(0.5).setTint(0xff8a8a);
    this.add.bitmapText(GAME_W / 2, GAME_H - 8, "mini", "ARROWS/WASD + ENTER  -  M MUTES").setOrigin(0.5).setTint(0xc8c0e0).setDropShadow(1, 1, 0x140f22, 1);

    this.controls = new Controls(this);
    this.input.keyboard!.on("keydown-M", () => Sfx.setMuted(!Sfx.muted));
    this.input.keyboard!.once("keydown", () => Sfx.unlock());
    this.input.once("pointerdown", () => Sfx.unlock());
    this.cameras.main.fadeIn(500, 11, 10, 20);
  }

  private newGame(saved: boolean): void {
    if (saved && !this.confirmNew) {
      this.confirmNew = true;
      this.menu.setLabel(1, "Overwrite?");
      return;
    }
    deleteSave();
    this.start("new");
  }

  private start(mode: "new" | "continue"): void {
    Sfx.unlock();
    Sfx.play("checkpoint");
    this.cameras.main.fadeOut(350, 11, 10, 20);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start("Game", { mode }));
  }

  private toggleHelp(): void {
    if (this.help) { this.help.destroy(); this.help = null; return; }
    const c = this.add.container(0, 0);
    c.add(panel(this, 20, 14, GAME_W - 40, GAME_H - 28, 0.96, true));
    const rows = [
      ["A D / ARROWS", "MOVE   (SHIFT RUNS)"], ["SPACE", "JUMP (HOLD = HIGHER)"], ["DOWN + SPACE", "DROP THROUGH LEDGE"], ["J", "SWORD ATTACK"],
      ["K", "SUNSPARK (UNLOCK)"], ["E", "TALK / OPEN"], ["I", "INVENTORY"], ["ESC", "PAUSE"],
    ];
    c.add(this.add.bitmapText(GAME_W / 2, 22, "big", "CONTROLS").setOrigin(0.5, 0).setTint(hexNum(PAL.gold[2])));
    rows.forEach(([k, v], i) => {
      c.add(this.add.bitmapText(34, 40 + i * 13, "mini", k).setTint(hexNum(PAL.teal[3])));
      c.add(this.add.bitmapText(130, 40 + i * 13, "mini", v).setTint(0xfff8ec));
    });
    c.add(this.add.bitmapText(GAME_W / 2, GAME_H - 24, "mini", "PRESS ENTER TO CLOSE").setOrigin(0.5).setTint(0xc8c0e0));
    this.help = c;
  }

  update(_t: number, dms: number): void {
    const dt = dms / 1000;
    this.layers.forEach((l, i) => (l.img.tilePositionX += dt * (6 + i * 10) * (l.f + 0.1)));
    this.fx.update(dt);
    this.fx.render();
    const c = this.controls;
    if (this.help) {
      if (Controls.pressed(c.confirm) || Controls.pressed(c.pause)) { Sfx.play("uiBack"); this.toggleHelp(); }
      return;
    }
    if (Controls.pressed(c.up)) { this.menu.move(-1); Sfx.play("ui"); }
    if (Controls.pressed(c.down)) { this.menu.move(1); Sfx.play("ui"); }
    if (Controls.pressed(c.confirm)) { Sfx.unlock(); this.menu.confirm(); }
  }
}
