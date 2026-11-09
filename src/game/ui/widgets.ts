import Phaser from "phaser";
import { PAL, hexNum } from "../config/palette";

/** A 9-slice-looking pixel panel built from 1px rectangles: dark fill, light inner rim, ink outline. */
export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, alpha = 0.85, accent = false): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const r = (rx: number, ry: number, rw: number, rh: number, color: string, a = 1) =>
    scene.add.image(rx, ry, "px").setOrigin(0).setDisplaySize(rw, rh).setTint(hexNum(color)).setAlpha(a);
  c.add([
    r(1, 0, w - 2, h, PAL.ink, alpha),
    r(0, 1, w, h - 2, PAL.ink, alpha),
    r(1, 1, w - 2, h - 2, "#221a38", alpha),
    r(2, 1, w - 4, 1, accent ? PAL.gold[1] : "#3d3360", alpha),
    r(1, 2, 1, h - 4, accent ? PAL.gold[1] : "#3d3360", alpha),
  ]);
  return c;
}

export interface MenuItem {
  label: string;
  action: () => void;
  enabled?: boolean;
}

/** A vertical pixel-text menu driven by up/down + confirm. */
export class PixelMenu {
  private texts: Phaser.GameObjects.BitmapText[] = [];
  private cursor: Phaser.GameObjects.Image;
  index = 0;
  constructor(scene: Phaser.Scene, private items: MenuItem[], x: number, y: number, gap = 12, align: "center" | "left" = "center") {
    items.forEach((it, i) => {
      const t = scene.add.bitmapText(x, y + i * gap, "big", it.label.toUpperCase()).setOrigin(align === "center" ? 0.5 : 0, 0.5);
      t.setDropShadow(1, 1, 0x140f22, 1);
      this.texts.push(t);
    });
    this.cursor = scene.add.image(0, 0, "coin", 0);
    while (this.items[this.index]?.enabled === false) this.index++;
    this.refresh();
  }
  move(d: number): void {
    const n = this.items.length;
    for (let k = 0; k < n; k++) {
      this.index = (this.index + d + n) % n;
      if (this.items[this.index].enabled !== false) break;
    }
    this.refresh();
  }
  confirm(): void {
    this.items[this.index]?.action();
  }
  setLabel(i: number, label: string): void {
    this.texts[i].setText(label.toUpperCase());
    this.refresh();
  }
  private refresh(): void {
    this.texts.forEach((t, i) => t.setTint(this.items[i].enabled === false ? 0x5a5478 : i === this.index ? hexNum(PAL.gold[2]) : 0xfff8ec));
    const t = this.texts[this.index];
    const left = t.x - t.width * t.originX;
    this.cursor.setPosition(left - 9, t.y);
  }
  destroy(): void {
    this.texts.forEach((t) => t.destroy());
    this.cursor.destroy();
  }
}
