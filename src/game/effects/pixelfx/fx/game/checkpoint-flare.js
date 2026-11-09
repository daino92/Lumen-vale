// A shrine stone wakes: a rune ring draws itself on the floor, a column of motes and light lifts off it,
// a white glint at the top, then sparkles drift down and the ring fades to a soft lingering glow.
import { Particles, P, Rng, fit, sparkle, band, clamp, smooth, ease, TAU } from "../../core/index.js";

export const meta = {
  name: "Checkpoint flare",
  desc: "A rune ring draws itself on the floor, a column of rising motes and light lifts off it with a glint at the top, then sparkles drift down and the ring fades.",
  tags: ["checkpoint", "save", "holy", "arcane", "one-shot", "game"],
  size: [96, 120], origin: [48, 108], duration: 2.2, loop: false, fps: 30, bg: "ground",
  options: { palette: ["#0f2a3a", "#1a5a6a", "#2a9a9a", "#5ad8c0", "#b8ffe8", "#ffffff"], seed: 7 },
};

export function create(o) {
  const C = fit(o.palette, 6), R = new Rng(o.seed), ps = new Particles({ rng: R, ground: () => 0 });
  let t = 0, burst = false, acc = 0;
  return {
    update(dt) {
      t += dt;
      acc += dt;
      if (t < 1.0) while (acc > 0.02) {
        acc -= 0.02;
        ps.spawn(P.STREAK, R.range(-10, 10), R.range(-2, 0), 0, -R.range(60, 120), R.range(0.3, 0.6), C[3 + R.int(0, 2)]);
      }
      if (!burst && t > 0.35) {
        burst = true;
        for (let i = 0; i < 14; i++) {
          const a = R.range(0, TAU), sp = R.range(20, 60);
          ps.spawn(P.STAR, Math.cos(a) * 6, -54 + Math.sin(a) * 6, Math.cos(a) * sp, Math.sin(a) * sp, R.range(0.6, 1.3), C[4]);
        }
      }
      ps.update(dt);
    },
    drawBack(p) {
      const draw = ease.outQuart(clamp(t / 0.3)), fade = 1 - smooth(1.2, 2.1, t);
      if (fade > 0) band(p, 0, -1, 18 * draw, 0.22, 1.4, fade, C, (g) => Math.sin(g) < 0, true);
    },
    draw(p) {
      const draw = ease.outQuart(clamp(t / 0.3)), fade = 1 - smooth(1.2, 2.1, t);
      if (fade > 0) {
        band(p, 0, -1, 18 * draw, 0.22, 1.4, fade, C, (g) => Math.sin(g) >= 0, true);
        p.glow(0, -2, 26, C[3], 0.4 * fade);
      }
      const col = clamp(t / 0.25) * (1 - smooth(0.5, 1.3, t));
      if (col > 0) {
        const top = -56 * ease.outQuart(clamp(t / 0.3));
        p.line(0, 0, 0, top, C[5]);
        p.line(-1, 0, -1, top * 0.8, C[4], col);
        p.line(1, 0, 1, top * 0.8, C[3], col);
        p.glowLine(0, 0, 0, top, 10, C[3], 0.45 * col);
      }
      const g = t - 0.3;
      if (g > 0 && g < 0.4) sparkle(p, 0, -56, 10 * (1 - g / 0.4), C[5], C[3], 0.8);
      ps.draw(p);
    },
  };
}
