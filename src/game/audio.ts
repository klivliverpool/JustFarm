/**
 * Procedural audio: everything is synthesised with the WebAudio API so the
 * game ships no binary assets and still has ambience, SFX and music.
 */

type Osc = OscillatorType;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambGain: GainNode | null = null;
  private rainSource: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private birdTimer: number | null = null;
  private step = 0;
  muted = false;

  /** Must be called from a user gesture. */
  init() {
    if (this.ctx) return;
    const AC: typeof AudioContext =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.22;
    this.musicGain.connect(this.master);

    this.ambGain = this.ctx.createGain();
    this.ambGain.gain.value = 0.18;
    this.ambGain.connect(this.master);

    this.startWind();
    this.startMusic();
    this.startBirds();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  private now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  private tone(freq: number, dur: number, type: Osc, vol = 0.2, slide = 0) {
    if (!this.ctx || !this.master || this.muted) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, this.now());
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), this.now() + dur);
    g.gain.setValueAtTime(0.0001, this.now());
    g.gain.exponentialRampToValueAtTime(vol, this.now() + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, this.now() + dur);
    o.connect(g).connect(this.master);
    o.start();
    o.stop(this.now() + dur + 0.02);
  }

  private noiseBuffer(seconds: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  private noise(dur: number, vol: number, freq: number, q = 1) {
    if (!this.ctx || !this.master || this.muted) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(dur + 0.05);
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, this.now());
    g.gain.exponentialRampToValueAtTime(0.0001, this.now() + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start();
    src.stop(this.now() + dur + 0.05);
  }

  /** Continuous low wind bed. */
  private startWind() {
    if (!this.ctx || !this.ambGain) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(4);
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 420;
    const g = this.ctx.createGain();
    g.gain.value = 0.35;
    src.connect(f).connect(g).connect(this.ambGain);
    src.start();
  }

  /** Occasional bird chirps for village ambience. */
  private startBirds() {
    const chirp = () => {
      if (!this.muted) {
        const base = 1400 + Math.random() * 900;
        this.tone(base, 0.08, "sine", 0.07, 400);
        window.setTimeout(() => this.tone(base + 250, 0.07, "sine", 0.05, -200), 110);
      }
      this.birdTimer = window.setTimeout(chirp, 3500 + Math.random() * 7000);
    };
    this.birdTimer = window.setTimeout(chirp, 2000);
  }

  /** Gentle pentatonic gamelan-flavoured loop. */
  private startMusic() {
    const scale = [0, 2, 4, 7, 9, 12, 14, 16];
    const roots = [196, 220, 174.6, 164.8];
    const play = () => {
      if (!this.ctx || !this.musicGain || this.muted) {
        this.musicTimer = window.setTimeout(play, 520);
        return;
      }
      const root = roots[Math.floor(this.step / 8) % roots.length] ?? 196;
      const semi = scale[this.step % scale.length] ?? 0;
      const freq = root * Math.pow(2, semi / 12);
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = "triangle";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, this.now());
      g.gain.exponentialRampToValueAtTime(0.5, this.now() + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, this.now() + 1.4);
      o.connect(g).connect(this.musicGain);
      o.start();
      o.stop(this.now() + 1.5);
      if (this.step % 4 === 0) {
        const b = this.ctx.createOscillator();
        const bg = this.ctx.createGain();
        b.type = "sine";
        b.frequency.value = freq / 2;
        bg.gain.setValueAtTime(0.35, this.now());
        bg.gain.exponentialRampToValueAtTime(0.0001, this.now() + 1.9);
        b.connect(bg).connect(this.musicGain);
        b.start();
        b.stop(this.now() + 2);
      }
      this.step++;
      this.musicTimer = window.setTimeout(play, 520);
    };
    play();
  }

  setRain(on: boolean) {
    if (!this.ctx || !this.ambGain) return;
    if (on && !this.rainSource) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer(3);
      src.loop = true;
      const f = this.ctx.createBiquadFilter();
      f.type = "highpass";
      f.frequency.value = 900;
      const g = this.ctx.createGain();
      g.gain.value = 0;
      g.gain.linearRampToValueAtTime(0.9, this.now() + 1.5);
      src.connect(f).connect(g).connect(this.ambGain);
      src.start();
      this.rainSource = src;
      this.rainGain = g;
    } else if (!on && this.rainSource) {
      const s = this.rainSource;
      this.rainGain?.gain.linearRampToValueAtTime(0, this.now() + 1.2);
      window.setTimeout(() => s.stop(), 1400);
      this.rainSource = null;
      this.rainGain = null;
    }
  }

  step_() {
    this.noise(0.09, 0.14, 320 + Math.random() * 160, 0.8);
  }
  water() {
    this.noise(0.45, 0.2, 1500, 0.7);
  }
  spray() {
    this.noise(0.35, 0.22, 2600, 0.5);
  }
  harvest() {
    this.tone(520, 0.1, "square", 0.12);
    window.setTimeout(() => this.tone(780, 0.16, "square", 0.12), 80);
  }
  coin() {
    this.tone(980, 0.07, "square", 0.1);
    window.setTimeout(() => this.tone(1320, 0.13, "square", 0.09), 60);
  }
  click() {
    this.tone(620, 0.05, "square", 0.07);
  }
  till() {
    this.noise(0.2, 0.2, 210, 0.9);
  }
  pest() {
    this.tone(180, 0.25, "sawtooth", 0.08, -80);
  }
  wrong() {
    this.tone(220, 0.28, "sawtooth", 0.12, -90);
  }
  success() {
    [523, 659, 784, 1046].forEach((f, i) =>
      window.setTimeout(() => this.tone(f, 0.18, "triangle", 0.14), i * 90),
    );
  }
  fanfare() {
    [523, 659, 784, 1046, 1318].forEach((f, i) =>
      window.setTimeout(() => this.tone(f, 0.4, "triangle", 0.16), i * 160),
    );
  }

  dispose() {
    if (this.musicTimer) window.clearTimeout(this.musicTimer);
    if (this.birdTimer) window.clearTimeout(this.birdTimer);
    this.ctx?.close();
    this.ctx = null;
  }
}
