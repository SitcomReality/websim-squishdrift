export class AudioManager {
  constructor() {
    this.ctx = null;
    this.buffers = new Map();
    this.sfxMuted = false;
    this.musicMuted = false;
    this.sfxVolume = 0.9;   // 0..1
    this.musicVolume = 0.6; // 0..1
    this.loops = new Map(); // id -> { src, gain, panner, key }
    this.musicLoop = null;
    this.mainTheme = null;
    this.deathMusic = null;
    
    // Track when volume settings change
    this.lastVolumeUpdate = Date.now();
    
    // Add volume and mute state tracking
    this.volumeSettings = {
      sfx: 0.9,
      music: 0.6,
      sfxMuted: false,
      musicMuted: false
    };
    
    // Bind methods for external access
    this.setSfxVolume = this.setSfxVolume.bind(this);
    this.setMusicVolume = this.setMusicVolume.bind(this);
    this.toggleSfxMute = this.toggleSfxMute.bind(this);
    this.toggleMusicMute = this.toggleMusicMute.bind(this);
  }

  async init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    await Promise.all([
      this.load('./sfx/pickup_health.mp3', 'pickup_health'),
      this.load('./sfx/pickup_bribe.mp3', 'pickup_bribe'),
      this.load('./sfx/pickup_default.mp3', 'pickup_default'),
      this.load('./sfx/shoot01.mp3', 'shoot01'),
      this.load('./sfx/shoot02.mp3', 'shoot02'),
      this.load('./sfx/explosion01.mp3', 'explosion01'),
      this.load('./sfx/explosion02.mp3', 'explosion02'),
      this.load('./sfx/impact02.mp3', 'impact02'),
      this.load('./sfx/impact03.mp3', 'impact03'),
      this.load('./sfx/pedestrian_death.mp3', 'pedestrian_death'),
      this.load('./sfx/oof02.mp3', 'oof02'),
      this.load('./sfx/tire_screech01.mp3', 'tire_screech01'),
      this.load('./sfx/tire_screech02.mp3', 'tire_screech02'),
      this.load('./sfx/tire_screech03.mp3', 'tire_screech03'),
      this.load('./sfx/siren.mp3', 'siren'), // Add siren audio
      this.load('./sfx/projectile_hit.mp3', 'projectile_hit'),
      this.load('./sfx/ouch.mp3', 'ouch'),
      this.load('./sfx/click.mp3', 'click'),
      // engine loops
      this.load('./sfx/engine_compact.mp3', 'engine_compact'),
      this.load('./sfx/engine_emergency.mp3', 'engine_emergency'),
      this.load('./sfx/engine_sedan.mp3', 'engine_sedan'),
      this.load('./sfx/engine_sport.mp3', 'engine_sport'),
      this.load('./sfx/engine_truck.mp3', 'engine_truck'),
      this.load('./sfx/tire_skid_loop.mp3', 'tire_skid_loop'), // new loop SFX
      // Load death music
      this.load('./music/damocles.mp3', 'damocles'),
      // Add flatten ability sounds
      this.load('./sfx/flatten_down.mp3', 'flatten_down'),
      this.load('./sfx/flatten_up.mp3', 'flatten_up')
    ]).catch(()=>{ /* ignore load errors gracefully */ });
    
    // Load main theme
    this.mainTheme = new Audio('./music/player2.mp3');
    this.mainTheme.loop = true;
    this.mainTheme.volume = this.musicVolume;
    this.mainTheme.muted = !!this.musicMuted;
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

  // Update play methods to respect volume settings
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
    
    // Halve volume for impact sounds
    const isImpact = key.startsWith('impact');
    const effectiveVolume = isImpact ? volume * 0.5 : volume;
    
    gain.gain.value = Math.max(0, Math.min(1, effectiveVolume));
    src.connect(gain).connect(this.ctx.destination);
    src.start(0);
  }

  playSfxAt(key, pos, state, { volume = this.sfxVolume, minDistance = 2, maxDistance = 18, panMax = 12 } = {}) {
    if (this.sfxMuted) return;
    const buf = this.buffers.get(key);
    if (!buf || !this.ctx || !pos || !state) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    // Halve volume for impact sounds
    const isImpact = key.startsWith('impact');
    const effectiveVolume = isImpact ? volume * 0.5 : volume;

    const player = state.entities?.find(e => e.type === 'player')?.pos || state.camera;
    const cam = state.camera || player;
    if (!player || !cam) return;

    const dx = pos.x - player.x, dy = pos.y - player.y;
    const dist = Math.hypot(dx, dy);
    // More severe falloff: quintic curve
    const x = Math.max(0, Math.min(1, (dist - minDistance) / Math.max(1e-3, (maxDistance - minDistance))));
    const att = dist <= minDistance ? 1 : Math.pow(1 - x, 5);
    const finalVol = Math.max(0, Math.min(1, effectiveVolume * att));
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

  startOrUpdateLoopAt(key, id, pos, state, { rate = 1.0, baseVolume = this.sfxVolume, minDistance = 2, maxDistance = 18, panMax = 12, startOffset = 0 } = {}) {
    if (!this.ctx || !key || !id) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    if (this.musicMuted && this.isMusicLoop(key)) return;
    if (this.sfxMuted && !this.isMusicLoop(key)) return;
    
    const volumeMultiplier = this.isMusicLoop(key) ? this.musicVolume : this.sfxVolume;
    const adjustedBaseVolume = (baseVolume || 1) * volumeMultiplier;
    
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

      src.start(0, Math.max(0, Math.min((buf.duration || 0), startOffset))); // start with offset
      node = { src, gain, panner, key };
      this.loops.set(id, node);
    }

    // Spatial attenuation and pan
    const player = state.entities?.find(e => e.type === 'player')?.pos || state.camera;
    const cam = state.camera || player;
    if (!player || !cam) return;
    const dx = pos.x - player.x, dy = pos.y - player.y;
    const dist = Math.hypot(dx, dy);
    // More severe falloff: quintic curve
    const x = Math.max(0, Math.min(1, (dist - minDistance) / Math.max(1e-3, (maxDistance - minDistance))));
    const att = dist <= minDistance ? 1 : Math.pow(1 - x, 5);
    const finalVol = Math.max(0, Math.min(1, adjustedBaseVolume * att));
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

  // Helper to determine if a loop is music or sfx
  isMusicLoop(key) {
    const musicLoops = ['music_loop', 'background', 'ambient'];
    return musicLoops.includes(key);
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

  playMainTheme() {
    if (this.mainTheme) {
      this.mainTheme.muted = !!this.musicMuted;
      this.mainTheme.volume = this.musicVolume;
      this.mainTheme.currentTime = 0;
      this.mainTheme.play().catch(e => console.warn('Could not play main theme:', e));
    }
  }

  stopMainTheme(fadeOut = 1.0) {
    if (this.mainTheme && !this.mainTheme.paused) {
      const step = Math.max(10, Math.floor(fadeOut * 50));
      const fade = () => {
        const v = this.mainTheme.volume;
        if (v > 0.005) {
          this.mainTheme.volume = Math.max(0, v - 0.04);
          setTimeout(fade, step);
        } else {
          this.mainTheme.pause();
          this.mainTheme.currentTime = 0;
          // restore volume for next start (respect mute state)
          this.mainTheme.volume = this.musicMuted ? 0 : this.musicVolume;
        }
      };
      fade();
    }
  }

  playDeathMusic() {
    if (this.deathMusic) return; // Already playing
    
    this.deathMusic = new Audio('./music/damocles.mp3');
    this.deathMusic.volume = this.musicMuted ? 0 : this.musicVolume;
    this.deathMusic.muted = this.musicMuted;
    this.deathMusic.loop = false;
    
    this.deathMusic.play().catch(e => console.warn('Could not play death music:', e));
    
    // Clean up when done
    this.deathMusic.addEventListener('ended', () => {
      this.deathMusic = null;
    });
  }

  stopDeathMusic() {
    if (this.deathMusic) {
      const fadeOut = () => {
        const currentVolume = this.deathMusic.volume;
        if (currentVolume > 0.05) {
          this.deathMusic.volume = Math.max(0, currentVolume - 0.1);
          setTimeout(fadeOut, 50);
        } else {
          this.deathMusic.pause();
          this.deathMusic.currentTime = 0;
          this.deathMusic = null;
        }
      };
      fadeOut();
    }
  }

  stopAll() {
    this.stopMainTheme(1.0);
    this.stopDeathMusic();
    
    // Stop all loops with fade out
    if (this.loops && this.loops.size) {
      for (const [id] of this.loops) {
        this.stopLoop(id, { fadeOut: 1.0 });
      }
    }
    
    // Stop any other playing sounds
    if (this.ctx) {
      // Create a master gain node to fade out all sounds
      if (this.masterGain) {
        const t = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(t);
        this.masterGain.gain.linearRampToValueAtTime(0, t + 1.0);
      }
    }
  }

  // Update volume control methods
  setSfxVolume(volume) {
    this.volumeSettings.sfx = Math.max(0, Math.min(1, volume));
    this.sfxVolume = this.volumeSettings.sfx;
    this.sfxMuted = this.volumeSettings.sfxMuted;
    this.lastVolumeUpdate = Date.now();
  }

  setMusicVolume(volume) {
    this.volumeSettings.music = Math.max(0, Math.min(1, volume));
    this.musicVolume = this.volumeSettings.music;
    this.musicMuted = this.volumeSettings.musicMuted;
    this.lastVolumeUpdate = Date.now();
    
    if (this.mainTheme) {
      this.mainTheme.volume = this.musicMuted ? 0 : this.musicVolume;
    }
    if (this.deathMusic) {
      this.deathMusic.volume = this.musicMuted ? 0 : this.musicVolume;
    }
  }

  toggleSfxMute() {
    this.volumeSettings.sfxMuted = !this.volumeSettings.sfxMuted;
    this.sfxMuted = this.volumeSettings.sfxMuted;
    this.lastVolumeUpdate = Date.now();
    return this.sfxMuted;
  }

  toggleMusicMute() {
    this.volumeSettings.musicMuted = !this.volumeSettings.musicMuted;
    this.musicMuted = this.volumeSettings.musicMuted;
    this.lastVolumeUpdate = Date.now();
    
    if (this.mainTheme) {
      this.mainTheme.muted = this.musicMuted;
      if (!this.musicMuted) this.mainTheme.volume = this.musicVolume;
    }
    if (this.deathMusic) {
      this.deathMusic.muted = this.musicMuted;
      if (!this.musicMuted) this.deathMusic.volume = this.musicVolume;
    }
    
    return this.musicMuted;
  }
}