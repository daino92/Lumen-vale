// Character sprites, authored as code: each frame is a pose fed to one draw function, then outlined.
import { PAL } from "../config/palette";
import { PixelCanvas } from "./pixel";

// ---------------------------------------------------------------- hero: Pip, 24 x 24, feet at y 23, body centre x 10
interface HeroPose {
  bob?: number;
  back?: [number, number]; // back foot offset (dx, lift)
  front?: [number, number];
  arm?: "down" | "swing" | "fwd" | "up" | "back" | "cast";
  sword?: { x: number; y: number; a: number; len?: number } | null;
  scarf?: number; // 0..3 flutter phase
  lean?: number;
  blink?: boolean;
  hurt?: boolean;
}

function drawSword(c: PixelCanvas, x: number, y: number, a: number, len = 9): void {
  const dx = Math.cos(a), dy = Math.sin(a);
  // hilt and guard
  c.px(x - dx, y - dy, PAL.wood[1]);
  c.px(x, y, PAL.wood[2]);
  c.px(x + dx - dy, y + dy + dx, PAL.gold[2]);
  c.px(x + dx + dy, y + dy - dx, PAL.gold[2]);
  c.px(x + dx, y + dy, PAL.gold[1]);
  for (let i = 2; i < len; i++) c.px(x + dx * i, y + dy * i, i === len - 1 ? PAL.steel[2] : i % 2 ? PAL.steel[1] : PAL.steel[2]);
}

