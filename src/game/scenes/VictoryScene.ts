import Phaser from "phaser";
import { GAME_W, GAME_H } from "../config/constants";
import { PAL, hexNum } from "../config/palette";
import { panel } from "../ui/widgets";
import { Controls } from "../systems/Controls";
import { FxSystem } from "../effects/FxSystem";
import type { GameState } from "../systems/GameState";
import { Sfx } from "../audio/Sfx";

export class VictoryScene extends Phaser.Scene {
  private controls!: Controls;
  private fx!: FxSystem;
  private t = 0;
  constructor() {
    super("Victory");
  }
  create(data: { state: GameState }): void {
    this.t = 0;
    const st = data.state;
    this.add.tileSprite(0, 0, GAME_W, GAME_H, "sky-day").setOrigin(0);
    this.add.tileSprite(0, 0, GAME_W, GAME_H, "mountains").setOrigin(0);
    this.add.tileSprite(0, 0, GAME_W, GAME_H, "hills").setOrigin(0);
    this.fx = new FxSystem(this, 0, 0);
    this.fx.playScreen("ambPetals");
    this.add.sprite(GAME_W / 2, 150, "hero").setOrigin(0.5, 1).play("hero-victory");
    panel(this, 40, 14, GAME_W - 80, 104, 0.9, true);
    this.add.bitmapText(GAME_W / 2, 22, "big", "THE VALE IS SAFE").setOrigin(0.5, 0).setScale(2).setTint(hexNum(PAL.gold[3]));
    const mins = Math.floor(st.playTime / 60), secs = Math.floor(st.playTime % 60).toString().padStart(2, "0");
    const rows: [string, string][] = [
      ["TIME", `${mins}:${secs}`], ["LEVEL", String(st.level)], ["COINS", String(st.coins)],
      ["CREATURES CLEANSED", String(st.defeated.length)], ["SECRET HOLLOW", st.flags.secret ? "FOUND" : "MISSED"],
    ];
    rows.forEach(([k, v], i) => {
      this.add.bitmapText(56, 48 + i * 11, "mini", k).setTint(hexNum(PAL.teal[3]));
      this.add.bitmapText(GAME_W - 56, 48 + i * 11, "mini", v).setOrigin(1, 0).setTint(0xfff8ec);
    });
    this.add.bitmapText(GAME_W / 2, 106, "mini", "THANKS FOR PLAYING  -  ENTER FOR MENU").setOrigin(0.5).setTint(0xc8c0e0);
    this.controls = new Controls(this);
    this.cameras.main.fadeIn(800, 255, 248, 236);
    Sfx.music("vale");
  }
  update(_t: number, dms: number): void {
    const dt = dms / 1000;
    this.t += dt;
    this.fx.update(dt);
    this.fx.render();
    if (this.t > 1 && Controls.pressed(this.controls.confirm)) { Sfx.music(null); this.scene.start("Menu"); }
  }
}
