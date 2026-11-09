// Generates every texture and animation at boot. All art is original, drawn in code by assets/*.ts.
import Phaser from "phaser";
import { sheet, type PixelCanvas } from "./pixel";
import { heroSheet, HERO_FRAMES, slimeFrames, wingFrames, knightFrames, bossFrames, elderFrames } from "./characters";
import * as P from "./props";
import { waterFrames } from "./terrain";
import * as BG from "./backgrounds";
import { PAL } from "../config/palette";
import { registerFonts } from "./font";

function addSheet(scene: Phaser.Scene, key: string, frames: PixelCanvas[]): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const cv = sheet(frames);
  scene.textures.addSpriteSheet(key, cv as unknown as HTMLImageElement, { frameWidth: frames[0].w, frameHeight: frames[0].h });
}

function addFlashSheet(scene: Phaser.Scene, key: string, frames: PixelCanvas[]): void {
  // white silhouettes of each frame for hit flashes
  const flash = frames.map((f) => {
    const c = Object.assign(Object.create(Object.getPrototypeOf(f)), f, { data: f.data.slice() }) as PixelCanvas;
    return c.silhouette(PAL.white);
  });
  addSheet(scene, key + "-flash", flash);
}

function anim(scene: Phaser.Scene, key: string, tex: string, frames: number[], rate: number, repeat = -1): void {
  if (scene.anims.exists(key)) return;
  scene.anims.create({ key, frames: frames.map((f) => ({ key: tex, frame: f })), frameRate: rate, repeat });
}

export let heroIdleFrame: PixelCanvas | null = null;

export function registerArt(scene: Phaser.Scene): void {
  registerFonts(scene);
  const hero = heroSheet();
  heroIdleFrame = hero[0];
  addSheet(scene, "hero", hero);
  addFlashSheet(scene, "hero", hero);
  const F = HERO_FRAMES;
  anim(scene, "hero-idle", "hero", F.idle, 4);
  anim(scene, "hero-run", "hero", F.run, 12);
  anim(scene, "hero-jump", "hero", F.jump, 1);
  anim(scene, "hero-fall", "hero", F.fall, 1);
  anim(scene, "hero-attack", "hero", F.attack, 22, 0);
  anim(scene, "hero-hurt", "hero", F.hurt, 1);
  anim(scene, "hero-cast", "hero", F.cast, 1);
  anim(scene, "hero-death", "hero", F.death, 7, 0);
  anim(scene, "hero-victory", "hero", F.victory, 3);

  const slime = slimeFrames();
  addSheet(scene, "slime", slime); addFlashSheet(scene, "slime", slime);
  anim(scene, "slime-idle", "slime", [0, 1], 3);
  anim(scene, "slime-hop", "slime", [2, 3], 8);

  const wing = wingFrames();
  addSheet(scene, "wing", wing); addFlashSheet(scene, "wing", wing);
  anim(scene, "wing-fly", "wing", [0, 1, 2, 1], 10);

  const kn = knightFrames();
  addSheet(scene, "knight", kn); addFlashSheet(scene, "knight", kn);
  anim(scene, "knight-walk", "knight", [0, 1, 2, 3], 6);
  anim(scene, "knight-windup", "knight", [4], 1);
  anim(scene, "knight-strike", "knight", [5, 6], 10, 0);

  const boss = bossFrames();
  addSheet(scene, "boss", boss); addFlashSheet(scene, "boss", boss);
  anim(scene, "boss-idle", "boss", [0, 1], 3);

  addSheet(scene, "elder", elderFrames());
  anim(scene, "elder-idle", "elder", [0, 1], 2);

  addSheet(scene, "coin", P.coinFrames());
  anim(scene, "coin-spin", "coin", [0, 1, 2, 3], 8);
  addSheet(scene, "shard", P.shardFrames());
  anim(scene, "shard-glint", "shard", [0, 1], 3);
  addSheet(scene, "hearts", P.heartFrames());
  addSheet(scene, "chest", P.chestFrames());
  addSheet(scene, "shrine", P.shrineFrames());
  addSheet(scene, "sign", [P.signFrame()]);
  addSheet(scene, "gate", [P.gateFrame()]);
  addSheet(scene, "pedestal", P.pedestalFrames());
  addSheet(scene, "feather", [P.featherFrame()]);
  addSheet(scene, "gloam-heart", [P.gloamHeartFrame()]);
  addSheet(scene, "firebolt", P.fireboltFrames());
  anim(scene, "firebolt", "firebolt", [0, 1], 12);
  addSheet(scene, "orb", P.bossOrbFrames());
  anim(scene, "orb", "orb", [0, 1], 8);
  addSheet(scene, "icons", P.iconFrames());
  addSheet(scene, "tree0", [P.treeFrame(3)]);
  addSheet(scene, "tree1", [P.treeFrame(11)]);
  addSheet(scene, "house", [P.houseFrame()]);
  addSheet(scene, "bush", [P.bushFrame()]);
  addSheet(scene, "lamp", [P.lampFrame()]);
  addSheet(scene, "pillar", [P.pillarFrame(false)]);
  addSheet(scene, "pillar-broken", [P.pillarFrame(true)]);
  addSheet(scene, "torch", P.torchFrames());
  anim(scene, "torch", "torch", [0, 1, 2, 1], 8);
  addSheet(scene, "water", waterFrames());
  anim(scene, "water", "water", [0, 1, 2, 3], 5);

  const canvas = (key: string, cv: HTMLCanvasElement) => {
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, cv);
  };
  canvas("sky-day", BG.sky([...PAL.sky], 1));
  canvas("sky-dusk", BG.sky(["#1e1840", "#3a2a6a", "#7a3a7a", "#d0607a", "#f2a070"], 2, 30));
  canvas("sky-gloam", BG.sky(["#0e0618", "#1e0a30", "#3a1458", "#5a1f78"], 3, 60));
  canvas("clouds", BG.clouds("#f4ecf8", "#c8c0e0", 4));
  canvas("mountains", BG.mountains(PAL.mountain, 82));
  canvas("hills", BG.hills("#24502f", "#2f6a3a", "#4c9a48", 52, true, 5));
  canvas("forest-near", BG.forestNear(6));
  canvas("ruins-far", BG.ruinsFar(7));

  // 1x1 white pixel for UI rectangles
  const px = document.createElement("canvas");
  px.width = px.height = 1;
  px.getContext("2d")!.fillStyle = "#fff";
  px.getContext("2d")!.fillRect(0, 0, 1, 1);
  canvas("px", px);
}

export const ICON_INDEX: Record<string, number> = Object.fromEntries(P.ICON_NAMES.map((n, i) => [n, i]));
