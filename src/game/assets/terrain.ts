// Renders the whole level's terrain into canvases once, with full autotiling (grass lips, cave walls, mossy
// bricks). The tilemap underneath is only used for collision.
import { PAL } from "../config/palette";
import { TILE } from "../config/constants";
import { PixelCanvas } from "./pixel";
import { makeRng } from "../utils/rng";

const SOLID = new Set(["#", "B", "f"]);

export interface TerrainArt {
  back: HTMLCanvasElement; // cave backdrops, behind everything
  main: HTMLCanvasElement; // ground, bricks, platforms, spikes
  secret: HTMLCanvasElement; // false walls, drawn in front and faded when the player is inside
}

export function renderTerrain(grid: string[]): TerrainArt {
  const rows = grid.length, cols = grid[0].length, W = cols * TILE, H = rows * TILE;
  const back = new PixelCanvas(W, H), main = new PixelCanvas(W, H), secret = new PixelCanvas(W, H);
  const at = (x: number, y: number) => (y < 0 ? "." : y >= rows ? "#" : x < 0 || x >= cols ? "#" : grid[y][x]);
  const solid = (x: number, y: number) => SOLID.has(at(x, y));
  const R = makeRng(1234);

  // cave pockets: empty cells walled in by solid ground on top, left and right
  const enclosed = (x: number, y: number) => {
    if (!solid(x, y - 1) && !solid(x, y - 2)) return false;
    let l = false, r = false;
    for (let i = 1; i < 10 && !l; i++) if (solid(x - i, y)) l = true;
    for (let i = 1; i < 10 && !r; i++) if (solid(x + i, y)) r = true;
    return l && r && at(x, y + 1) !== "~";
  };

  // the hollow behind a false wall: open cells with earth overhead and a false wall to the left on the row.
  // Painted as earth on the secret layer, so the whole mound looks solid until you step inside.
  const hollow = (x: number, y: number): boolean => {
    if (at(x, y) === "#" || at(x, y) === "B" || at(x, y) === "f" || y <= 0) return false;
    if (!solid(x, y - 1) && !hollow(x, y - 1)) return false;
    for (let i = 1; i < 9; i++) if (at(x - i, y) === "f") return true;
    return false;
  };

  for (let ty = 0; ty < rows; ty++)
    for (let tx = 0; tx < cols; tx++) {
      const ch = grid[ty][tx], X = tx * TILE, Y = ty * TILE;
      if ((ch === "." || /[A-Za-z0-9!]/.test(ch)) && !SOLID.has(ch) && enclosed(tx, ty)) caveBack(back, X, Y, R);
      if (ch === "#") earth(main, tx, ty, X, Y, solid, R);
      if (ch === "f" || hollow(tx, ty)) { earth(secret, tx, ty, X, Y, (x, y) => solid(x, y) || hollow(x, y), R); caveBack(back, X, Y, R); }
      if (ch === "B") brick(main, tx, ty, X, Y, solid, R);
      if (ch === "=") woodPlatform(main, tx, X, Y, at);
      if (ch === "-") stoneLedge(main, tx, X, Y, at);
      if (ch === "^") thorns(main, X, Y, R);
    }
  return { back: back.toCanvas(), main: main.toCanvas(), secret: secret.toCanvas() };
}

function caveBack(c: PixelCanvas, X: number, Y: number, R: () => number) {
  c.rect(X, Y, TILE, TILE, "#1c1220");
  for (let i = 0; i < 5; i++) c.px(X + R() * 16, Y + R() * 16, "#2a1a2a");
  if (R() < 0.3) c.px(X + R() * 16, Y + R() * 16, PAL.teal[1]);
}

