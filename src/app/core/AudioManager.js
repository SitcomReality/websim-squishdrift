export class AudioManager {
  constructor() {
    this.ctx = null;
    this.buffers = new Map();
    // Future-proofed controls
    this.sfxMuted = false;
    this.musicMuted = false;
    this.sfxVolume = 0.9;   // 0..1
    this.musicVolume = 0.6; // 0..1
    this.loops = new Map(); // id -> { src, gain, panner, key }
  }

  async init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    await Promise.all([
      this.load('/sfx/pickup_health.mp3', 'pickup_health'),
      this.load('/sfx/pickup_bribe.mp3', 'pickup_bribe'),
      this.load('/sfx/pickup_default.mp3', 'pickup_default'),
      this.load('/sfx/shoot01.mp3', 'shoot01'),
      this.load('/sfx/shoot02.mp3', 'shoot02'),
      this.load('/sfx/explosion01.mp3', 'explosion01'),
      this.load('/sfx/explosion02.mp3', 'explosion02'),
      this.load('/sfx/impact01.mp3', 'impact01'),
      this.load('/sfx/impact02.mp3', 'impact02'),
      this.load('/sfx/impact03.mp3', 'impact03'),
      this.load('/sfx/pedestrian_death.mp3', 'pedestrian_death'),
      this.load('/sfx/tire_screech01.mp3', 'tire_screech01'),
      this.load('/sfx/tire_screech02.mp3', 'tire_screech02'),
      this.load('/sfx/tire_screech03.mp3', 'tire_screech03'),
      this.load('/sfx/siren.mp3', 'siren'),
      this.load('/sfx/projectile_hit.mp3', 'projectile_hit'),
      // engine loops
      this.load('/sfx/engine_compact.mp3', 'engine_compact'),
      this.load('/sfx/engine_emergency.mp3', 'engine_emergency'),
      this.load('/sfx/engine_sedan.mp3', 'engine_sedan'),
      this.load('/sfx/engine_sport.mp3', 'engine_sport'),
      this.load('/sfx/engine_truck.mp3', 'engine_truck')
    ]).catch(()=>{ /* ignore load errors gracefully */ });
  }

  async load(url, key) {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    try {
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      const buf = await this.ctx.decodeAudioData(arr);
      this.buffers.set(key, buf);
    } catch (e) {
      console.warn(`Failed to load audio: ${url}`, e);
    }
  }

  playSfx(key, { volume = this.sfxVolume } = {}) {
    if (this.sfxMuted) return;
    const buf = this.buffers.get(key);
    if (!buf || !this.ctx) return;
    
    // Ensure context is resumed if suspended
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.value = Math.max(0, Math.min(1, volume));
    src.connect(gain).connect(this.ctx.destination);
    src.start(0);
  }

  playSfxAt(key, pos, state, { volume = this.sfxVolume, minDistance = 2, maxDistance = 18, panMax = 12 } = {}) {
    if (this.sfxMuted) return;
    const buf = this.buffers.get(key);
    if (!buf || !this.ctx || !pos || !state) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const player = state.entities?.find(e => e.type === 'player')?.pos || state.camera;
    const cam = state.camera || player;
    if (!player || !cam) return;

    const dx = pos.x - player.x, dy = pos.y - player.y;
    const dist = Math.hypot(dx, dy);
    const att = dist <= minDistance ? 1 : Math.max(0, 1 - (dist - minDistance) / Math.max(1e-3, (maxDistance - minDistance)));
    const finalVol = Math.max(0, Math.min(1, volume * att));

    const panX = pos.x - cam.x;
    const pan = Math.max(-1, Math.min(1, panX / panMax));

    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.value = finalVol;

    let destNode = gain;
    if (this.ctx.createStereoPanner) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = pan;
      gain.connect(panner).connect(this.ctx.destination);
    } else {
      gain.connect(this.ctx.destination);
    }
    src.connect(gain);
    src.start(0);
  }

  // Start or update a spatial looping sound with rate and volume
  startOrUpdateLoopAt(key, id, pos, state, { rate = 1.0, baseVolume = this.sfxVolume, minDistance = 2, maxDistance = 18, panMax = 12 } = {}) {
    if (!this.ctx || !key || !id) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const buf = this.buffers.get(key);
    if (!buf) return;

    let node = this.loops.get(id);
    // Recreate if missing or key changed
    if (!node || node.key !== key) {
      if (node) {
        try { node.src.stop(0); } catch {}
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const gain = this.ctx.createGain();
      const usePanner = !!this.ctx.createStereoPanner;
      const panner = usePanner ? this.ctx.createStereoPanner() : null;

      src.connect(gain);
      (panner ? gain.connect(panner).connect(this.ctx.destination) : gain.connect(this.ctx.destination));

      src.start(0);
      node = { src, gain, panner, key };
      this.loops.set(id, node);
    }

    // Spatial attenuation and pan
    const player = state.entities?.find(e => e.type === 'player')?.pos || state.camera;
    const cam = state.camera || player;
    if (!player || !cam) return;
    const dx = pos.x - player.x, dy = pos.y - player.y;
    const dist = Math.hypot(dx, dy);
    const att = dist <= minDistance ? 1 : Math.max(0, 1 - (dist - minDistance) / Math.max(1e-3, (maxDistance - minDistance)));
    const finalVol = Math.max(0, Math.min(1, baseVolume * att));
    const panX = pos.x - cam.x;
    const pan = Math.max(-1, Math.min(1, panX / panMax));

    // Smooth parameter updates
    const t = this.ctx.currentTime;
    try {
      node.src.playbackRate.cancelScheduledValues(t);
      node.src.playbackRate.linearRampToValueAtTime(Math.max(0.01, rate), t + 0.05);
    } catch {
      node.src.playbackRate.value = Math.max(0.01, rate);
    }
    try {
      node.gain.gain.cancelScheduledValues(t);
      node.gain.gain.linearRampToValueAtTime(finalVol, t + 0.05);
    } catch {
      node.gain.gain.value = finalVol;
    }
    if (node.panner) {
      try { node.panner.pan.setTargetAtTime(pan, t, 0.05); } catch { node.panner.pan.value = pan; }
    }
  }

  stopLoop(id, { fadeOut = 0.1 } = {}) {
    const node = this.loops.get(id);
    if (!node) return;
    const t = this.ctx?.currentTime || 0;
    try {
      node.gain.gain.cancelScheduledValues(t);
      node.gain.gain.linearRampToValueAtTime(0, t + fadeOut);
      setTimeout(() => { try { node.src.stop(0); } catch {} }, Math.max(0, fadeOut * 1000 + 10));
    } catch {
      try { node.src.stop(0); } catch {}
    }
    this.loops.delete(id);
  }
}