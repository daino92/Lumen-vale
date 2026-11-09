// Pixel bitmap fonts for Phaser, built from pixelfx's glyph tables ("mini" 3x5 and "big" 5x7), so text is crisp
// at any integer zoom. Lowercase is drawn as uppercase.
import Phaser from "phaser";
import { FONTS } from "../effects/pixelfx/core/font.js";

type Glyph = { w: number; rows: string[] } | number[][] | Record<string, unknown>;

const CHARS = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-!?.,:/%*'()<>=_#";

function glyphBits(font: { h: number; glyphs: Record<string, Glyph> }, ch: string): { w: number; on: (x: number, y: number) => boolean } {
  const g = font.glyphs[ch] as unknown;
  // pixelfx glyphs are { w, bits } (bits[y][x]) or arrays of rows; support both shapes defensively
  if (Array.isArray(g)) return { w: (g[0] as unknown[])?.length ?? 0, on: (x, y) => !!(g as unknown[][])[y]?.[x] };
  const o = g as { w?: number; width?: number; bits?: unknown; rows?: string[] };
  const w = o?.w ?? o?.width ?? 0;
  if (Array.isArray(o?.rows)) return { w, on: (x, y) => { const v = (o.rows as unknown as unknown[][])[y]?.[x]; return v === true || v === "#"; } };
  if (Array.isArray(o?.bits)) return { w, on: (x, y) => !!(o.bits as unknown[][])[y]?.[x] };
  return { w: 0, on: () => false };
}

export function registerFonts(scene: Phaser.Scene): void {
  for (const [key, f] of Object.entries(FONTS) as [string, { h: number; space: number; gap: number; glyphs: Record<string, Glyph> }][]) {
    const cellW = 8, cellH = f.h + 2, cols = 16, rows = Math.ceil(CHARS.length / cols);
    const cv = document.createElement("canvas");
    cv.width = cols * cellW; cv.height = rows * cellH;
    const ctx = cv.getContext("2d")!;
    const chars: Record<number, unknown> = {};
    [...CHARS].forEach((ch, i) => {
      const cx = (i % cols) * cellW, cy = Math.floor(i / cols) * cellH;
      const gb = ch === " " ? { w: f.space, on: () => false } : glyphBits(f, ch);
      ctx.fillStyle = "#ffffff";
      for (let y = 0; y < f.h; y++) for (let x = 0; x < gb.w; x++) if (gb.on(x, y)) ctx.fillRect(cx + x, cy + y, 1, 1);
      const w = Math.max(1, gb.w);
      const data = { x: cx, y: cy, width: w, height: f.h, u0: cx / cv.width, v0: cy / cv.height, u1: (cx + w) / cv.width, v1: (cy + f.h) / cv.height, centerX: w / 2, centerY: f.h / 2, xOffset: 0, yOffset: 0, xAdvance: w + f.gap, data: {}, kerning: {} };
      chars[ch.charCodeAt(0)] = data;
      if (/[A-Z]/.test(ch)) chars[ch.toLowerCase().charCodeAt(0)] = data;
    });
    const texKey = `font-${key}`;
    scene.textures.addCanvas(texKey, cv);
    scene.cache.bitmapFont.add(key, { data: { font: key, size: f.h, lineHeight: f.h + 3, chars }, texture: texKey, frame: null });
  }
}
