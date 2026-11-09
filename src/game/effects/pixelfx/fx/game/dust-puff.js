// A small footstep / landing puff sized for a 16 px hero: soft dust rolls out both ways along the floor,
// a couple of grit specks hop. `power` 0..1 scales it from a jump kick-off to a hard landing.
import { Particles, P, Rng, fit } from "../../core/index.js";

export const meta = {
  name: "Dust puff",
  desc: "A small puff of floor dust that rolls out to both sides and settles, with a few hopping grit specks; for jumps and landings.",
  tags: ["dust", "jump", "land", "footstep", "one-shot", "game"],
  size: [64, 32], origin: [32, 26], duration: 0.7, loop: false, fps: 30, bg: "ground",
  options: { palette: ["#6b5848", "#9a8268", "#c4ae8e", "#e2d2b4", "#fff4dc"], power: 1, seed: 4 },
};

export function create(o) {
  const C = fit(o.palette, 5), R = new Rng(o.seed), k = Math.max(0.3, o.power);
  const ps = new Particles({ rng: R, ground: () => 0 });
  const n = Math.round(3 + 5 * k);
  for (let i = 0; i < n; i++) {
    const d = i % 2 ? 1 : -1, sp = R.range(14, 38) * k;
    ps.spawn(P.DUST, d * R.range(1, 4), -1, d * sp, -R.range(2, 10) * k, R.range(0.3, 0.55), C[2 + R.int(0, 2)], R.range(1.4, 2.6) * (0.6 + 0.4 * k));
  }
  for (let i = 0; i < Math.round(2 + 3 * k); i++) {
    const d = R.range(-1, 1);
    ps.spawn(P.GRIT, d * 3, -1, d * 40 * k, -R.range(40, 90) * k, R.range(0.25, 0.45), C[1 + R.int(0, 1)]);
  }
  let t = 0;
  return {
    update(dt) { t += dt; ps.update(dt); },
    draw(p) {
      if (t < 0.08) p.glow(0, -1, 8, C[4], 0.12 * k * (1 - t / 0.08));
      ps.draw(p);
    },
  };
}
