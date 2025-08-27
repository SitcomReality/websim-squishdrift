export class EngineAudioSystem {
  constructor() {
    this.rateMin = 0.7;
    this.rateMax = 1.5;
    this.volIdle = 0.18;
    this.volMax = 0.4;
  }

  update(state, dt) {
    const audio = state.audio;
    if (!audio) return;

    const vehicles = state.entities.filter(e => e.type === 'vehicle');
    const activeSet = new Set();

    for (const v of vehicles) {
      if (!v.pos || !v.vel) continue;

      // Map vehicle type to engine key
      const key = this.engineKeyFor(v);
      if (!key) continue;

      // Compute speed fraction vs maxSpeed
      const speed = Math.hypot(v.vel.x || 0, v.vel.y || 0);
      const maxS = Math.max(0.01, v.maxSpeed || 4);
      const t = Math.max(0, Math.min(1, speed / maxS));

      const rate = this.rateMin + (this.rateMax - this.rateMin) * t;
      const baseVol = this.volIdle + (this.volMax - this.volIdle) * t;

      // Use vehicle object as loop id
      const id = v;

      audio.startOrUpdateLoopAt(key, id, v.pos, state, {
        rate,
        baseVolume: baseVol,
        minDistance: 2,
        maxDistance: 20,
        panMax: 14
      });

      activeSet.add(id);
    }

    // Cleanup loops for vehicles that no longer exist
    if (audio.loops && audio.loops.size) {
      for (const [id] of audio.loops) {
        if (id?.type === 'vehicle' && !activeSet.has(id)) {
          audio.stopLoop(id, { fadeOut: 0.15 });
        }
        // also cleanup skid loops if vehicle no longer present
        if (id?.type === 'skid' && !vehicles.includes(id.vehicle)) {
          audio.stopLoop(id, { fadeOut: 0.1 });
        }
      }
    }
  }

  engineKeyFor(v) {
    const type = (v.vehicleType || '').toLowerCase();
    if (type === 'compact') return 'engine_compact';
    if (type === 'sedan') return 'engine_sedan';
    if (type === 'truck') return 'engine_truck';
    if (type === 'sports' || type === 'sport') return 'engine_sport';
    if (type === 'emergency' || type === 'police' || type === 'ambulance' || type === 'firetruck') return 'engine_emergency';
    return 'engine_sedan';
  }

  stopAll() {
    // This method will be called by the death system to stop all engine audio
    // Implementation depends on the audio system structure
  }
}