export function hero(p: HeroPose): PixelCanvas {
  const c = new PixelCanvas(24, 24), b = p.bob ?? 0, ox = 10 + (p.lean ?? 0);
  const [bdx, bly] = p.back ?? [0, 0], [fdx, fly] = p.front ?? [0, 0];
  // scarf tail behind (drawn first)
  const sp = p.scarf ?? 0, sy = 12 + b;
  const tail = [[ox - 4, sy], [ox - 5, sy + ((sp + 1) % 2)], [ox - 6, sy + (sp % 3 === 0 ? 0 : 1)], [ox - 7, sy + (sp % 2)]];
  tail.forEach(([x, y], i) => c.px(x, y, i < 2 ? PAL.scarf[1] : PAL.scarf[0]));
  if (sp % 2) c.px(ox - 6, sy - 1, PAL.scarf[1]);
  // back leg
  c.rect(ox - 2 + bdx, 18 + b - bly, 2, 4 - Math.max(0, -b), PAL.pants[0]);
  c.rect(ox - 3 + bdx, 22 - bly, 3, 2, PAL.hair[0]);
  // front leg
  c.rect(ox + 1 + fdx, 18 + b - fly, 2, 4 - Math.max(0, -b), PAL.pants[1]);
  c.rect(ox + 1 + fdx, 22 - fly, 3, 2, PAL.wood[1]);
  // back arm
  if (p.arm === "up") c.rect(ox - 4, 9 + b, 2, 4, PAL.teal[1]);
  else c.rect(ox - 4, 13 + b, 2, 4, PAL.teal[1]), c.px(ox - 4, 17 + b, PAL.skin[1]);
  // torso: tunic with light from the top left
  c.rect(ox - 3, 12 + b, 7, 6, PAL.teal[2]);
  c.rect(ox - 3, 12 + b, 7, 1, PAL.teal[3]);
  c.rect(ox + 2, 13 + b, 2, 5, PAL.teal[1]);
  c.rect(ox - 3, 17 + b, 7, 1, PAL.wood[1]);
  c.px(ox, 17 + b, PAL.gold[2]);
  // scarf wrap
  c.rect(ox - 3, 11 + b, 7, 2, PAL.scarf[1]);
  c.rect(ox - 3, 11 + b, 7, 1, PAL.scarf[2]);
  // head
  c.rect(ox - 3, 4 + b, 7, 7, PAL.skin[2]);
  c.rect(ox - 3, 9 + b, 7, 2, PAL.skin[1]);
  c.rect(ox + 3, 6 + b, 1, 4, PAL.skin[1]);
  // hair: cap with a tuft and fringe
  c.rect(ox - 4, 3 + b, 8, 3, PAL.hair[1]);
  c.rect(ox - 4, 3 + b, 3, 6, PAL.hair[1]);
  c.rect(ox - 3, 2 + b, 5, 1, PAL.hair[2]);
  c.px(ox + 1, 1 + b, PAL.hair[2]);
  c.px(ox + 2, 1 + b, PAL.hair[1]);
  c.rect(ox - 2, 3 + b, 4, 1, PAL.hair[2]);
  c.px(ox + 3, 6 + b, PAL.hair[1]);
  c.px(ox - 4, 9 + b, PAL.hair[0]);
  // face
  if (p.hurt) {
    c.px(ox + 1, 7 + b, PAL.ink); c.px(ox + 2, 6 + b, PAL.ink); c.px(ox + 2, 8 + b, PAL.ink);
  } else if (p.blink) c.rect(ox + 1, 7 + b, 2, 1, PAL.ink);
  else c.rect(ox + 1, 6 + b, 1, 2, PAL.ink), c.px(ox + 1, 6 + b, "#3a3a6a");
  c.px(ox + 3, 9 + b, PAL.skin[0]);
  c.px(ox - 1, 8 + b, "#f29a8a");
  // front arm + sword
  const arm = p.arm ?? "down";
  if (arm === "down") { c.rect(ox + 2, 13 + b, 2, 4, PAL.teal[3]); c.px(ox + 3, 17 + b, PAL.skin[2]); }
  if (arm === "fwd") { c.rect(ox + 3, 13 + b, 4, 2, PAL.teal[3]); c.px(ox + 7, 13 + b, PAL.skin[2]); c.px(ox + 7, 14 + b, PAL.skin[1]); }
  if (arm === "swing") { c.rect(ox + 3, 15 + b, 4, 2, PAL.teal[3]); c.px(ox + 7, 16 + b, PAL.skin[2]); }
  if (arm === "up") { c.rect(ox + 2, 8 + b, 2, 4, PAL.teal[3]); c.px(ox + 2, 7 + b, PAL.skin[2]); }
  if (arm === "back") { c.rect(ox - 1, 12 + b, 2, 3, PAL.teal[3]); c.px(ox - 2, 11 + b, PAL.skin[2]); }
  if (arm === "cast") { c.rect(ox + 3, 12 + b, 4, 2, PAL.teal[3]); c.rect(ox + 7, 11 + b, 2, 2, PAL.skin[2]); }
  if (p.sword) drawSword(c, p.sword.x + (p.lean ?? 0), p.sword.y + b, p.sword.a, p.sword.len);
  return c.outline();
}

