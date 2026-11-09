import Phaser from "phaser";
import { GAME_W, GAME_H } from "./game/config/constants";
import { BootScene } from "./game/scenes/BootScene";
import { MenuScene } from "./game/scenes/MenuScene";
import { GameScene } from "./game/scenes/GameScene";
import { UIScene } from "./game/scenes/UIScene";
import { PauseScene } from "./game/scenes/PauseScene";
import { InventoryScene } from "./game/scenes/InventoryScene";
import { GameOverScene } from "./game/scenes/GameOverScene";
import { VictoryScene } from "./game/scenes/VictoryScene";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: GAME_W,
  height: GAME_H,
  backgroundColor: "#0b0a14",
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.NONE, zoom: 1 },
  physics: { default: "arcade", arcade: { gravity: { x: 0, y: 900 }, debug: false, tileBias: 8 } },
  // ?timer runs the loop on setTimeout, so automated tests keep running in a background tab
  fps: { target: 60, smoothStep: true, forceSetTimeOut: new URLSearchParams(location.search).has("timer") },
  scene: [BootScene, MenuScene, GameScene, UIScene, PauseScene, InventoryScene, GameOverScene, VictoryScene],
});

/** Integer scaling: the biggest whole-number zoom that fits the window, so pixels stay square and crisp. */
function fit(): void {
  const z = Math.max(1, Math.floor(Math.min(window.innerWidth / GAME_W, window.innerHeight / GAME_H)));
  game.scale.setZoom(z);
}
window.addEventListener("resize", fit);
fit();

// for debugging and automated play-testing
(window as unknown as { __game: Phaser.Game }).__game = game;
