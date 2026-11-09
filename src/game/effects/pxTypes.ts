// Types for the parts of the vendored pixelfx JS library (MIT, see effects/pixelfx/LICENSE) the game uses.
export interface PxFrame { w: number; h: number; ox: number; oy: number; color: Uint32Array; light: Uint32Array }
export interface PxFx {
  meta: { duration: number; loop: boolean; size: [number, number]; origin: [number, number] };
  options: Record<string, unknown>;
  readonly t: number;
  update(dt: number): void;
  draw(frame: PxFrame, layer?: "back" | "front"): void;
  stop(): void;
  done(): boolean;
}
export type PxModule = { meta: Record<string, unknown> };