function earth(c: PixelCanvas, tx: number, ty: number, X: number, Y: number, solid: (x: number, y: number) => boolean, R: () => number) {
  const D = PAL.dirt, G = PAL.grass;
  const top = !solid(tx, ty - 1), left = !solid(tx - 1, ty), right = !solid(tx + 1, ty);
  const depth = (() => { let d = 0; while (d < 4 && solid(tx, ty - d - 1)) d++; return d; })();
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++) {
      const deep = depth * 16 + y;
      c.px(X + x, Y + y, deep > 40 ? D[0] : deep > 18 ? D[1] : D[2]);
    }
  // pebbles and roots
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(R() * 14) + 1, y = Math.floor(R() * 14) + 1;
    const v = R();
    if (v < 0.5) { c.px(X + x, Y + y, D[3]); c.px(X + x + 1, Y + y, D[3]); c.px(X + x, Y + y + 1, D[1]); }
    else if (v < 0.8) c.px(X + x, Y + y, D[0]);
    else { c.px(X + x, Y + y, PAL.stone[2]); c.px(X + x + 1, Y + y, PAL.stone[1]); }
  }
  if (left) for (let y = 0; y < TILE; y++) { c.px(X, Y + y, D[0]); if (y % 3) c.px(X + 1, Y + y, D[1]); }
  if (right) for (let y = 0; y < TILE; y++) { c.px(X + 15, Y + y, D[0]); if (y % 3) c.px(X + 14, Y + y, D[1]); }
  if (top) {
    for (let x = 0; x < TILE; x++) {
      const h = 3 + ((x * 7 + tx * 3) % 5 === 0 ? 2 : (x + tx) % 3 === 0 ? 1 : 0);
      for (let y = 0; y < h; y++) c.px(X + x, Y + y, y === 0 ? G[3] : y === 1 ? G[2] : y < h - 1 ? G[1] : G[0]);
    }
    // blades above the surface
    for (let i = 0; i < 4; i++) { const x = Math.floor(R() * 16); c.px(X + x, Y - 1, G[2]); if (R() < 0.4) c.px(X + x, Y - 2, G[3]); }
    if (R() < 0.35) { const x = Math.floor(R() * 14) + 1; c.px(X + x, Y - 2, R() < 0.5 ? "#f2a8d0" : "#fff0a0"); c.px(X + x, Y - 1, G[1]); }
    if (left) for (let y = 0; y < 6; y++) c.px(X, Y + y, y < 3 ? G[1] : G[0]);
    if (right) for (let y = 0; y < 6; y++) c.px(X + 15, Y + y, y < 3 ? G[1] : G[0]);
  }
}

function brick(c: PixelCanvas, tx: number, ty: number, X: number, Y: number, solid: (x: number, y: number) => boolean, R: () => number) {
  const S = PAL.stone;
  const top = !solid(tx, ty - 1), left = !solid(tx - 1, ty), right = !solid(tx + 1, ty);
  const deep = (() => { let d = 0; while (d < 3 && solid(tx, ty - d - 1)) d++; return d; })();
  const base = deep >= 2 ? S[1] : S[2], hi = deep >= 2 ? S[2] : S[3];
  for (let row = 0; row < 4; row++) {
    const off = (row + ty * 4) % 2 ? 4 : 0;
    for (let bx = -1; bx < 2; bx++) {
      const x0 = bx * 8 + off;
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 8; x++) {
          const px = x0 + x, py = row * 4 + y;
          if (px < 0 || px >= 16) continue;
          const mortar = y === 3 || x === 7;
          c.px(X + px, Y + py, mortar ? S[0] : y === 0 ? hi : base);
        }
    }
  }
  if (R() < 0.35) { const x = Math.floor(R() * 12) + 2, y = Math.floor(R() * 10) + 3; c.line(X + x, Y + y, X + x + 2, Y + y + 3, S[0]); }
  if (R() < 0.25) c.px(X + R() * 16, Y + R() * 16, PAL.gloam[1]);
  if (left) for (let y = 0; y < TILE; y++) c.px(X, Y + y, S[0]);
  if (right) for (let y = 0; y < TILE; y++) c.px(X + 15, Y + y, S[0]);
  if (top) {
    for (let x = 0; x < TILE; x++) { c.px(X + x, Y, S[4]); c.px(X + x, Y + 1, S[3]); }
    for (let x = 0; x < TILE; x++) if ((x + tx * 5) % 7 < 4) { c.px(X + x, Y, PAL.moss[1]); if ((x + tx) % 3 === 0) c.px(X + x, Y + 1, PAL.moss[0]); }
    if (R() < 0.4) { const x = Math.floor(R() * 14); c.px(X + x, Y + 2, PAL.moss[0]); c.px(X + x, Y + 3, PAL.moss[0]); c.px(X + x, Y + 4, PAL.moss[1]); }
  }
}

