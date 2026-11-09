// Procedural chiptune sound effects and a tiny music loop, made with WebAudio at runtime. No files: if audio is
// unavailable or blocked, every call is a silent no-op and gameplay carries on.
type Wave = OscillatorType;

interface Tone { f0: number; f1?: number; dur: number; type?: Wave; vol?: number; delay?: number; noise?: boolean }

const SOUNDS: Record<string, Tone[]> = {
  jump: [{ f0: 260, f1: 520, dur: 0.11, type: "square", vol: 0.12 }],
  doubleJump: [{ f0: 420, f1: 900, dur: 0.12, type: "square", vol: 0.1 }, { f0: 900, f1: 1200, dur: 0.06, type: "triangle", vol: 0.08, delay: 0.06 }],
  land: [{ f0: 120, f1: 60, dur: 0.06, noise: true, vol: 0.08 }],
  attack: [{ f0: 900, f1: 200, dur: 0.09, noise: true, vol: 0.12 }],
  hit: [{ f0: 180, f1: 60, dur: 0.12, type: "square", vol: 0.16 }, { f0: 600, f1: 100, dur: 0.08, noise: true, vol: 0.12 }],
  hurt: [{ f0: 300, f1: 90, dur: 0.25, type: "sawtooth", vol: 0.14 }],
  coin: [{ f0: 988, dur: 0.06, type: "square", vol: 0.08 }, { f0: 1319, dur: 0.12, type: "square", vol: 0.08, delay: 0.06 }],
  shard: [{ f0: 660, f1: 990, dur: 0.1, type: "triangle", vol: 0.12 }, { f0: 1320, dur: 0.12, type: "triangle", vol: 0.08, delay: 0.08 }],
  enemyDeath: [{ f0: 400, f1: 50, dur: 0.3, noise: true, vol: 0.12 }, { f0: 300, f1: 80, dur: 0.2, type: "square", vol: 0.08 }],
  levelUp: [523, 659, 784, 1047].map((f, i) => ({ f0: f, dur: 0.14, type: "square" as Wave, vol: 0.1, delay: i * 0.1 })),
  ui: [{ f0: 660, dur: 0.04, type: "square", vol: 0.06 }],
  uiBack: [{ f0: 440, dur: 0.04, type: "square", vol: 0.06 }],
  talk: [{ f0: 520, f1: 560, dur: 0.03, type: "triangle", vol: 0.05 }],
  checkpoint: [392, 523, 659, 784].map((f, i) => ({ f0: f, dur: 0.25, type: "triangle" as Wave, vol: 0.09, delay: i * 0.07 })),
  chest: [{ f0: 200, f1: 400, dur: 0.15, type: "square", vol: 0.08 }, { f0: 784, dur: 0.1, type: "square", vol: 0.08, delay: 0.15 }, { f0: 1047, dur: 0.2, type: "square", vol: 0.08, delay: 0.25 }],
  fire: [{ f0: 300, f1: 900, dur: 0.15, noise: true, vol: 0.1 }, { f0: 200, f1: 500, dur: 0.15, type: "sawtooth", vol: 0.06 }],
  boom: [{ f0: 160, f1: 30, dur: 0.5, noise: true, vol: 0.2 }],
  zap: [{ f0: 2000, f1: 200, dur: 0.3, noise: true, vol: 0.14 }, { f0: 80, f1: 40, dur: 0.3, type: "square", vol: 0.1 }],
  telegraph: [{ f0: 200, f1: 420, dur: 0.4, type: "triangle", vol: 0.08 }],
  ice: [{ f0: 1500, f1: 3000, dur: 0.25, noise: true, vol: 0.08 }, { f0: 1200, f1: 1800, dur: 0.2, type: "triangle", vol: 0.06 }],
  heal: [{ f0: 523, f1: 784, dur: 0.2, type: "triangle", vol: 0.1 }],
  victory: [523, 659, 784, 1047, 784, 1047, 1319].map((f, i) => ({ f0: f, dur: 0.22, type: "square" as Wave, vol: 0.09, delay: i * 0.13 })),
  gameOver: [392, 330, 262, 196].map((f, i) => ({ f0: f, dur: 0.3, type: "triangle" as Wave, vol: 0.1, delay: i * 0.22 })),
  gate: [{ f0: 90, f1: 40, dur: 0.6, noise: true, vol: 0.18 }],
};