export const HERO_FRAMES: Record<string, number[]> = {};
export function heroSheet(): PixelCanvas[] {
  const S = (x: number, y: number, a: number, len?: number) => ({ x, y, a, len });
  const down = S(14, 16, 1.25, 7);
  const list: [string, HeroPose][] = [
    ["idle", { arm: "down", sword: down, scarf: 0 }],
    ["idle", { arm: "down", sword: down, bob: 1, scarf: 1, back: [0, 0], front: [0, 0] }],
    ["idle", { arm: "down", sword: down, scarf: 2 }],
    ["idle", { arm: "down", sword: down, blink: true, scarf: 3 }],
    ["run", { arm: "down", sword: down, bob: 0, back: [-2, 1], front: [2, 0], scarf: 0, lean: 1 }],
    ["run", { arm: "down", sword: down, bob: -1, back: [-1, 2], front: [1, 0], scarf: 1, lean: 1 }],
    ["run", { arm: "down", sword: down, bob: 0, back: [0, 0], front: [0, 1], scarf: 2, lean: 1 }],
    ["run", { arm: "down", sword: down, bob: 0, back: [2, 0], front: [-2, 1], scarf: 3, lean: 1 }],
    ["run", { arm: "down", sword: down, bob: -1, back: [1, 0], front: [-1, 2], scarf: 0, lean: 1 }],
    ["run", { arm: "down", sword: down, bob: 0, back: [0, 1], front: [0, 0], scarf: 1, lean: 1 }],
    ["jump", { arm: "up", sword: S(12, 8, -1.7, 7), bob: -1, back: [-1, 2], front: [1, 3], scarf: 2 }],
    ["fall", { arm: "fwd", sword: S(17, 13, 0.4, 7), back: [-1, 0], front: [1, 1], scarf: 3 }],
    ["attack", { arm: "back", sword: S(8, 11, -2.4), lean: -1, back: [-1, 0], front: [1, 0], scarf: 0 }],
    ["attack", { arm: "fwd", sword: S(17, 13, -0.15, 10), lean: 1, back: [-2, 0], front: [2, 0], scarf: 1 }],
    ["attack", { arm: "swing", sword: S(17, 16, 0.9, 9), lean: 1, back: [-2, 0], front: [2, 0], scarf: 2 }],
    ["hurt", { arm: "back", sword: S(10, 11, -2.0, 7), hurt: true, lean: -1, back: [-1, 1], front: [1, 0], scarf: 3 }],
    ["cast", { arm: "cast", sword: down, lean: 1, back: [-2, 0], front: [2, 0], scarf: 1 }],
    ["victory", { arm: "up", sword: S(12, 7, -1.57, 9), scarf: 0 }],
    ["victory", { arm: "up", sword: S(12, 6, -1.57, 9), bob: -1, scarf: 2 }],
  ];
  const frames: PixelCanvas[] = [];
  list.forEach(([name, pose], i) => {
    (HERO_FRAMES[name] ??= []).push(i);
    frames.push(hero(pose));
  });
  // death: tip over and fade to the floor (rotated copies of the hurt pose)
  const base = hero({ arm: "back", hurt: true, scarf: 3 });
  const death = [0.5, 1.1, 1.57, 1.57];
  death.forEach((ang, k) => {
    const c = new PixelCanvas(24, 24), cos = Math.cos(-ang), sin = Math.sin(-ang);
    for (let y = 0; y < 24; y++)
      for (let x = 0; x < 24; x++) {
        // inverse rotate about the feet
        const dx = x - 10, dy = y - 23;
        const sx = Math.round(10 + dx * cos - dy * sin), sy2 = Math.round(23 + dx * sin + dy * cos);
        const v = base.get(sx, sy2);
        if (v) c.data[y * 24 + x] = v;
      }
    if (k === 3) for (let i = 0; i < c.data.length; i++) if (c.data[i] && (i % 2 === (Math.floor(i / 24) % 2))) c.data[i] = 0;
    (HERO_FRAMES.death ??= []).push(frames.length);
    frames.push(c);
  });
  return frames;
}

// ---------------------------------------------------------------- Gloomlet slime 16 x 16
export function slimeFrames(): PixelCanvas[] {
  const S = PAL.slime;
  const make = (rx: number, ry: number, lift: number, eyes = true) => {
    const c = new PixelCanvas(16, 16), cy = 15 - ry - lift;
    c.ellipse(8, cy + 0.5, rx, ry, (dx, dy) => (dy > 0.45 ? S[0] : dx < -0.2 && dy < -0.2 ? S[3] : dy < -0.5 ? S[2] : S[1]));
    c.px(8 - rx * 0.45, cy - ry * 0.45, PAL.white);
    // gloam drips on top
    c.px(9, cy - ry + 0.5, PAL.gloam[3]);
    c.px(10, cy - ry + 1.5, PAL.gloam[2]);
    if (eyes) {
      c.rect(9, cy, 1, 2, PAL.eye[0]);
      c.rect(11, cy, 1, 2, PAL.eye[0]);
    }
    if (lift === 0) c.rect(4, 15, 8, 1, S[0]);
    return c.outline();
  };
  return [make(6, 4.5, 0), make(7, 3.5, 0), make(4.5, 6, 2), make(5, 5, 4)];
}

