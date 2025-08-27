import { entityOBB, obbOverlap, resolveDynamicDynamic } from '../../physics/geom.js';
import { Health } from '../../../components/Health.js';
import { smoothCollisionNormal, applyCollisionDamping } from './helpers.js';

export class VehicleVehicleCollision {
  constructor() {
    this.collisionDamageThreshold = 0.5;
    this.damageMultiplier = 20.0;
    this.damageCooldown = 1000;
  }
  handleVehicleCollisions(state, v) {
    const others = state.entities.filter(e => e.type === 'vehicle' && e !== v);
    const obbA = entityOBB(v);
    for (const o of others) {
      const contact = obbOverlap(obbA, entityOBB(o));
      if (!contact) continue;
      const corrected = { ...contact, normal: smoothCollisionNormal(contact.normal, v, o) };
      resolveDynamicDynamic(v, o, corrected, 0.6);
      this.calculateCollisionDamage(state, v, o);
      applyCollisionDamping(v, o);
    }
  }
  calculateCollisionDamage(state, a, b) {
    const now = Date.now();
    const canA = now - (a.lastDamageTime || 0) >= this.damageCooldown;
    const canB = now - (b.lastDamageTime || 0) >= this.damageCooldown;
    if (!canA && !canB) return;
    if (!a.health) a.health = new Health(a.maxHealth || 100);
    if (!b.health) b.health = new Health(b.maxHealth || 100);
    const rvx = (a.vel?.x||0)-(b.vel?.x||0), rvy = (a.vel?.y||0)-(b.vel?.y||0);
    const impact = Math.hypot(rvx, rvy);
    if (impact < this.collisionDamageThreshold) return;
    const tot = (a.mass||1200)+(b.mass||1200);
    const dA = Math.max(1, Math.round((impact * (b.mass||1200) / tot) * this.damageMultiplier));
    const dB = Math.max(1, Math.round((impact * (a.mass||1200) / tot) * this.damageMultiplier));
    if (canA) {
      a.health.takeDamage(dA); a.lastDamageTime = now;
      state.particleSystem?.emitSparks(state, a.pos, Math.min(12, 4 + Math.floor(dA/5)), 4);
      const snd = ['impact01','impact02','impact03'][Math.floor(Math.random()*3)];
      state.audio?.playSfxAt?.(snd, a.pos, state);
    }
    if (canB) {
      b.health.takeDamage(dB); b.lastDamageTime = now;
      state.particleSystem?.emitSparks(state, b.pos, Math.min(12, 4 + Math.floor(dB/5)), 4);
      const snd = ['impact01','impact02','impact03'][Math.floor(Math.random()*3)];
      state.audio?.playSfxAt?.(snd, b.pos, state);
    }
    this.handleVehicleDestruction(state, a);
    this.handleVehicleDestruction(state, b);
    if (canA) this.addDamageIndicator(state, a.pos, dA);
    if (canB) this.addDamageIndicator(state, b.pos, dB);
    if (impact > 3.0 && state.cameraSystem) state.cameraSystem.addShake(Math.min(1, impact / 8));
  }
  handleVehicleDestruction(state, vehicle) {
    if (!vehicle.health || vehicle.health.isAlive()) return;
    state.explosionSystem?.createExplosion(state, vehicle.pos);
    state.scoringSystem?.addCrime(state, 'destroy_vehicle', vehicle);
    const idx = state.entities.indexOf(vehicle);
    if (idx > -1) state.entities.splice(idx, 1);
    if (state.control?.vehicle === vehicle) {
      const ds = state._engine?.systems?.death || state.deathSystem || state._engine?.deathSystem;
      ds?.handlePlayerDeath?.(state);
    }
  }
  addDamageIndicator(state, pos, dmg) {
    state.damageTexts = state.damageTexts || [];
    state.damageTexts.push({ type:'damage_indicator', pos:{x:pos.x,y:pos.y}, text:`-${dmg}`, color:'#ff3333', age:0, lifetime:1.5, size:14 });
  }
}