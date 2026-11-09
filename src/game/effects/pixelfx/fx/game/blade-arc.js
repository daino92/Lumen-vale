// A short sword crescent for a 16 px hero. The crescent / echo / spark recipe is adapted from Sprite Fusion's
// open-source slash (https://www.spritefusion.com/pixel-art-vfx/slash), MIT License, Copyright (c) 2026 Hugo Duprez.
import { Particles, P, Rng, fit, sparkle, clamp, smooth, ease, TAU } from "../../core/index.js";

export const meta = {
  name: "Blade arc",
  desc: "A compact tilted crescent whips over the top and down in front in two frames, white rim cooling to the palette, a tip glint and a fan of sparks.",
  tags: ["melee", "slash", "sword", "directional", "one-shot", "game"],
  size: [64, 48], origin: [20, 40], duration: 0.4, loop: false, fps: 30, bg: "ground",
  options: { palette: ["#2b1a4a", "#4a3a8a", "#6a7ad8", "#9ad0ff", "#d8f0ff", "#ffffff"], sparks: ["#fff3a6", "#ffd84a", "#ff8a2a"], radius: 15, seed: 2 },
};

const SWEEP = 0.05, HOLD = 0.05, TRAIL = 0.22;

function arc(p, cx, cy, R, W, a0, a1, C, age) {
  const n = C.length, span = a1 - a0, sy = 0.75, B = R + 2;
  p.shade(cx - B, cy - B, cx + B, cy + B, (x, y, out) => {
    const lx = x - cx, ly = (y - cy) / sy, r = Math.hypot(lx, ly);
    if (r > R + 0.5 || r < R - W - 1) return;
    let u = (Math.atan2(ly, lx) - a0) % TAU;
    if (u < 0) u += TAU;
    if (u > span) return;
    const v = u / span, w = W * Math.pow(Math.sin(Math.PI * Math.pow(v, 2)), 0.6);
    const q = (R - r) / Math.max(0.4, w);
    if (q < 0 || q > 1 || w < 0.4) return;
    const ci = q < 0.25 && age < 0.45 ? 0 : Math.round(q * (n - 1) * 0.7 + age * 2.2 - v * 0.6 + 0.4);
    out.c = C[n - 1 - clamp(ci, 0, n - 1)];
    out.a = Math.min(1, 0.35 + v / 0.25);
  });
}

export function create(o) {
  const C = fit(o.palette, 6), Rg = new Rng(o.seed), R = o.radius, ps = new Particles({ rng: Rg, ground: () => 0, sparks: o.sparks });
  const cx = 0, cy = -12, A0 = -2.7, A1 = 1.1;
  let t = 0, landed = false;
  const tip = [cx + Math.cos(A1) * (R - 2), cy + Math.sin(A1) * (R - 2) * 0.75];
  return {
    update(dt) {
      t += dt;
      if (!landed && t >= SWEEP) {
        landed = true;
        for (let i = 0; i < 7; i++) {
          const a = 0.6 + Rg.range(-0.6, 0.5), sp = Rg.range(90, 220);
          ps.spawn(P.SPARK, tip[0], tip[1], Math.cos(a) * sp, Math.sin(a) * sp - 30, Rg.range(0.08, 0.22));
        }
      }
      ps.update(dt);
    },
    draw(p) {
      const head = ease.outExpo(clamp(t / SWEEP)), tail = smooth(SWEEP + HOLD, SWEEP + HOLD + TRAIL, t), age = clamp(t / (SWEEP + HOLD + TRAIL));
      const span = A1 - A0;
      if (tail < 1) {
        arc(p, cx, cy, R, 6 * (1 - tail * 0.4), A0 + span * tail, A0 + span * head, C, age);
        arc(p, cx, cy, R * 0.72, 2 * (1 - tail * 0.5), A0 + span * Math.max(tail, 0.12), A0 + span * head * 0.95, C.slice(0, 5), age + 0.2);
        const ha = A0 + span * head;
        p.glow(cx + Math.cos(ha) * R, cy + Math.sin(ha) * R * 0.75, 16, C[3], 0.45 * (1 - age));
      }
      const g = t - SWEEP * 0.6;
      if (g > 0 && g < 0.16) sparkle(p, tip[0], tip[1], 5 * (1 - g / 0.16), C[5], C[3], 0.6);
      ps.draw(p);
    },
  };
}