// ---------------------------------------------------------------- Gloamwing 16 x 16
export function wingFrames(): PixelCanvas[] {
  const G = PAL.gloam;
  const make = (phase: number) => {
    const c = new PixelCanvas(16, 16), wy = [-5, -1, 3][phase];
    c.poly([[7, 8], [1, 8 + wy], [3, 9 + wy * 0.4], [0, 10 + wy * 0.6], [7, 10]], G[1]);
    c.poly([[9, 8], [15, 8 + wy], [13, 9 + wy * 0.4], [16, 10 + wy * 0.6], [9, 10]], G[2]);
    c.line(8, 8, 1, 8 + wy, G[3]);
    c.line(8, 8, 15, 8 + wy, G[3]);
    c.ellipse(8, 9, 2.6, 3, (dx, dy) => (dy < -0.3 ? PAL.inkSoft : "#1d1530"));
    c.px(7, 6, G[2]); c.px(10, 6, G[2]); // ears
    c.px(9, 9, PAL.eye[1]);
    c.px(7, 9, PAL.eye[1]);
    c.px(8, 12, G[3]);
    return c.outline();
  };
  return [make(0), make(1), make(2), make(1)];
}

// ---------------------------------------------------------------- Hollow Knight 28 x 28, feet at 27, centre x 12
interface KnightPose { bob?: number; step?: number; sword: [number, number, number]; arm?: [number, number]; lean?: number }
function knight(p: KnightPose): PixelCanvas {
  const c = new PixelCanvas(28, 28), b = p.bob ?? 0, ox = 12 + (p.lean ?? 0), st = PAL.stone, G = PAL.gloam;
  const s = p.step ?? 0;
  // cape
  c.poly([[ox - 4, 10 + b], [ox - 8 - Math.abs(s), 23], [ox - 2, 22], [ox + 1, 11 + b]], G[0]);
  c.line(ox - 5, 13 + b, ox - 7, 21, G[1]);
  // legs
  c.rect(ox - 3 - s, 20 + b, 3, 6 - b, st[1]); c.rect(ox - 4 - s, 25, 4, 2, st[0]);
  c.rect(ox + 1 + s, 20 + b, 3, 6 - b, st[2]); c.rect(ox + 1 + s, 25, 4, 2, st[1]);
  // torso plate
  c.rect(ox - 4, 11 + b, 9, 10, st[2]);
  c.rect(ox - 4, 11 + b, 9, 2, st[3]);
  c.rect(ox + 3, 12 + b, 2, 8, st[1]);
  c.line(ox - 1, 14 + b, ox + 1, 18 + b, G[3]);
  c.px(ox, 16 + b, G[4]);
  c.rect(ox - 4, 19 + b, 9, 1, st[0]);
  // pauldron
  c.ellipse(ox - 3, 12 + b, 3, 2, st[3]);
  // helmet with a visor slit glowing
  c.rect(ox - 3, 3 + b, 7, 8, st[2]);
  c.rect(ox - 3, 3 + b, 7, 2, st[3]);
  c.rect(ox + 2, 4 + b, 2, 6, st[1]);
  c.rect(ox, 6 + b, 4, 1, PAL.eye[1]);
  c.px(ox + 3, 6 + b, PAL.white);
  // plume of gloam
  c.line(ox - 1, 2 + b, ox - 5, 0 + b, G[2]); c.line(ox - 2, 3 + b, ox - 7, 3 + b, G[1]); c.px(ox - 1, 1 + b, G[3]);
  // arm + greatsword
  const [hx, hy] = p.arm ?? [ox + 5, 15 + b];
  c.line(ox + 2, 13 + b, hx, hy, st[3]);
  c.px(hx, hy, st[1]);
  const [sx, sy, a] = p.sword, dx = Math.cos(a), dy = Math.sin(a);
  c.line(sx - dy * 2, sy + dx * 2, sx + dy * 2, sy - dx * 2, st[0]);
  for (let i = 1; i < 13; i++) c.px(sx + dx * i, sy + dy * i, i > 10 ? st[4] : i % 2 ? st[3] : st[4]);
  for (let i = 2; i < 11; i++) c.px(sx + dx * i - dy, sy + dy * i + dx, G[2]);
  return c.outline();
}
export function knightFrames(): PixelCanvas[] {
  const base = (b: number, s: number): KnightPose => ({ bob: b, step: s, sword: [18, 17 + b, -0.5] });
  return [
    knight(base(0, 0)), knight(base(-1, 1)), knight(base(0, 0)), knight(base(-1, -1)),
    knight({ lean: -1, sword: [11, 8, -2.3], arm: [11, 8] }), // windup
    knight({ lean: 2, step: 1, sword: [19, 17, 0.25], arm: [19, 17] }), // strike
    knight({ lean: 2, step: 1, sword: [18, 20, 0.95], arm: [18, 19] }), // follow-through
  ];
}

