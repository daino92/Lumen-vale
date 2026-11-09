import Phaser from "phaser";
import { GAME_W, GAME_H } from "../config/constants";
import { PAL, hexNum } from "../config/palette";
import type { DialogueLine } from "../data/dialogue";
import { QUESTS } from "../data/quests";
import { computeStats, xpToNext, MAX_LEVEL } from "../systems/progression";
import { Controls } from "../systems/Controls";
import { Sfx } from "../audio/Sfx";
import type { GameScene } from "./GameScene";
import { panel } from "../ui/widgets";

/** HUD, dialogue box, toasts, banners and prompts, drawn over the Game scene. */
export class UIScene extends Phaser.Scene {
  private game_!: GameScene;
  private hearts: Phaser.GameObjects.Image[] = [];
  private xpFill!: Phaser.GameObjects.Image;
  private lvText!: Phaser.GameObjects.BitmapText;
  private coinText!: Phaser.GameObjects.BitmapText;
  private questText!: Phaser.GameObjects.BitmapText;
  private abilityIcon!: Phaser.GameObjects.Image;
  private abilityMask!: Phaser.GameObjects.Image;
  private dlg!: Phaser.GameObjects.Container;
  private dlgName!: Phaser.GameObjects.BitmapText;
  private dlgText!: Phaser.GameObjects.BitmapText;
  private dlgArrow!: Phaser.GameObjects.Image;
  private lines: DialogueLine[] = [];
  private lineIdx = 0;
  private shown = 0;
  private onDone: (() => void) | null = null;
  dialogueOpen = false;
  private toasts: Phaser.GameObjects.Container[] = [];
  private promptIcon!: Phaser.GameObjects.Container;
  private bossC!: Phaser.GameObjects.Container;
  private bossFill!: Phaser.GameObjects.Image;
  private bossName!: Phaser.GameObjects.BitmapText;
  private controls!: Controls;
  private toastQueue: string[] = [];
  private toastT = 0;

  constructor() {
    super("UI");
  }

  create(): void {
    this.game_ = this.scene.get("Game") as GameScene;
    this.controls = new Controls(this);
    this.hearts = [];
    this.toasts = [];
    this.toastQueue = [];
    this.dialogueOpen = false;

    // ---- top-left: hearts, level, xp bar
    const top = this.add.container(0, 0);
    top.add(panel(this, 3, 3, 104, 25, 0.75));
    for (let i = 0; i < 12; i++) {
      const h = this.add.image(8 + (i % 10) * 9, 7 + Math.floor(i / 10) * 8, "hearts", 0).setOrigin(0);
      this.hearts.push(h);
      top.add(h);
    }
    this.lvText = this.add.bitmapText(8, 18, "mini", "LV 1").setTint(hexNum(PAL.gold[2]));
    top.add(this.lvText);
    top.add(this.add.image(30, 19, "px").setOrigin(0).setDisplaySize(72, 4).setTint(hexNum(PAL.ink)));
    this.xpFill = this.add.image(31, 20, "px").setOrigin(0).setDisplaySize(1, 2).setTint(0xb070ff);
    top.add(this.xpFill);

    // ---- coins + ability
    top.add(panel(this, 110, 3, 44, 14, 0.75));
    top.add(this.add.sprite(118, 10, "coin").play("coin-spin"));
    this.coinText = this.add.bitmapText(125, 8, "mini", "0").setTint(hexNum(PAL.gold[3]));
    top.add(this.coinText);
    this.abilityIcon = this.add.image(161, 10, "icons", 8).setVisible(false);
    this.abilityMask = this.add.image(155, 4, "px").setOrigin(0).setDisplaySize(12, 12).setTint(0x000000).setAlpha(0.6).setVisible(false);
    top.add([this.abilityIcon, this.abilityMask]);

    // ---- quest tracker, top-right
    this.questText = this.add.bitmapText(GAME_W - 4, 5, "mini", "", 5).setOrigin(1, 0).setTint(0xffffff).setDropShadow(1, 1, 0x140f22, 1);

    // ---- boss bar
    this.bossC = this.add.container(0, 0).setVisible(false);
    this.bossC.add(panel(this, 60, GAME_H - 22, 200, 18, 0.85));
    this.bossName = this.add.bitmapText(GAME_W / 2, GAME_H - 19, "mini", "").setOrigin(0.5, 0).setTint(hexNum(PAL.gloam[4]));
    this.bossC.add(this.bossName);
    this.bossC.add(this.add.image(66, GAME_H - 11, "px").setOrigin(0).setDisplaySize(188, 4).setTint(hexNum(PAL.ink)));
    this.bossFill = this.add.image(67, GAME_H - 10, "px").setOrigin(0).setDisplaySize(186, 2).setTint(hexNum(PAL.gloam[3]));
    this.bossC.add(this.bossFill);

    // ---- dialogue
    this.dlg = this.add.container(0, 0).setVisible(false);
    this.dlg.add(panel(this, 8, GAME_H - 50, GAME_W - 16, 44, 0.92, true));
    this.dlgName = this.add.bitmapText(16, GAME_H - 46, "mini", "").setTint(hexNum(PAL.gold[2]));
    this.dlgText = this.add.bitmapText(16, GAME_H - 37, "big", "").setMaxWidth(GAME_W - 34).setTint(0xfff8ec);
    this.dlgText.setLineSpacing(1);
    this.dlgArrow = this.add.image(GAME_W - 18, GAME_H - 12, "px").setDisplaySize(3, 3).setTint(hexNum(PAL.gold[2]));
    this.dlg.add([this.dlgName, this.dlgText, this.dlgArrow]);

    // ---- interaction prompt (E key cap)
    this.promptIcon = this.add.container(0, 0).setVisible(false);
    this.promptIcon.add(panel(this, -5, -5, 11, 11, 1, true));
    this.promptIcon.add(this.add.bitmapText(-1, -2, "mini", "E").setTint(0xffffff));
  }

