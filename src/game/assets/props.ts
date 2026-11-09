// Props, pickups and icons.
import { PAL } from "../config/palette";
import { PixelCanvas } from "./pixel";
import { makeRng } from "../utils/rng";

export function coinFrames(): PixelCanvas[] {
  const G = PAL.gold;
  return [4, 3, 1, 3].map((rx, i) => {
    const c = new PixelCanvas(8, 8);
    c.ellipse(4, 4, rx === 1 ? 1 : rx - 0.5, 3.5, (dx) => (rx === 1 ? G[1] : dx < -0.3 ? G[3] : dx > 0.4 ? G[1] : G[2]));
    if (rx >= 3) c.rect(4, 2, 1, 4, i === 0 ? G[1] : G[3]);
    return c.outline(G[0]);
  });
}

export function shardFrames(): PixelCanvas[] {
  const G = PAL.gloam;
  return [0, 1].map((k) => {
    const c = new PixelCanvas(10, 12);
    c.poly([[5, 0], [9, 5], [5, 11], [1, 5]], G[2]);
    c.poly([[5, 0], [5, 11], [1, 5]], G[3]);
    c.line(5, 1, 5, 10, G[4]);
    if (k) c.px(3, 4, PAL.white);
    return c.outline(G[0]);
  });
}