// ---------------------------------------------------------------- Thornmaw, the Gloam Warden: 64 x 56, feet at 55
interface BossPose { bob?: number; arms: "rest" | "up" | "slam" | "fwd"; core?: number; eyes?: number; lean?: number }
function boss(p: BossPose): PixelCanvas {
  const c = new PixelCanvas(64, 56), b = p.bob ?? 0, st = PAL.stone, G = PAL.gloam, ox = 30 + (p.lean ?? 0);
  // legs
  c.rect(ox - 12, 44 + b, 8, 11 - b, st[1]); c.rect(ox - 13, 52, 10, 3, st[0]);
  c.rect(ox + 4, 44 + b, 8, 11 - b, st[2]); c.rect(ox + 3, 52, 10, 3, st[1]);
  // body: a heavy rounded block, lit top-left
  c.ellipse(ox, 30 + b, 17, 16, (dx, dy) => (dx + dy < -0.9 ? st[4] : dx + dy < -0.2 ? st[3] : dx + dy < 0.7 ? st[2] : st[1]));
  // cracks of gloam light
  c.line(ox - 8, 22 + b, ox - 4, 30 + b, G[2]); c.line(ox + 9, 36 + b, ox + 5, 42 + b, G[2]); c.line(ox - 11, 37 + b, ox - 7, 40 + b, G[1]);
  // moss and thorn vines
  c.ellipse(ox - 6, 16 + b, 9, 3, (dx) => (dx < 0 ? PAL.moss[1] : PAL.moss[0]));
  for (let i = 0; i < 6; i++) { const x = ox - 14 + i * 5; c.px(x, 14 + b - (i % 2), PAL.grass[2]); c.px(x + 1, 13 + b, PAL.leaf[3]); }
  c.line(ox - 15, 26 + b, ox + 14, 34 + b, PAL.leaf[1]);
  for (let i = 0; i < 7; i++) c.px(ox - 13 + i * 4, 26 + b + Math.round(i * 1.15) - 1, PAL.gloam[3]);
  // core
  const k = p.core ?? 0;
  c.ellipse(ox + 1, 31 + b, 4.5 + k, 4.5 + k, (dx, dy) => (dx * dx + dy * dy < 0.25 ? PAL.white : dx * dx + dy * dy < 0.6 ? G[4] : G[3]));
  c.ellipse(ox + 1, 31 + b, 6.5 + k, 6.5 + k, (dx, dy) => (dx * dx + dy * dy > 0.75 ? G[1] : null));
  // head: horned skull-stone
  c.ellipse(ox + 4, 12 + b, 8, 6, (dx, dy) => (dy < -0.4 ? st[3] : dx > 0.5 ? st[1] : st[2]));
  c.poly([[ox - 2, 8 + b], [ox - 9, 1 + b], [ox - 1, 6 + b]], st[3]);
  c.poly([[ox + 9, 8 + b], [ox + 15, 0 + b], [ox + 11, 9 + b]], st[2]);
  const e = p.eyes ?? 0;
  c.rect(ox + 4, 11 + b, 2, 2, e ? PAL.white : PAL.eye[1]); c.rect(ox + 9, 11 + b, 2, 2, e ? PAL.white : PAL.eye[1]);
  c.rect(ox + 3, 16 + b, 9, 1, st[0]);
  for (let i = 0; i < 4; i++) c.px(ox + 4 + i * 2, 15 + b, st[4]);
  // arms
  const arm = (sx: number, sy: number, hx: number, hy: number, front: boolean) => {
    const C = front ? st[3] : st[1];
    for (let t = 0; t <= 1; t += 0.08) c.ellipse(sx + (hx - sx) * t, sy + (hy - sy) * t, 3.5, 3.5, C);
    c.ellipse(hx, hy, 6, 5.5, (dx, dy) => (dy < -0.3 ? (front ? st[4] : st[2]) : front ? st[3] : st[1]));
    c.px(hx - 2, hy + 3, G[2]); c.px(hx + 2, hy + 3, G[2]);
  };
  const A = {
    rest: [[ox - 15, 22, ox - 20, 40], [ox + 15, 22, ox + 21, 40]],
    up: [[ox - 15, 22, ox - 18, 4], [ox + 15, 22, ox + 18, 3]],
    slam: [[ox - 15, 24, ox - 20, 49], [ox + 15, 24, ox + 23, 49]],
    fwd: [[ox - 15, 24, ox - 8, 38], [ox + 15, 24, ox + 27, 30]],
  }[p.arms];
  arm(A[0][0], A[0][1] + b, A[0][2], A[0][3] + (p.arms === "rest" ? b : 0), false);
  arm(A[1][0], A[1][1] + b, A[1][2], A[1][3] + (p.arms === "rest" ? b : 0), true);
  return c.outline();
}
export function bossFrames(): PixelCanvas[] {
  return [
    boss({ arms: "rest", core: 0 }), boss({ arms: "rest", bob: 1, core: 0.6 }),
    boss({ arms: "up", core: 1.2, eyes: 1, bob: -1 }), // 2 windup
    boss({ arms: "slam", core: 0.5, bob: 2 }), // 3 slam
    boss({ arms: "fwd", core: 1, lean: 3 }), // 4 charge / cast
    boss({ arms: "rest", core: 1.6, eyes: 1, lean: -2 }), // 5 stagger
  ];
}