  // ------------------------------------------------------------------ API used by GameScene
  showDialogue(lines: DialogueLine[], done?: () => void): void {
    this.lines = lines;
    this.lineIdx = 0;
    this.shown = 0;
    this.onDone = done ?? null;
    this.dialogueOpen = true;
    this.dlg.setVisible(true);
    this.renderLine();
    Sfx.play("ui");
  }

  toast(text: string): void {
    this.toastQueue.push(text);
  }

  private bannerObjs: Phaser.GameObjects.GameObject[] = [];
  banner(text: string): void {
    this.bannerObjs.forEach((o) => o.destroy());
    const b = this.add.bitmapText(GAME_W / 2, 74, "big", text.toUpperCase()).setOrigin(0.5).setTint(0xfff8ec).setDropShadow(1, 1, 0x140f22, 1).setAlpha(0);
    const line = this.add.image(GAME_W / 2, 79, "px").setDisplaySize(0, 1).setTint(hexNum(PAL.gold[2]));
    this.tweens.add({ targets: b, alpha: 1, y: 70, duration: 400, hold: 1600, yoyo: true, onComplete: () => b.destroy() });
    this.tweens.add({ targets: line, displayWidth: b.width + 20, duration: 400, hold: 1600, yoyo: true, onComplete: () => line.destroy() });
    this.bannerObjs = [b, line];
  }

  prompt(at: { x: number; y: number } | null): void {
    if (!at || this.dialogueOpen) return void this.promptIcon.setVisible(false);
    const cam = this.game_.cameras.main;
    this.promptIcon.setVisible(true).setPosition(Math.round(at.x - cam.scrollX), Math.round(at.y - cam.scrollY + Math.sin(this.time.now / 180) * 1.5));
  }

  floatText(text: string, wx: number, wy: number, tint: number): void {
    const cam = this.game_.cameras.main;
    const t = this.add.bitmapText(Math.round(wx - cam.scrollX), Math.round(wy - cam.scrollY), "mini", text).setOrigin(0.5).setTint(tint).setDropShadow(1, 1, 0x140f22, 1);
    this.tweens.add({ targets: t, y: t.y - 16, alpha: 0, duration: 1100, ease: "Cubic.easeOut", onComplete: () => t.destroy() });
  }

  bossBar(name: string | null, ratio: number): void {
    this.bossC.setVisible(!!name);
    if (name) {
      this.bossName.setText(name.toUpperCase());
      this.bossFill.setDisplaySize(Math.max(0, 186 * ratio), 2);
    }
  }

