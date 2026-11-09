export const GAME_W = 320;
export const GAME_H = 180;
export const TILE = 16;

/** Player movement tuning. Units: px, px/s, px/s², seconds. */
export const MOVE = {
  walkSpeed: 92,
  runSpeed: 132,
  groundAccel: 1100,
  groundDecel: 1400,
  airAccel: 760,
  airDecel: 420,
  gravity: 900,
  fallGravityMul: 1.45,
  maxFall: 330,
  jumpVelocity: -322,
  doubleJumpVelocity: -300,
  jumpCutMul: 0.45,
  coyoteTime: 0.1,
  jumpBuffer: 0.12,
  knockbackX: 150,
  knockbackY: -170,
  hurtStun: 0.28,
  invulnTime: 1.1,
} as const;

export const DEPTH = {
  sky: -100,
  parallax: -90,
  decorBack: -10,
  terrain: 0,
  props: 5,
  pickups: 8,
  enemies: 10,
  player: 20,
  fx: 40,
  terrainFront: 45,
  water: 46,
} as const;

export const SAVE_KEY = "lumen-vale.save";
export const SAVE_VERSION = 2;