// ---------------------------------------------------------------- Elder Moss 16 x 24
export function elderFrames(): PixelCanvas[] {
  const make = (b: number, glow: boolean) => {
    const c = new PixelCanvas(20, 24), R = PAL.robe, ox = 9;
    // staff
    c.line(3, 6, 3, 23, PAL.wood[1]); c.px(3, 6, PAL.wood[2]);
    c.ellipse(3, 4, 2, 2, glow ? PAL.teal[3] : PAL.teal[2]); c.px(3, 3, PAL.white);
    // robe
    c.poly([[ox - 5, 23], [ox - 3, 11 + b], [ox + 4, 11 + b], [ox + 6, 23]], R[1]);
    c.poly([[ox + 2, 23], [ox + 3, 12 + b], [ox + 4, 11 + b], [ox + 6, 23]], R[0]);
    c.line(ox - 3, 12 + b, ox - 4, 22, R[2]);
    c.rect(ox - 3, 17 + b, 8, 1, PAL.wood[1]);
    // hood + face + beard
    c.ellipse(ox + 0.5, 7 + b, 4.5, 5, R[2]);
    c.rect(ox - 1, 6 + b, 5, 4, PAL.skin[2]);
    c.px(ox + 2, 7 + b, PAL.ink);
    c.poly([[ox - 2, 9 + b], [ox + 5, 9 + b], [ox + 2, 16 + b], [ox + 1, 16 + b]], PAL.beard[1]);
    c.line(ox + 1, 10 + b, ox + 1, 14 + b, PAL.beard[0]);
    c.rect(ox, 5 + b, 4, 1, PAL.beard[1]);
    // hand on staff
    c.rect(3, 13 + b, 3, 2, PAL.skin[2]);
    return c.outline();
  };
  return [make(0, false), make(1, true)];
}
