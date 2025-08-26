export class AudioManager {
  constructor() {
    this.ctx = null;
    this.buffers = new Map();
    // Future-proofed controls
    this.sfxMuted = false;
    this.musicMuted = false;
    this.sfxVolume = 0.9;   // 0..1
    this.musicVolume = 0.6; // 0..1
  }

  async init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    await Promise.all([
      this.load('/sfx/pickup_health.mp3', 'pickup_health'),
      this.load('/sfx/pickup_bribe.mp3', 'pickup_bribe'),
      this.load('/sfx/pickup_default.mp3', 'pickup_default'),
    ]).catch(()=>{ /* ignore load errors gracefully */ });
  }

  async load(url, key) {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const res = await fetch(url);
    const arr = await res.arrayBuffer();
    const buf = await this.ctx.decodeAudioData(arr);
    this.buffers.set(key, buf);
  }

  playSfx(key, { volume = this.sfxVolume } = {}) {
    if (this.sfxMuted) return;
    const buf = this.buffers.get(key);
    if (!buf || !this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.value = Math.max(0, Math.min(1, volume));
    src.connect(gain).connect(this.ctx.destination);
    src.start(0);
  }
}

