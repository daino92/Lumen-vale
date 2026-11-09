import Phaser from "phaser";
import { GAME_W, GAME_H } from "../config/constants";
import { PAL, hexNum } from "../config/palette";
import { panel } from "../ui/widgets";
import { Controls } from "../systems/Controls";
import { ITEMS } from "../data/items";
import { equip, isEquipped, listInventory, useItem } from "../systems/inventory";
import { computeStats, xpToNext } from "../systems/progression";
import { ICON_INDEX } from "../assets/registerArt";
import type { GameState } from "../systems/GameState";
import type { GameScene } from "./GameScene";
import { Sfx } from "../audio/Sfx";
import { ABILITIES } from "../data/abilities";

export class InventoryScene extends Phaser.Scene {
  private state!: GameState;
  private controls!: Controls;
  private index = 0;
  private dyn: Phaser.GameObjects.GameObject[] = [];
  private msg = "";

  constructor() {
    super("Inventory");
  }

  create(data: { state: GameState }): void {
    this.state = data.state;
    this.index = 0;
    this.msg = "";
    this.dyn = [];
    this.add.image(0, 0, "px").setOrigin(0).setDisplaySize(GAME_W, GAME_H).setTint(0x0b0a14).setAlpha(0.65);
    panel(this, 6, 6, 150, GAME_H - 12, 0.96, true);
    panel(this, 160, 6, GAME_W - 166, GAME_H - 12, 0.96, true);
    this.add.bitmapText(14, 12, "big", "INVENTORY").setTint(hexNum(PAL.gold[2]));
    this.add.bitmapText(168, 12, "big", "PIP").setTint(hexNum(PAL.gold[2]));
    this.add.bitmapText(14, GAME_H - 16, "mini", "J/ENTER USE-EQUIP  I/ESC CLOSE").setTint(0x8a80b0);
    this.controls = new Controls(this);
    this.draw();
  }

  private draw(): void {
    this.dyn.forEach((o) => o.destroy());
    this.dyn = [];
    const st = this.state, items = listInventory(st), s = computeStats(st);
    this.index = Math.min(this.index, Math.max(0, items.length - 1));
    const T = (x: number, y: number, t: string, tint = 0xfff8ec, font = "mini") => {
      const o = this.add.bitmapText(x, y, font, t.toUpperCase()).setTint(tint);
      this.dyn.push(o);
      return o;
    };
    items.forEach((it, i) => {
      const def = ITEMS[it.id], y = 28 + i * 13, sel = i === this.index;
      if (sel) this.dyn.push(this.add.image(10, y - 2, "px").setOrigin(0).setDisplaySize(142, 12).setTint(0x3d3360));
      this.dyn.push(this.add.image(18, y + 4, "icons", ICON_INDEX[def.icon] ?? 0));
      T(28, y + 2, def.name, sel ? hexNum(PAL.gold[2]) : 0xfff8ec);
      if (it.count > 1) T(132, y + 2, `X${it.count}`, 0xc8c0e0);
      if (isEquipped(st, it.id)) T(144, y + 2, "E", hexNum(PAL.teal[3]));
    });
    // stats
    const need = xpToNext(st.level);
    const rows: [string, string][] = [
      ["LEVEL", `${st.level}`], ["XP", `${st.xp}/${need}`], ["HP", `${st.hp}/${s.maxHp}`], ["ATTACK", `${s.attack}`], ["DEFENSE", `${s.defense}`], ["COINS", `${st.coins}`],
    ];
    rows.forEach(([k, v], i) => { T(168, 26 + i * 9, k, hexNum(PAL.teal[3])); T(GAME_W - 14, 26 + i * 9, v).setOrigin(1, 0); });
    const eq = st.equipment;
    T(168, 84, "WEAPON", 0x8a80b0); T(214, 84, eq.weapon ? ITEMS[eq.weapon].name : "-");
    T(168, 93, "ARMOR", 0x8a80b0); T(214, 93, eq.armor ? ITEMS[eq.armor].name : "-");
    T(168, 102, "ACCESS.", 0x8a80b0); T(214, 102, eq.accessory ? ITEMS[eq.accessory].name : "-");
    const ab = st.abilities.map((a) => ABILITIES[a].name).join(", ") || "-";
    T(168, 113, "SKILLS", 0x8a80b0); T(214, 113, ab).setMaxWidth(96);
    const cur = items[this.index];
    if (cur) T(168, 132, ITEMS[cur.id].desc, 0xfff8ec).setMaxWidth(GAME_W - 182);
    if (this.msg) T(168, GAME_H - 20, this.msg, hexNum(PAL.gold[3]));
  }

  private close(): void {
    Sfx.play("uiBack");
    this.scene.stop();
    (this.scene.get("Game") as GameScene).onResume();
    this.scene.resume("Game");
  }

  update(): void {
    const c = this.controls, items = listInventory(this.state);
    if (Controls.pressed(c.inventory) || Controls.pressed(c.pause)) return this.close();
    if (Controls.pressed(c.up)) { this.index = (this.index - 1 + items.length) % Math.max(1, items.length); Sfx.play("ui"); this.msg = ""; this.draw(); }
    if (Controls.pressed(c.down)) { this.index = (this.index + 1) % Math.max(1, items.length); Sfx.play("ui"); this.msg = ""; this.draw(); }
    if (Controls.pressed(c.select)) {
      const it = items[this.index];
      if (!it) return;
      const def = ITEMS[it.id];
      if (def.kind === "consumable") {
        if (useItem(this.state, it.id)) { Sfx.play("heal"); this.msg = `HEALED ${def.heal} HP`; } else { Sfx.play("uiBack"); this.msg = "HP IS FULL"; }
      } else if (def.kind === "weapon" || def.kind === "armor" || def.kind === "accessory") {
        if (equip(this.state, it.id)) { Sfx.play("chest"); this.msg = `EQUIPPED ${def.name}`; }
      } else { Sfx.play("uiBack"); this.msg = def.kind === "quest" ? "QUEST ITEM" : "KEY ITEM"; }
      this.draw();
    }
  }
}
