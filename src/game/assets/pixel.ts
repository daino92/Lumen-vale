// A tiny pixel canvas for authoring art in code: exact pixels, auto outlines, no smoothing.
import { PAL } from "../config/palette";

const parse = (h: string): number => {
  const s = h.replace("#", "");
  const full = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  const r = parseInt(full.slice(0, 2), 16), g = parseInt(full.slice(2, 4), 16), b = parseInt(full.slice(4, 6), 16);
  const a = full.length === 8 ? parseInt(full.slice(6, 8), 16) : 255;
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
};
const cache = new Map<string, number>();
export const col = (h: string): number => {
  let v = cache.get(h);
  if (v === undefined) cache.set(h, (v = parse(h)));
  return v;
};

export class PixelCanvas {
  data: Uint32Array;
  constructor(public w: number, public h: number) {
    this.data = new Uint32Array(w * h);
  }
  px(x: number, y: number, c: string | null): this {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this;
    this.data[y * this.w + x] = c ? col(c) : 0;
    return this;
  }
  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[y * this.w + x];
  }
  rect(x: number, y: number, w: number, h: number, c: string | null): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
    return this;
  }
  line(x0: number, y0: number, x1: number, y1: number, c: string): this {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }
  /** Filled ellipse; `shade(dx, dy)` may pick a color per pixel (dx, dy normalised -1..1). */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string | ((dx: number, dy: number) => string | null)): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, typeof c === "string" ? c : c(dx, dy));
      }
    return this;
  }
  poly(pts: [number, number][], c: string): this {
    let minY = Infinity, maxY = -Infinity;
    for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        const yy = y + 0.5;
        if ((ay <= yy && by > yy) || (by <= yy && ay > yy)) xs.push(ax + ((yy - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) this.px(x, y, c);
    }
    return this;
  }
  /** Draws a 1px outline round every opaque shape (4-neighbour), the classic sprite look. */
  outline(c: string = PAL.ink, diag = false): this {
    const add: number[] = [], C = col(c);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        if (this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1) ||
          (diag && (this.get(x - 1, y - 1) || this.get(x + 1, y - 1) || this.get(x - 1, y + 1) || this.get(x + 1, y + 1))))
          add.push(y * this.w + x);
      }
    for (const i of add) this.data[i] = C;
    return this;
  }
  /** Replace every opaque pixel with one color (flash frames). */
  silhouette(c: string): this {
    const C = col(c);
    for (let i = 0; i < this.data.length; i++) if (this.data[i]) this.data[i] = C;
    return this;
  }
  blit(src: PixelCanvas, ox: number, oy: number, flip = false): this {
    for (let y = 0; y < src.h; y++)
      for (let x = 0; x < src.w; x++) {
        const v = src.data[y * src.w + x];
        if (v) {
          const tx = flip ? ox + src.w - 1 - x : ox + x, ty = oy + y;
          if (tx >= 0 && ty >= 0 && tx < this.w && ty < this.h) this.data[ty * this.w + tx] = v;
        }
      }
    return this;
  }
  toCanvas(): HTMLCanvasElement {
    const cv = document.createElement("canvas");
    cv.width = this.w; cv.height = this.h;
    const ctx = cv.getContext("2d")!;
    const img = ctx.createImageData(this.w, this.h);
    new Uint32Array(img.data.buffer).set(this.data);
    ctx.putImageData(img, 0, 0);
    return cv;
  }
}

/** Lays frames out in a row and returns one canvas: a Phaser spritesheet. */
export function sheet(frames: PixelCanvas[]): HTMLCanvasElement {
  const fw = frames[0].w, fh = frames[0].h, out = new PixelCanvas(fw * frames.length, fh);
  frames.forEach((f, i) => out.blit(f, i * fw, 0));
  return out.toCanvas();
}
