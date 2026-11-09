import Phaser from "phaser";
import { registerArt } from "../assets/registerArt";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }
  create(): void {
    registerArt(this);
    this.scene.start("Menu");
  }
}
