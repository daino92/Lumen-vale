// Parallax layers, all 320 px wide and horizontally tileable (every wave's period divides 320).
import { PAL } from "../config/palette";
import { PixelCanvas } from "./pixel";
import { makeRng } from "../utils/rng";

const W = 320, H = 180, TAU = Math.PI * 2;
const wave = (x: number, terms: [number, number, number][]) => terms.reduce((s, [k, amp, ph]) => s + Math.sin((x / W) * TAU * k + ph) * amp, 0);
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Banded sky with ordered dithering between bands. */
export function sky(ramp: string[], seed: number, stars = 0): HTMLCanvasElement {
  const c = new PixelCanvas(W, H), R = makeRng(seed), n = ramp.length;
  for (let y = 0; y < H; y++) {
    const f = (y / H) * (n - 1), i = Math.floor(f), t = f - i;
    for (let x = 0; x < W; x++) c.px(x, y, t * 16 > BAYER[(y % 4) * 4 + (x % 4)] ? ramp[Math.min(n - 1, i + 1)] : ramp[i]);
  }
  for (let i = 0; i < stars; i++) { const x = R() * W, y = R() * 90; c.px(x, y, R() < 0.3 ? PAL.white : ramp[n - 1]); }
  return c.toCanvas();
}

export function clouds(color: string, shade: string, seed: number): HTMLCanvasElement {
  const c = new PixelCanvas(W, H), R = makeRng(seed);
  for (let i = 0; i < 6; i++) {
    const x = R() * W, y = 18 + R() * 50, w = 20 + R() * 30;
    for (const dx of [0, W, -W])
      for (let k = 0; k < 4; k++) {
        const bx = x + dx + (k - 1.5) * w * 0.35, by = y - Math.sin((k / 3) * Math.PI) * 5;
        c.ellipse(bx, by + 2, w * 0.3, 5, shade);
        c.ellipse(bx, by, w * 0.3, 5, color);
      }
  }
  return c.toCanvas();
}

export function mountains(ramp: readonly string[], base: number): HTMLCanvasElement {
  const c = new PixelCanvas(W, H);
  for (let x = 0; x < W; x++) {
    const h = base + wave(x, [[1, 14, 0.3], [3, 9, 1.2], [7, 4, 2.0], [13, 2, 0.5]]);
    const top = Math.round(H - h);
    for (let y = top; y < H; y++) {
      const snow = y - top < 4 && h > base + 10;
      const lit = wave(x + 2, [[1, 14, 0.3], [3, 9, 1.2], [7, 4, 2.0], [13, 2, 0.5]]) < wave(x, [[1, 14, 0.3], [3, 9, 1.2], [7, 4, 2.0], [13, 2, 0.5]]);
      c.px(x, y, snow ? "#c8d0f0" : y - top < 2 ? ramp[2] : lit ? ramp[1] : ramp[0]);
    }
  }
  return c.toCanvas();
}

export function hills(dark: string, mid: string, light: string, base: number, trees: boolean, seed: number): HTMLCanvasElement {
  const c = new PixelCanvas(W, H), R = makeRng(seed);
  const hAt = (x: number) => base + wave(x, [[2, 8, 0.8], [5, 4, 2.4], [9, 2, 1.1]]);
  for (let x = 0; x < W; x++) {
    const top = Math.round(H - hAt(x));
    for (let y = top; y < H; y++) c.px(x, y, y - top < 1 ? light : y - top < 6 ? mid : dark);
  }
  if (trees)
    for (let i = 0; i < 22; i++) {
      const x = Math.floor(R() * W), top = Math.round(H - hAt(x)), h = 14 + R() * 16, w = 5 + R() * 4;
      for (const dx of [0, W, -W]) {
        c.rect(x + dx - 1, top - h * 0.3, 2, h * 0.3 + 2, dark);
        c.poly([[x + dx - w, top - h * 0.25], [x + dx, top - h], [x + dx + w, top - h * 0.25]], mid);
        c.poly([[x + dx - w * 0.6, top - h * 0.55], [x + dx, top - h], [x + dx + 1, top - h * 0.3]], light);
      }
    }
  return c.toCanvas();
}

export function forestNear(seed: number): HTMLCanvasElement {
  const c = new PixelCanvas(W, H), R = makeRng(seed), L = ["#16301f", "#1f4029", "#2a5432"];
  for (let i = 0; i < 9; i++) {
    const x = Math.floor((i / 9) * W + R() * 20), w = 4 + Math.floor(R() * 4);
    for (const dx of [0, W, -W]) {
      c.rect(x + dx, 30, w, H - 30, "#1a1a26");
      c.rect(x + dx, 30, 1, H - 30, "#262636");
    }
  }
  for (let x = 0; x < W; x++) {
    const h = 34 + wave(x, [[4, 6, 0.2], [11, 3, 1.4], [23, 2, 0.9]]);
    for (let y = 0; y < h; y++) c.px(x, y, y > h - 3 ? L[2] : y > h - 8 ? L[1] : L[0]);
    const g = 26 + wave(x, [[6, 4, 2.2], [17, 2, 0.3]]);
    for (let y = Math.round(H - g); y < H; y++) c.px(x, y, y < H - g + 2 ? L[2] : L[0]);
  }
  return c.toCanvas();
}

export function ruinsFar(seed: number): HTMLCanvasElement {
  const c = new PixelCanvas(W, H), R = makeRng(seed), A = "#2a2546", B = "#3a3360", Cc = "#4a4278";
  for (let i = 0; i < 5; i++) {
    const x = i * 64 + Math.floor(R() * 10), top = 60 + Math.floor(R() * 30), broken = R() < 0.4;
    c.rect(x, top, 10, H - top, A); c.rect(x, top, 2, H - top, B);
    c.rect(x + 34, top + 6, 10, H - top, A); c.rect(x + 34, top + 6, 2, H - top, B);
    if (!broken) {
      for (let a = 0; a <= Math.PI; a += 0.01) {
        const ax = x + 22 - Math.cos(a) * 17, ay = top + 2 - Math.sin(a) * 12;
        c.rect(ax, ay, 2, 5, A); c.px(ax, ay, Cc);
      }
    }
  }
  for (let x = 0; x < W; x++) { const g = 30 + wave(x, [[3, 4, 0.5], [8, 2, 1.7]]); for (let y = Math.round(H - g); y < H; y++) c.px(x, y, A); }
  return c.toCanvas();
}