  // ------------------------------------------------------------------ internals
  private renderLine(): void {
    const l = this.lines[this.lineIdx];
    this.dlgName.setText(l.speaker);
    this.dlgText.setText(l.text.toUpperCase().slice(0, Math.floor(this.shown)));
  }

  update(_t: number, dms: number): void {
    const dt = dms / 1000, st = this.game_.state;
    if (!st) return;
    // ---- HUD
    const stats = computeStats(st);
    const nh = Math.ceil(stats.maxHp / 2);
    this.hearts.forEach((h, i) => {
      h.setVisible(i < nh);
      const v = st.hp - i * 2;
      h.setFrame(v >= 2 ? 0 : v === 1 ? 1 : 2);
    });
    this.lvText.setText(`LV ${st.level}`);
    const need = xpToNext(st.level);
    this.xpFill.setDisplaySize(st.level >= MAX_LEVEL ? 70 : Math.max(1, Math.floor((70 * st.xp) / need)), 2);
    this.coinText.setText(String(st.coins));
    const hasSpark = st.abilities.includes("sunspark");
    this.abilityIcon.setVisible(hasSpark);
    const ready = this.game_.player?.castReady ?? 1;
    this.abilityMask.setVisible(hasSpark && ready < 1).setDisplaySize(12, Math.ceil(12 * (1 - ready)));

    const q = st.quests.cleanse, def = QUESTS.cleanse;
    let qt = "";
    if (q?.state === "active") qt = `${def.title.toUpperCase()}\nGLOAM SHARDS ${q.progress}/${def.needed}`;
    else if (q?.state === "ready") qt = `${def.title.toUpperCase()}\nRETURN TO ELDER MOSS`;
    else if (q?.state === "done" && !st.flags.bossDefeated) qt = st.abilities.includes("double-jump") ? "DEFEAT THE WARDEN" : "FIND THE ZEPHYR FEATHER\nIN THE RUINS";
    else if (q?.state === "inactive") qt = "TALK TO ELDER MOSS";
    this.questText.setText(qt);

    // ---- toasts
    this.toastT -= dt;
    if (this.toastQueue.length && this.toastT <= 0) {
      this.toastT = 0.9;
      this.spawnToast(this.toastQueue.shift()!);
    }

    // ---- dialogue typing + advance
    if (this.dialogueOpen) {
      const l = this.lines[this.lineIdx];
      const before = Math.floor(this.shown);
      this.shown = Math.min(l.text.length, this.shown + dt * 45);
      if (Math.floor(this.shown) !== before && before % 3 === 0) Sfx.play("talk");
      this.renderLine();
      this.dlgArrow.setVisible(this.shown >= l.text.length && Math.floor(this.time.now / 300) % 2 === 0);
      if (Controls.pressed(this.controls.confirm)) {
        if (this.shown < l.text.length) this.shown = l.text.length;
        else if (this.lineIdx < this.lines.length - 1) { this.lineIdx++; this.shown = 0; Sfx.play("ui"); }
        else {
          this.dialogueOpen = false;
          this.dlg.setVisible(false);
          Sfx.play("uiBack");
          const d = this.onDone;
          this.onDone = null;
          // let the key that closed the box go before gameplay reads it
          this.time.delayedCall(60, () => d?.());
        }
      }
    }
  }

  private spawnToast(text: string): void {
    const t = this.add.bitmapText(GAME_W / 2, 0, "mini", text.toUpperCase()).setOrigin(0.5, 0).setTint(0xfff8ec);
    const w = t.width + 12;
    const c = this.add.container(0, 30);
    c.add(panel(this, GAME_W / 2 - w / 2, 0, w, 11, 0.85, true));
    t.setY(3);
    c.add(t);
    c.setAlpha(0);
    this.toasts.forEach((o) => this.tweens.add({ targets: o, y: o.y + 13, duration: 150 }));
    this.toasts.push(c);
    this.tweens.add({ targets: c, alpha: 1, duration: 150 });
    this.time.delayedCall(2800, () => this.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: () => { c.destroy(); this.toasts = this.toasts.filter((o) => o !== c); } }));
  }
}
