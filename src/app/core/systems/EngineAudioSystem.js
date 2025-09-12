export class EngineAudioSystem {
  constructor() {
    this.rateMin = 0.7;
    this.rateMax = 1.5;
    this.volIdle = 0.18;
    this.volMax = 0.4;
    this.playerVehicleBoost = 2.0; // Boost volume when player is in vehicle
    this.lastVolumeUpdate = 0; // Track when volume settings last changed
  }

  update(state, dt) {
    const audio = state.audio;
    if (!audio) return;

    // Check if volume/mute settings changed
    const currentTime = Date.now();
    const volumeChanged = this.lastVolumeUpdate !== audio.lastVolumeUpdate;
    
    if (volumeChanged) {
      this.lastVolumeUpdate = audio.lastVolumeUpdate;
    }

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
      let baseVol = this.volIdle + (this.volMax - this.volIdle) * t;

      // Check if player is in this vehicle
      const isPlayerVehicle = state.control?.inVehicle && state.control?.vehicle === v;
      const effectiveVolume = isPlayerVehicle ? baseVol * this.playerVehicleBoost : baseVol;

      // Use vehicle object as loop id
      const id = v;

      // Always update with current volume settings
      const currentSfxVolume = audio.sfxMuted ? 0 : audio.sfxVolume;
      const finalVolume = effectiveVolume * currentSfxVolume;

      audio.startOrUpdateLoopAt(key, id, v.pos, state, {
        rate,
        baseVolume: finalVolume,
        minDistance: isPlayerVehicle ? 0.5 : 2,
        maxDistance: isPlayerVehicle ? 5 : 20,
        panMax: isPlayerVehicle ? 4 : 14
      });

      // Handle siren for police cars with current volume
      if (v.vehicleType === 'police' && v.siren) {
        v._sirenLoopId = v._sirenLoopId || { type: 'siren', vehicle: v };
        const sirenVolume = audio.sfxMuted ? 0 : audio.sfxVolume * 0.4;
        audio.startOrUpdateLoopAt('siren', v._sirenLoopId, v.pos, state, {
          rate: 1.0,
          baseVolume: sirenVolume,
          minDistance: 1,
          maxDistance: 25,
          panMax: 8
        });
        activeSet.add(v._sirenLoopId);
      }

      activeSet.add(id);
    }

    // Cleanup loops for vehicles that no longer exist
    if (audio.loops && audio.loops.size) {
      for (const [id] of audio.loops) {
        if (id?.type === 'vehicle' && !activeSet.has(id)) {
          audio.stopLoop(id, { fadeOut: 0.15 });
        }
        // cleanup skid loops if vehicle no longer present
        if (id?.type === 'skid' && !vehicles.includes(id.vehicle)) {
          audio.stopLoop(id, { fadeOut: 0.1 });
        }
        // cleanup siren loops for non-existent vehicles
        if (id?.type === 'siren' && !vehicles.includes(id.vehicle)) {
          audio.stopLoop(id, { fadeOut: 0.15 });
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