# Lumen Vale

A small, original 2D pixel-art action-RPG platformer. You play **Pip**, a young adventurer from Brightmoss Village,
pushing back the Gloam, a purple corruption leaking out of the old ruins. About 10 minutes long: a village, an
enchanted forest with a hidden hollow, ancient ruins and a boss arena.

Built with Phaser 3, TypeScript (strict) and Vite. All art and sound are generated in code at boot, so there are no
image or audio files. Visual effects come from [pixelfx](https://github.com/patch-gg/pixelfx) (MIT), vendored into the
project and rendered live.

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # gameplay-logic tests (vitest)
pnpm build      # typecheck + production bundle in dist/
```

## Controls

| Key | Action |
|---|---|
| A / D or ← / → | Move (hold **Shift** to run) |
| Space | Jump (hold for a higher jump; press again in mid-air once you have the Zephyr Feather) |
| ↓ + Space | Drop through a wooden or stone ledge |
| J | Sword attack |
| K | Sunspark fire bolt (unlocked by the quest) |
| E | Talk / open chests |
| I | Inventory (↑/↓ to choose, J or Enter to equip or use) |
| Esc | Pause |
| M | Mute (title screen) |

## The playthrough

1. **Brightmoss Village.** Elder Moss asks for five Gloam Shards. The first shrine saves your progress.
2. **Enchanted Forest.** Gloomlet slimes and Gloamwings drop shards, coins and Berry Tonics. Look for the mound with
   a hollow inside: walk into its left face to find a chest with the Mossguard Ring.
3. Hand the shards to Elder Moss to learn **Sunspark** (K).
4. **Ancient Ruins.** Thorn pits, a flooded gap, Hollow Knights that wind up before they swing, chests with Knight
   Plate and the Ruin Blade, a shrine checkpoint and the **Zephyr Feather** (double jump), which you need to climb
   the wall into the arena.
5. **Warden's Hollow.** The gate drops behind you and Thornmaw, the Gloam Warden, wakes up. Collect the Gloam Heart
   it leaves behind to finish the game.

## Features

- **Platforming:** acceleration and friction, walk and run, variable jump height, coyote time (0.1 s), jump
  buffering (0.12 s), heavier gravity on the way down, air control, one-way ledges you can drop through, knockback
  and i-frames after a hit. All the numbers are in `src/game/config/constants.ts`.
- **Combat:** a sword hitbox in front of you that hits each enemy once per swing, hit flash, knockback scaled by each
  enemy's resistance, hit-stop (the world freezes for 45 to 250 ms, effects included), screen shake, damage numbers
  with 10% crits, and a Sunspark projectile.
- **Enemies:** Gloomlet (hops and chases inside its patch), Gloamwing (patrols, circles you, then dives), Hollow
  Knight (patrols, shakes in place as a wind-up, then a lunging strike that a heavy hit can interrupt).
- **Boss:** Thornmaw has five attacks, each with a tell. **Slam** (raises its arms and its core flashes, then two
  shockwaves run along the floor; jump them). **Orb volley** (aimed gloam orbs). **Lightning call** (a sigil marks
  the floor under you about 0.75 s before the bolt lands). Below half health it adds **Ice line** (a frost line runs
  along the floor, then spikes erupt) and **Charge** (a red flash, then it rams to the wall). It has a health bar,
  a phase change and a death sequence.
- **RPG layer:** XP and levels (up to 10) that raise HP, ATK and DEF; weapon, armor and accessory slots that change
  the real stats; consumables; quest items; key items; abilities stored as data (`data/abilities.ts`).
- **Quest:** *Shards of the Gloam* goes inactive → active → ready → done. A tracker on the HUD shows progress, and
  the quest state is saved.
- **Save/load:** localStorage, versioned (v2, with a v1 migration). Loading rebuilds the state field by field, so a
  corrupt or tampered save can't crash the game: the title screen tells you the save can't be read and offers a new
  game. Saves happen at shrines, on quest changes, on the feather pickup and on Save & Quit. Dying sends you back to
  the last shrine.
- **UI:** title menu (Continue / New Game with overwrite confirm / Controls), HUD (hearts, level, XP bar, coins,
  Sunspark cooldown, quest tracker), dialogue box with typewriter text, interaction prompts, area banners, toasts,
  inventory and stats screen, pause, game over and victory screens with stats. Bitmap fonts are built from
  pixelfx's pixel glyphs.
- **Audio:** procedural WebAudio sound effects (jump, attack, hit, hurt, coins, level-up, UI, boss tells, victory)
  and three small chiptune loops. If audio is unavailable, every call does nothing and the game carries on.
- **Presentation:** 320×180 logical resolution, integer scaling to the window, `pixelArt` rendering, eight parallax
  layers with sky crossfades per area (day, dusk, gloam), animated water, torches, a camera that leads in the
  direction you face and stays inside the level bounds.

## PixelFX integration

`src/game/effects/FxSystem.ts` runs pixelfx effects live inside Phaser. Every effect draws into one 320×180 pixelfx
frame that scrolls with the camera. Each frame the system composites it into a `CanvasTexture` and shows it as two
screen-fixed images: a back layer behind the player and a front layer above everything. Effects can follow a moving
target (fireballs, level-up), they freeze during hit-stop, and gameplay never reads their state.
`src/game/effects/catalog.ts` maps game events to effects and options:

| Event | Effect |
|---|---|
| Jump, double jump, landing, running steps | `game/dust-puff` (**custom**) |
| Sword swing | `game/blade-arc` (**custom**; a warmer palette for the Ruin Blade) |
| Enemy hit, fire impact, orb burst | `impacts/blunt-hit` (recolored per element) |
| Damage numbers | `ui/damage-number` (red for enemies, violet for Pip) |
| Enemy defeat | `spawn/poof` in the gloam palette |
| Coin, shard, tonic pickups | `pickups/collect-burst` (gold, gloam and green palettes) |
| Sunspark bolt | `fire/fireball` following the projectile |
| Level-up and victory | `ui/level-up`, given Pip's own sprite mask as the actor |
| Checkpoint, feather, quest reward, boss heart | `game/checkpoint-flare` (**custom**, recolored) |
| Boss slam | `impacts/ground-slam` (gloam palette) |
| Boss lightning (telegraphed) | `lightning/lightning-strike` (its sigil charge is the tell) |
| Boss ice line | `ice/ice-spikes` |
| Boss defeat | `shadow/dark-explosion` |
| Ambience | `weather/cherry-blossoms` (village, title, victory), `weather/falling-leaves` (forest), `weather/fog` (ruins) |

The three custom effects were made with the skill's draft → render → inspect → refine → check loop in a pixelfx
checkout (`pixelfx/src/fx/game/`, ignored by git) and copied into the vendored library. Their sprite sheets and
Aseprite-style JSON are exported to `assets/pixelfx-sheets/` for use in other engines. The boss hazard timings come
from the effects' own constants (lightning lands at 0.76 s, the ice line runs for 0.44 s), so the danger lines up
with what you see.

## Architecture

```
src/
  main.ts                  Phaser config, integer zoom, scene list
  game/
    config/                constants (movement tuning, depths, save key), master palette
    data/                  items, enemies, abilities, quests, dialogue, ASCII level layout + parser
    systems/               pure rules: GameState, progression, inventory, quests, save, JumpController, Controls
    entities/              Player, Enemy (Slime, Wing, Knight), Boss, and the World interface they use
    scenes/                Boot, Menu, Game, UI (HUD/dialogue), Pause, Inventory, GameOver, Victory
    effects/               FxSystem (pixelfx ↔ Phaser bridge), catalog, vendored pixelfx (MIT)
    assets/                procedural art: PixelCanvas, characters, props, terrain autotiler, parallax, fonts
    audio/                 procedural Sfx + music
    ui/                    pixel panels and menus
tests/logic.test.ts        progression, inventory, quest, save (corrupt / migrate), jump timers, level checks
```

- **Rules apart from presentation.** `systems/` has no Phaser imports and is unit-tested. Entities change the
  `GameState` only through those functions. Effects and sounds are requested by name.
- **Data-driven.** Enemy stats, items, abilities, the quest, dialogue and chest loot are tables. The level is ASCII
  (`data/levelLayout.ts`; the legend is in `data/level.ts`). The terrain renderer autotiles it into one canvas
  (grass lips, cave walls, mossy bricks), and an invisible tilemap built from the same grid handles collision.
- **Scenes.** `Game` owns the world. `UI` runs in parallel for the HUD and dialogue. Pause, Inventory and GameOver
  are overlays that pause `Game`.

## Testing

- `pnpm test`: 17 unit tests covering XP and level-ups, stat calculation with equipment, damage, stack limits,
  consumables, the full quest lifecycle, a save round-trip, corrupt and future-version saves, v1 migration and
  sanitising, coyote time, jump buffering, double jump, and level checks (spawns stand on ground, enough enemies for
  the quest, the boss wall needs the double jump).
- Played in a browser with scripted input. Checked: menu → new game, dialogue and quest acceptance, slime and knight
  fights (XP, level-up, drops, shard pickup), quest turn-in and Sunspark, inventory equip changing ATK, pause and
  resume, water hazard respawn, feather and double-jump climb, shrine checkpoint, boss fight to death → Game Over,
  boss fight to victory → Gloam Heart → Victory screen. No console errors came up. Effects cost about 1 ms a frame.
- `?timer` (e.g. `http://localhost:5173/?timer`) runs the game loop on setTimeout, so automated tests keep running
  in a background tab. `window.__game` exposes the Phaser game for debugging.

## Known limitations

- Desktop keyboard only: no gamepad or touch controls yet.
- The boss and enemies are tuned for a first playthrough, not balanced in depth. The boss favours a level 3 to 5
  Pip with the Ruin Blade.
- Pickups and enemies killed after your last shrine come back if you die (by design, as in a checkpoint system).
  Level coins don't respawn once collected and saved.
- Music is a simple procedural loop. Volume is fixed apart from mute.
- Effects are rendered live in a 320×180 overlay, so an effect bigger than the screen is clipped at the edge of the
  view.
- The bundle (~1.7 MB, 436 KB gzipped) is mostly Phaser.

## Ideas for expansion

- More abilities (dash, ground pound with `moves/ground-pound`, ice lance with `ice/ice-lance`) through `data/abilities.ts`.
- A shop in the village, so coins have a use.
- More levels as new layout strings, plus a world map.
- Gamepad support, remappable keys, and volume sliders.
- More secrets, plus collectibles tracked on the victory screen.
- Bake heavy effects to sprite sheets (`node tools/render.mjs <id> --sheet`) for lower-end devices.

## Credits

- Game code, art and audio: original, generated in code for this project.
- Effects: pixelfx by Patch (MIT, `src/game/effects/pixelfx/LICENSE`), whose core is adapted from Hugo Duprez's
  Sprite Fusion pixel-art VFX (MIT).