export type SfxName = keyof typeof SOUNDS;

const MUSIC: Record<string, { bpm: number; notes: number[]; bass: number[] }> = {
  // scale degrees as MIDI notes, 0 = rest
  vale: { bpm: 112, notes: [72, 0, 76, 79, 77, 76, 74, 0, 72, 74, 76, 0, 79, 77, 76, 74], bass: [48, 48, 55, 55, 53, 53, 50, 55] },
  ruins: { bpm: 96, notes: [69, 0, 72, 0, 71, 69, 67, 0, 69, 0, 64, 0, 67, 66, 64, 0], bass: [45, 45, 43, 43, 41, 41, 40, 40] },
  boss: { bpm: 144, notes: [62, 62, 65, 62, 68, 67, 65, 62, 62, 62, 65, 62, 70, 69, 67, 65], bass: [38, 38, 38, 41, 37, 37, 40, 40] },
};

class SfxEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private musicTimer: number | null = null;
  private track: string | null = null;
  muted = false;

  /** Must be called from a user gesture at least once (browsers block autoplay). */
  unlock(): void {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.7;
        this.master.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.35;
        this.musicGain.connect(this.master);
        const len = this.ctx.sampleRate * 0.5;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setValueAtTime(m ? 0 : 0.7, this.ctx.currentTime);
  }

  play(name: SfxName): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || this.muted) return;
    try {
      for (const t of SOUNDS[name]) this.tone(t, this.master, ctx.currentTime);
    } catch {
      /* never let audio break the game */
    }
  }

  private tone(t: Tone, dest: AudioNode, now: number): void {
    const ctx = this.ctx!, start = now + (t.delay ?? 0), end = start + t.dur;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(t.vol ?? 0.1, start + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    g.connect(dest);
    if (t.noise && this.noiseBuf) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const filt = ctx.createBiquadFilter();
      filt.type = "bandpass";
      filt.frequency.setValueAtTime(t.f0, start);
      if (t.f1) filt.frequency.exponentialRampToValueAtTime(t.f1, end);
      src.connect(filt).connect(g);
      src.start(start);
      src.stop(end + 0.02);
    } else {
      const o = ctx.createOscillator();
      o.type = t.type ?? "square";
      o.frequency.setValueAtTime(t.f0, start);
      if (t.f1) o.frequency.exponentialRampToValueAtTime(t.f1, end);
      o.connect(g);
      o.start(start);
      o.stop(end + 0.02);
    }
  }

  music(track: keyof typeof MUSIC | null): void {
    if (track === this.track) return;
    this.track = track;
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
    if (!track) return;
    const m = MUSIC[track];
    const step = 60 / m.bpm / 2;
    let i = 0;
    const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
    this.musicTimer = window.setInterval(() => {
      const ctx = this.ctx;
      if (!ctx || !this.musicGain || this.muted || ctx.state !== "running") { i++; return; }
      const n = m.notes[i % m.notes.length];
      if (n) this.tone({ f0: midi(n), dur: step * 0.9, type: "square", vol: 0.05 }, this.musicGain, ctx.currentTime);
      if (i % 2 === 0) this.tone({ f0: midi(m.bass[(i / 2) % m.bass.length]), dur: step * 1.8, type: "triangle", vol: 0.09 }, this.musicGain, ctx.currentTime);
      i++;
    }, step * 1000);
  }
}

export const Sfx = new SfxEngine();