function woodPlatform(c: PixelCanvas, tx: number, X: number, Y: number, at: (x: number, y: number) => string) {
  const W = PAL.wood, l = at(tx - 1, Y / TILE) !== "=", r = at(tx + 1, Y / TILE) !== "=";
  for (let x = 0; x < TILE; x++) {
    c.px(X + x, Y, W[0]); c.px(X + x, Y + 1, W[3]); c.px(X + x, Y + 2, W[2]); c.px(X + x, Y + 3, W[2]); c.px(X + x, Y + 4, W[1]); c.px(X + x, Y + 5, W[0]);
  }
  for (const x of [3, 11]) c.px(X + x, Y + 3, W[0]);
  if ((tx & 1) === 0) c.px(X + 15, Y + 2, W[0]), c.px(X + 15, Y + 3, W[0]);
  const strut = (sx: number) => { for (let y = 6; y < 11; y++) c.px(X + sx + (y - 6), Y + y, W[1]); };
  if (l) { strut(2); for (let y = 1; y < 5; y++) c.px(X, Y + y, W[0]); }
  if (r) { for (let y = 6; y < 11; y++) c.px(X + 13 - (y - 6), Y + y, W[1]); for (let y = 1; y < 5; y++) c.px(X + 15, Y + y, W[0]); }
}

function stoneLedge(c: PixelCanvas, tx: number, X: number, Y: number, at: (x: number, y: number) => string) {
  const S = PAL.stone, l = at(tx - 1, Y / TILE) !== "-", r = at(tx + 1, Y / TILE) !== "-";
  for (let x = 0; x < TILE; x++) {
    c.px(X + x, Y, S[4]); c.px(X + x, Y + 1, S[3]);
    for (let y = 2; y < 6; y++) c.px(X + x, Y + y, S[2]);
    c.px(X + x, Y + 6, S[1]); c.px(X + x, Y + 7, S[0]);
  }
  if (tx % 2 === 0) for (let y = 2; y < 7; y++) c.px(X + 15, Y + y, S[0]);
  if (l) for (let y = 0; y < 8; y++) c.px(X, Y + y, S[0]);
  if (r) for (let y = 0; y < 8; y++) c.px(X + 15, Y + y, S[0]);
  for (let x = 2; x < 14; x += 5) c.px(X + x, Y, PAL.moss[1]);
}

function thorns(c: PixelCanvas, X: number, Y: number, R: () => number) {
  const G = PAL.gloam;
  c.rect(X, Y + 13, 16, 3, PAL.leaf[0]);
  for (let i = 0; i < 4; i++) {
    const x = X + 2 + i * 4 + Math.floor(R() * 2), h = 7 + Math.floor(R() * 5);
    c.poly([[x - 2, Y + 16], [x, Y + 16 - h], [x + 2, Y + 16]], G[1]);
    c.line(x, Y + 16 - h, x - 1, Y + 14, G[3]);
    c.px(x, Y + 16 - h, G[4]);
  }
  c.line(X, Y + 12, X + 15, Y + 14, PAL.leaf[1]);
}

/** One 16 x 16 frame of animated water surface + body, three frames for a shimmering loop. */
export function waterFrames(): PixelCanvas[] {
  const Wt = PAL.water;
  return [0, 1, 2, 3].map((k) => {
    const c = new PixelCanvas(16, 48);
    for (let y = 0; y < 48; y++) for (let x = 0; x < 16; x++) c.px(x, y, y < 3 ? Wt[3] : y < 12 ? Wt[2] : y < 28 ? Wt[1] : Wt[0]);
    for (let x = 0; x < 16; x++) {
      const wave = Math.round(Math.sin(((x + k * 4) / 16) * Math.PI * 2) * 1);
      c.px(x, 1 + wave, Wt[4]);
      if ((x + k * 4) % 16 < 4) c.px(x, 0 + wave, PAL.white);
    }
    for (let i = 0; i < 3; i++) { const x = (i * 6 + k * 3) % 16, y = 6 + i * 6; c.px(x, y, Wt[3]); c.px(x + 1, y, Wt[3]); }
    return c;
  });
}
