// Plays pixelfx effects live inside Phaser. Every effect draws into one 320x180 pixelfx frame that scrolls with
// the camera; the frame is composited into a CanvasTexture shown on a screen-fixed image above the world.
import Phaser from "phaser";
import * as px from "./pixelfx/core/index.js";
import type { PxFx, PxFrame, PxModule } from "./pxTypes";

const createFrame = px.createFrame as (w: number, h: number) => PxFrame;
const clearFrame = px.clearFrame as (f: PxFrame) => void;
const createFx = px.createFx as unknown as (mod: PxModule, o?: Record<string, unknown>) => PxFx;
const composite = px.composite as unknown as (f: PxFrame, out: Uint8ClampedArray, bg: null) => void;
import { FX, type FxName } from "./catalog";
import { GAME_W, GAME_H } from "../config/constants";

export interface FxHandle {
  fx: PxFx;
  follow?: () => { x: number; y: number; flip?: boolean } | null;
  screen?: boolean; // screen-space effect (ambience): drawn relative to the camera
}

export class FxSystem {
  private frame: PxFrame;
  private backFrame: PxFrame;
  private live: FxHandle[] = [];
  private tex: Phaser.Textures.CanvasTexture;
  private backTex: Phaser.Textures.CanvasTexture;
  private img: ImageData;
  private backImg: ImageData;
  private counter = 0;
  readonly front: Phaser.GameObjects.Image;
  readonly back: Phaser.GameObjects.Image;
  enabled = true;

  constructor(private scene: Phaser.Scene, depthBack: number, depthFront: number) {
    const key = "pxfx-" + Phaser.Math.RND.uuid();
    this.frame = createFrame(GAME_W, GAME_H);
    this.backFrame = createFrame(GAME_W, GAME_H);
    this.tex = scene.textures.createCanvas(key, GAME_W, GAME_H)!;
    this.backTex = scene.textures.createCanvas(key + "-b", GAME_W, GAME_H)!;
    this.img = this.tex.context.createImageData(GAME_W, GAME_H);
    this.backImg = this.backTex.context.createImageData(GAME_W, GAME_H);
    this.front = scene.add.image(0, 0, key).setOrigin(0).setScrollFactor(0).setDepth(depthFront);
    this.back = scene.add.image(0, 0, key + "-b").setOrigin(0).setScrollFactor(0).setDepth(depthBack);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.textures.remove(key);
      scene.textures.remove(key + "-b");
    });
  }

  /** Starts an effect at world position (x, y). Returns a handle (stop it with handle.fx.stop()). */
  play(name: FxName, x: number, y: number, extra: Record<string, unknown> = {}, follow?: FxHandle["follow"]): FxHandle {
    const r = FX[name] as { mod: PxModule; opts?: Record<string, unknown>; light?: number };
    const fx = createFx(r.mod, { seed: ++this.counter % 97, ...r.opts, ...extra, x: Math.round(x), y: Math.round(y), light: r.light ?? 1 });
    const h: FxHandle = { fx, follow };
    this.live.push(h);
    return h;
  }

  /** Screen-space ambience loop, e.g. falling leaves. */
  playScreen(name: FxName, extra: Record<string, unknown> = {}): FxHandle {
    const r = FX[name] as { mod: PxModule; opts?: Record<string, unknown> };
    const fx = createFx(r.mod, { ...r.opts, ...extra });
    const h: FxHandle = { fx, screen: true };
    this.live.push(h);
    return h;
  }

  get count(): number {
    return this.live.length;
  }

  update(dt: number): void {
    for (const h of this.live) {
      if (h.follow) {
        const p = h.follow();
        if (p) {
          h.fx.options.x = Math.round(p.x);
          h.fx.options.y = Math.round(p.y);
          if (p.flip !== undefined) h.fx.options.flip = p.flip;
        } else h.fx.stop();
      }
      h.fx.update(dt);
    }
    this.live = this.live.filter((h) => !h.fx.done());
  }

  render(): void {
    const cam = this.scene.cameras.main;
    const ox = Math.floor(cam.scrollX), oy = Math.floor(cam.scrollY);
    for (const [frame, layer] of [[this.backFrame, "back"], [this.frame, "front"]] as const) {
      clearFrame(frame);
      frame.ox = ox;
      frame.oy = oy;
      if (!this.enabled) continue;
      for (const h of this.live) {
        if (h.screen) {
          // screen effects are authored in 0..320 local space round their origin
          const m = h.fx.meta;
          h.fx.options.x = ox + m.origin[0];
          h.fx.options.y = oy + m.origin[1] + 40; // push the effect's own floor below the view
          // only the particles: the weather loops' own backdrop tint (drawBack) would darken the scene
          if (layer === "back") h.fx.draw(frame, "front");
          continue;
        }
        h.fx.draw(frame, layer);
      }
    }
    composite(this.frame, this.img.data, null);
    composite(this.backFrame, this.backImg.data, null);
    this.tex.context.putImageData(this.img, 0, 0);
    this.backTex.context.putImageData(this.backImg, 0, 0);
    this.tex.refresh();
    this.backTex.refresh();
  }

  clear(): void {
    this.live = [];
  }
}