export function heartFrames(): PixelCanvas[] {
  // HUD hearts: full, half, empty (9 x 8)
  const shape = (c: PixelCanvas, fill: (x: number) => string) => {
    const rows = [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."];
    rows.forEach((r, y) => [...r].forEach((ch, x) => ch === "#" && c.px(x + 1, y + 1, fill(x))));
  };
  return [0, 1, 2].map((k) => {
    const c = new PixelCanvas(9, 8);
    shape(c, (x) => (k === 2 ? PAL.inkSoft : k === 1 && x > 3 ? PAL.inkSoft : x < 2 ? "#ff9aa8" : "#e0384e"));
    if (k < 2) c.px(2, 2, PAL.white);
    return c.outline();
  });
}

export function chestFrames(): PixelCanvas[] {
  const W = PAL.wood, G = PAL.gold;
  return [false, true].map((open) => {
    const c = new PixelCanvas(16, 16);
    c.rect(1, 8, 14, 7, W[1]); c.rect(1, 8, 14, 1, W[2]); c.rect(1, 14, 14, 1, W[0]);
    c.rect(3, 8, 1, 7, G[1]); c.rect(12, 8, 1, 7, G[1]);
    if (open) {
      c.rect(1, 3, 14, 3, W[0]); c.rect(1, 2, 14, 1, W[1]);
      c.rect(2, 6, 12, 2, "#1a0f14");
      c.rect(4, 6, 8, 1, G[3]);
    } else {
      c.rect(1, 4, 14, 4, W[2]); c.rect(1, 4, 14, 1, W[3]); c.rect(3, 4, 1, 4, G[2]); c.rect(12, 4, 1, 4, G[2]);
      c.rect(7, 7, 2, 3, G[3]); c.px(7, 9, G[0]);
    }
    return c.outline();
  });
}

export function shrineFrames(): PixelCanvas[] {
  const S = PAL.stone, T = PAL.teal;
  return [false, true].map((lit) => {
    const c = new PixelCanvas(16, 32);
    c.rect(2, 27, 12, 5, S[1]); c.rect(2, 27, 12, 1, S[3]);
    c.poly([[4, 27], [5, 6], [11, 6], [12, 27]], S[2]);
    c.poly([[9, 27], [10, 7], [11, 6], [12, 27]], S[1]);
    c.rect(5, 6, 6, 1, S[4]);
    c.poly([[5, 6], [8, 2], [11, 6]], S[3]);
    // rune
    const R = lit ? T[3] : S[0];
    c.line(8, 10, 8, 20, R); c.line(6, 13, 10, 13, R); c.line(6, 17, 8, 20, R); c.line(10, 17, 8, 20, R);
    if (lit) { c.px(8, 9, PAL.white); c.ellipse(8, 4, 1.5, 1.5, T[3]); }
    // moss
    c.rect(3, 26, 3, 1, PAL.moss[1]); c.px(11, 26, PAL.moss[1]);
    return c.outline();
  });
}

export function signFrame(): PixelCanvas {
  const W = PAL.wood, c = new PixelCanvas(16, 16);
  c.rect(7, 8, 2, 8, W[1]);
  c.rect(1, 2, 14, 7, W[2]); c.rect(1, 2, 14, 1, W[3]); c.rect(1, 8, 14, 1, W[0]);
  c.line(3, 4, 10, 4, W[0]); c.line(3, 6, 12, 6, W[0]);
  c.poly([[15, 3], [15, 8], [16, 5]], W[2]);
  return c.outline();
}

export function gateFrame(): PixelCanvas {
  const S = PAL.stone, G = PAL.gloam, c = new PixelCanvas(16, 64);
  for (let x = 2; x < 15; x += 4) { c.rect(x, 0, 2, 64, S[2]); c.rect(x, 0, 1, 64, S[3]); c.poly([[x - 1, 60], [x + 1, 64], [x + 3, 60]], S[3]); }
  for (const y of [8, 28, 48]) { c.rect(0, y, 16, 3, S[1]); c.rect(0, y, 16, 1, S[3]); }
  for (let y = 4; y < 60; y += 9) c.px(8, y, G[3]);
  return c.outline();
}

export function pedestalFrames(): PixelCanvas[] {
  const S = PAL.stone;
  const c = new PixelCanvas(16, 16);
  c.rect(3, 9, 10, 7, S[2]); c.rect(3, 9, 10, 1, S[4]); c.rect(2, 14, 12, 2, S[1]);
  return [c.outline()];
}

export function featherFrame(): PixelCanvas {
  const c = new PixelCanvas(12, 14);
  c.line(2, 13, 9, 1, PAL.white);
  c.poly([[9, 1], [11, 3], [5, 11], [3, 10]], "#9be3f2");
  c.poly([[9, 1], [6, 2], [3, 9], [4, 10]], "#e6faff");
  c.line(3, 12, 9, 2, PAL.steel[1]);
  return c.outline();
}

export function gloamHeartFrame(): PixelCanvas {
  const c = new PixelCanvas(16, 16), G = PAL.gloam;
  c.ellipse(8, 8, 6, 7, (dx, dy) => (dx * dx + dy * dy < 0.15 ? PAL.white : dx + dy < -0.3 ? G[4] : dx + dy < 0.5 ? G[3] : G[2]));
  c.poly([[8, 0], [10, 3], [6, 3]], G[3]);
  return c.outline(G[0]);
}

export function fireboltFrames(): PixelCanvas[] {
  return [0, 1].map((k) => {
    const c = new PixelCanvas(12, 8);
    c.ellipse(8, 4, 3.5, 3, PAL.scarf[2]);
    c.ellipse(9, 4, 2, 1.6, PAL.gold[3]);
    c.px(10, 4, PAL.white);
    c.line(1, 4 + (k ? 1 : -1), 5, 4, PAL.scarf[1]);
    c.line(2, 4, 5, 3 + k, PAL.scarf[2]);
    return c;
  });
}

export function bossOrbFrames(): PixelCanvas[] {
  return [0, 1].map((k) => {
    const c = new PixelCanvas(10, 10), G = PAL.gloam;
    c.ellipse(5, 5, 4, 4, (dx, dy) => (dx * dx + dy * dy < 0.2 ? PAL.white : dx + dy < 0 ? G[3] : G[2]));
    if (k) c.px(2, 2, G[4]);
    return c.outline(G[0]);
  });
}

// ------------------------------------------------------------- big decor
export function treeFrame(seed: number): PixelCanvas {
  const c = new PixelCanvas(40, 56), L = PAL.leaf, W = PAL.wood, R = makeRng(seed);
  c.rect(17, 30, 6, 26, W[1]); c.rect(17, 30, 2, 26, W[2]); c.rect(22, 32, 1, 24, W[0]);
  c.line(19, 42, 13, 36, W[1]); c.line(21, 38, 27, 33, W[1]);
  c.poly([[14, 56], [17, 50], [17, 56]], W[1]); c.poly([[23, 56], [23, 50], [27, 56]], W[0]);
  const blobs: [number, number, number][] = [[20, 14, 12], [11, 22, 9], [29, 22, 9], [20, 26, 10], [13, 12, 7], [27, 11, 7]];
  for (const [x, y, r] of blobs) c.ellipse(x, y, r, r * 0.85, L[1]);
  for (const [x, y, r] of blobs) c.ellipse(x - 1.5, y - 2, r * 0.75, r * 0.6, L[2]);
  for (const [x, y, r] of blobs) c.ellipse(x - 3, y - 3.5, r * 0.35, r * 0.3, L[3]);
  for (let i = 0; i < 30; i++) { const x = 4 + R() * 32, y = 4 + R() * 28; if (c.get(x, y)) c.px(x, y, R() < 0.5 ? L[0] : L[3]); }
  // a few berries
  for (let i = 0; i < 4; i++) c.px(8 + R() * 24, 18 + R() * 12, "#e0384e");
  return c.outline();
}

export function houseFrame(): PixelCanvas {
  const c = new PixelCanvas(64, 56), W = PAL.wood, Rf = PAL.roof, S = PAL.stone;
  c.rect(6, 26, 52, 30, "#e8d2b0"); c.rect(6, 26, 52, 2, "#c8a888");
  for (const x of [6, 30, 56]) c.rect(x, 26, 2, 30, W[1]);
  c.rect(6, 40, 52, 2, W[1]);
  c.rect(4, 52, 56, 4, S[2]); c.rect(4, 52, 56, 1, S[3]);
  // roof
  c.poly([[0, 28], [32, 4], [64, 28]], Rf[1]);
  c.poly([[32, 4], [64, 28], [56, 28]], Rf[0]);
  for (let y = 10; y < 28; y += 4) c.line(32 - (y - 4) * 1.33, y, 32 + (y - 4) * 1.33, y, Rf[0]);
  c.line(0, 28, 32, 4, Rf[2]);
  c.rect(44, 6, 6, 12, S[2]); c.rect(44, 6, 6, 2, S[3]);
  // door + windows
  c.rect(36, 38, 10, 14, W[1]); c.rect(36, 38, 10, 1, W[2]); c.px(44, 45, PAL.gold[2]);
  c.rect(12, 32, 10, 8, "#f2d36a"); c.rect(12, 32, 10, 8, "#f2d36a"); c.line(17, 32, 17, 39, W[0]); c.line(12, 36, 21, 36, W[0]);
  c.rect(12, 32, 4, 2, "#fff4b0");
  c.rect(11, 40, 12, 2, W[2]);
  c.px(13, 39, "#e0384e"); c.px(16, 39, "#f2a43c"); c.px(20, 39, "#e0384e");
  return c.outline();
}

export function bushFrame(): PixelCanvas {
  const c = new PixelCanvas(24, 14), L = PAL.leaf;
  c.ellipse(8, 9, 7, 5, L[1]); c.ellipse(15, 8, 8, 6, L[2]); c.ellipse(13, 6, 4, 3, L[3]);
  c.px(6, 8, "#f2a8d0"); c.px(17, 6, "#fff0a0"); c.px(11, 10, "#f2a8d0");
  return c.outline();
}

export function lampFrame(): PixelCanvas {
  const c = new PixelCanvas(10, 32), W = PAL.wood;
  c.rect(4, 8, 2, 24, W[1]); c.rect(2, 30, 6, 2, W[0]);
  c.rect(2, 2, 6, 7, "#f2d36a"); c.rect(3, 3, 4, 5, "#fff4b0"); c.rect(1, 1, 8, 1, W[0]); c.rect(1, 9, 8, 1, W[0]);
  return c.outline();
}

export function pillarFrame(broken: boolean): PixelCanvas {
  const c = new PixelCanvas(20, 56), S = PAL.stone;
  const top = broken ? 18 : 4;
  c.rect(4, top, 12, 52 - top, S[2]); c.rect(4, top, 3, 52 - top, S[3]); c.rect(13, top, 3, 52 - top, S[1]);
  for (let x = 8; x < 13; x += 3) c.rect(x, top + 2, 1, 48 - top, S[1]);
  c.rect(2, 50, 16, 6, S[2]); c.rect(2, 50, 16, 1, S[4]);
  if (!broken) { c.rect(2, 2, 16, 4, S[3]); c.rect(2, 2, 16, 1, S[4]); }
  else c.poly([[4, top], [8, top - 4], [11, top - 1], [16, top - 3], [16, top]], S[2]);
  c.rect(5, 30, 2, 8, PAL.moss[1]); c.px(6, 39, PAL.moss[0]);
  return c.outline();
}

export function torchFrames(): PixelCanvas[] {
  return [0, 1, 2].map((k) => {
    const c = new PixelCanvas(10, 20), W = PAL.wood;
    c.rect(4, 9, 2, 11, W[1]); c.rect(3, 8, 4, 2, PAL.stone[2]);
    const h = [6, 7, 5][k];
    c.ellipse(5, 8 - h / 2, 2.5, h / 2 + 0.5, PAL.scarf[1]);
    c.ellipse(5 + (k === 1 ? 0.5 : -0.3), 8 - h / 2 + 1, 1.5, h / 3, PAL.gold[2]);
    c.px(5, 7, PAL.gold[3]);
    return c.outline();
  });
}

// ------------------------------------------------------------- 12 x 12 inventory icons
export const ICON_NAMES = ["tonic", "sword1", "sword2", "tunic", "plate", "ring", "shard", "feather", "tome", "coin"] as const;
export function iconFrames(): PixelCanvas[] {
  const out: PixelCanvas[] = [];
  const S = PAL.steel, G = PAL.gold;
  for (const name of ICON_NAMES) {
    const c = new PixelCanvas(12, 12);
    switch (name) {
      case "tonic":
        c.rect(5, 1, 2, 2, PAL.wood[2]); c.ellipse(6, 7, 4, 4, (dx, dy) => (dy < -0.3 ? "#f29ab0" : dx < -0.2 ? "#e0384e" : "#a01f3a")); c.px(4, 5, PAL.white); break;
      case "sword1":
        c.line(2, 10, 9, 3, PAL.wood[2]); c.line(3, 10, 10, 3, PAL.wood[1]); c.line(1, 8, 4, 11, PAL.wood[1]); break;
      case "sword2":
        c.line(3, 9, 10, 2, S[2]); c.line(4, 9, 10, 3, S[1]); c.line(1, 7, 5, 11, G[2]); c.line(1, 11, 2, 10, PAL.wood[1]); break;
      case "tunic":
        c.poly([[2, 3], [5, 1], [7, 1], [10, 3], [9, 5], [8, 4], [8, 11], [4, 11], [4, 4], [3, 5]], PAL.teal[2]); c.rect(4, 8, 4, 1, PAL.wood[1]); break;
      case "plate":
        c.poly([[2, 3], [5, 1], [7, 1], [10, 3], [9, 6], [8, 5], [8, 11], [4, 11], [4, 5], [3, 6]], PAL.stone[3]); c.line(6, 3, 6, 9, PAL.gloam[3]); c.rect(4, 2, 2, 2, PAL.stone[4]); break;
      case "ring":
        c.ellipse(6, 7, 4, 4, G[2]); c.ellipse(6, 7, 2.2, 2.2, () => null); c.ellipse(6, 2.5, 2, 1.8, PAL.leaf[3]); c.px(5, 2, PAL.white); break;
      case "shard":
        c.poly([[6, 0], [10, 5], [6, 11], [2, 5]], PAL.gloam[2]); c.poly([[6, 0], [6, 11], [2, 5]], PAL.gloam[3]); c.line(6, 1, 6, 10, PAL.gloam[4]); break;
      case "feather":
        c.line(2, 11, 9, 1, PAL.white); c.poly([[9, 1], [11, 3], [5, 10], [3, 9]], "#9be3f2"); c.poly([[9, 1], [6, 2], [3, 8], [4, 9]], "#e6faff"); break;
      case "tome":
        c.rect(2, 2, 8, 9, PAL.roof[1]); c.rect(2, 2, 2, 9, PAL.roof[0]); c.rect(9, 3, 1, 7, PAL.white); c.ellipse(6.5, 6, 1.8, 1.8, G[2]); break;
      case "coin":
        c.ellipse(6, 6, 4, 4, (dx) => (dx < -0.3 ? G[3] : G[2])); c.rect(6, 4, 1, 4, G[1]); break;
    }
    out.push(c.outline());
  }
  return out;
}
