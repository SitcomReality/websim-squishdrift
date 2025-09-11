export class ParticleSystem {
  constructor() {
    // lazy import submodules to avoid circular deps on load
    this._modules = null;
  }

  _ensure() {
    if (this._modules) return this._modules;
    const { ParticlesUpdater } = await import('./updaters/ParticlesUpdater.js');
    const { SmokeEmitter } = await import('./emitters/SmokeEmitter.js');
    const { DriftEmitter } = await import('./emitters/DriftEmitter.js');
    const { SparkEmitter } = await import('./emitters/SparkEmitter.js');
    const { BloodEmitter } = await import('./emitters/BloodEmitter.js');
    this._modules = {
      updater: new ParticlesUpdater(),
      smoke: new SmokeEmitter(),
      drift: new DriftEmitter(),
      spark: new SparkEmitter(),
      blood: new BloodEmitter(),
    };
    // wire dependencies
    this._modules.updater.setSmokeEmitter(this._modules.smoke);
    return this._modules;
  }

  async update(state, dt) {
    const m = await this._ensure();
    m.updater.update(state, dt);
  }

  // Emitters (API compatibility)
  async emitSmoke(state, vehicle, damageLevel) {
    const m = await this._ensure();
    m.smoke.emitSmoke(state, vehicle, damageLevel);
  }
  async emitDriftParticles(state, vehicle) {
    const m = await this._ensure();
    m.drift.emitDriftParticles(state, vehicle);
  }
  async emitSparks(state, pos, count = 6, power = 4, collisionNormal = null) {
    const m = await this._ensure();
    m.spark.emitSparks(state, pos, count, power, collisionNormal);
  }
  async emitCollisionSparks(state, vehicle, contactPoint, power = 8) {
    const m = await this._ensure();
    m.spark.emitCollisionSparks(state, vehicle, contactPoint, power);
  }
  async emitBlood(state, pos, count = 8, power = 3) {
    const m = await this._ensure();
    m.blood.emitBlood(state, pos, count, power);
  }
}

