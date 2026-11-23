/** Everything synthesized with Web Audio: filtered noise bursts and a few sine partials. Zero audio files. */
export class Sound {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private lastRattle = 0;
  muted = false;

  /** Must be called from a user gesture (the hold button does it). */
  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp).connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    void this.ctx.resume();
  }

  get ready() {
    return !!this.ctx && this.ctx.state === "running" && !this.muted;
  }

  private noise(dur: number, freq: number, q: number, gain: number, type: BiquadFilterType = "bandpass", delay = 0) {
    if (!this.ready || !this.ctx || !this.noiseBuf || !this.master) return;
    const c = this.ctx, t = c.currentTime + delay;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 0.4, dur + 0.02);
  }

  private tone(freq: number, dur: number, gain: number, delay = 0) {
    if (!this.ready || !this.ctx || !this.master) return;
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator();
    o.type = "sine"; o.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  /** Ratchet click of the crank — fired on the beat (every 30° of drum rotation). */
  tick(speed: number) {
    this.noise(0.025, 3800 + Math.random() * 600, 9, 0.05 + Math.min(speed, 8) * 0.012);
  }

  /** Balls hitting the brass rods. `energy` = summed impact speed. */
  rattle(energy: number) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (now - this.lastRattle < 0.035) return;
    this.lastRattle = now;
    const n = Math.min(3, 1 + Math.floor(energy / 2500));
    for (let i = 0; i < n; i++)
      this.noise(0.04, 1800 + Math.random() * 2400, 6, Math.min(0.18, 0.03 + energy / 40000), "bandpass", i * 0.011);
  }

  /** Power-up whoosh while holding. */
  whoosh(k: number) {
    this.noise(0.12, 300 + k * 1400, 1.2, 0.02 + k * 0.05, "lowpass");
  }

  /** Ball lands in the glass tray: thunk + glass ring. */
  land() {
    this.noise(0.14, 220, 1.4, 0.4, "lowpass");
    this.tone(2637, 0.9, 0.05, 0.01);
    this.tone(3951, 0.6, 0.025, 0.01);
  }

  /** Hatch opens. */
  hatch() {
    this.noise(0.05, 900, 4, 0.15);
    this.noise(0.03, 5200, 10, 0.08, "bandpass", 0.05);
  }

  /** Little bell when the number is announced. */
  bell() {
    for (const [f, d, g] of [[1318.5, 1.4, 0.06], [1975.5, 1.1, 0.04], [2637, 0.8, 0.025]] as const)
      this.tone(f, d, g, 0.05);
  }
}
