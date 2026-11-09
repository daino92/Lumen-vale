// Which pixelfx effect plays for each game event, and with which options. Gameplay code asks for an event by
// name (FxSystem.play("enemyDeath", x, y)); the look lives here, separate from the rules.
import * as dustPuff from "./pixelfx/fx/game/dust-puff.js";
import * as bladeArc from "./pixelfx/fx/game/blade-arc.js";
import * as checkpointFlare from "./pixelfx/fx/game/checkpoint-flare.js";
import * as poof from "./pixelfx/fx/spawn/poof.js";
import * as bluntHit from "./pixelfx/fx/impacts/blunt-hit.js";
import * as collectBurst from "./pixelfx/fx/pickups/collect-burst.js";
import * as fireball from "./pixelfx/fx/fire/fireball.js";
import * as levelUp from "./pixelfx/fx/ui/level-up.js";
import * as damageNumber from "./pixelfx/fx/ui/damage-number.js";
import * as groundSlam from "./pixelfx/fx/impacts/ground-slam.js";
import * as lightningStrike from "./pixelfx/fx/lightning/lightning-strike.js";
import * as iceSpikes from "./pixelfx/fx/ice/ice-spikes.js";
import * as darkExplosion from "./pixelfx/fx/shadow/dark-explosion.js";
import * as fallingLeaves from "./pixelfx/fx/weather/falling-leaves.js";
import * as godRays from "./pixelfx/fx/weather/god-rays.js";
import * as fog from "./pixelfx/fx/weather/fog.js";
import * as cherry from "./pixelfx/fx/weather/cherry-blossoms.js";
import * as frostNova from "./pixelfx/fx/ice/frost-nova.js";
import type { PxModule } from "./pxTypes";

const GOLD = ["#2a1405", "#7a4612", "#c47f1e", "#f2c03a", "#ffe066", "#fff0a0", "#fff8dc", "#ffffff"];
const GLOAM = ["#14061e", "#2a0f3a", "#5a1f78", "#9a3fc0", "#d77df0", "#f0b0ff", "#ffe0ff", "#ffffff"];
const HEAL = ["#0a2414", "#14422a", "#1f6a3a", "#2f9a4a", "#5ad070", "#a8f0a0", "#e0ffe0", "#ffffff"];

export interface FxRecipe {
  mod: PxModule;
  opts?: Record<string, unknown>;
  /** Draw scale for the light buffer. */
  light?: number;
}

export const FX = {
  jumpDust: { mod: dustPuff, opts: { power: 0.45, seed: 3 } },
  landDust: { mod: dustPuff, opts: { power: 1, seed: 8 } },
  slash: { mod: bladeArc, opts: { radius: 15 } },
  slashHeavy: { mod: bladeArc, opts: { radius: 17, palette: ["#2a1020", "#6a2a3a", "#c0503a", "#f29a4a", "#ffe0a0", "#ffffff"] } },
  hit: { mod: bluntHit, opts: { height: 0 }, light: 0.8 },
  fireHit: { mod: bluntHit, opts: { height: 0, palette: ["#2a0a05", "#5a1a0a", "#a0301a", "#e0601a", "#ffa040", "#ffe080", "#ffffff"], warm: "#ffb040" } },
  enemyDeath: { mod: poof, opts: { palette: ["#1a0a28", "#3a1a5a", "#6b3fa0", "#9b6ad0", "#d9b8ff", "#ffffff"], stars: ["#d77df0", "#ffd0ff", "#ffffff"] } },
  coin: { mod: collectBurst, opts: { palette: GOLD } },
  shard: { mod: collectBurst, opts: { palette: GLOAM } },
  heal: { mod: collectBurst, opts: { palette: HEAL } },
  fireball: { mod: fireball, opts: { radius: 3 } },
  levelUp: { mod: levelUp, opts: {} },
  damage: { mod: damageNumber, opts: {} },
  damagePlayer: { mod: damageNumber, opts: { palette: ["#1a0508", "#3a0a40", "#6a1a8a", "#a040d0", "#d070ff", "#f0b0ff", "#ffe0ff", "#ffffff"] } },
  checkpoint: { mod: checkpointFlare, opts: {} },
  bossSlam: { mod: groundSlam, opts: { reach: 104, palette: ["#14061e", "#3a1458", "#6a2a9a", "#a050e0", "#e090ff", "#ffd8ff", "#ffffff"], stone: "#3b3656" } },
  bossLightning: { mod: lightningStrike, opts: {} },
  bossIce: { mod: iceSpikes, opts: { reach: 150, height: 34 } },
  bossDeath: { mod: darkExplosion, opts: {} },
  frostNova: { mod: frostNova, opts: {} },
  ambLeaves: { mod: fallingLeaves, opts: {} },
  ambRays: { mod: godRays, opts: {} },
  ambFog: { mod: fog, opts: {} },
  ambPetals: { mod: cherry, opts: {} },
} as const satisfies Record<string, FxRecipe>;

export type FxName = keyof typeof FX;
