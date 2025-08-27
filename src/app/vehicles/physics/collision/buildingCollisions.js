import { aabbForTile, aabbForTrunk, obbOverlap, resolveDynamicStatic } from '../../physics/geom.js';
import { Health } from '../../../components/Health.js';
import { entityOBB } from './helpers.js';
import { applyBuildingDamping, getVelocityDirection, calculateBounceNormal, isTreeTrunk } from './helpers.js';

export class BuildingCollision {
  constructor() {
    this.collisionDamageThreshold = 0.5;
    this.damageCooldown = 1000;
  }
  handleBuildingCollisions(state, v) {
    const map = state.world?.map; if (!map) return;
    const r = Math.ceil(Math.max(v.hitboxW||0.9, v.hitboxH||0.5)) + 1, tx=Math.floor(v.pos.x), ty=Math.floor(v.pos.y);
    const obb = entityOBB(v);
    for (let oy=-r; oy<=r; oy++) for (let ox=-r; ox<=r; ox++) {
      const gx=tx+ox, gy=ty+oy; if (gx<0||gy<0||gx>=map.width||gy>=map.height) continue;
      const t = map.tiles[gy][gx];
      if (isTreeTrunk(gx, gy, map)) {
        const contact = obbOverlap(obb, aabbForTrunk(gx, gy)); if (!contact) continue;
        const corrected = { ...contact, normal: contact.normal };
        resolveDynamicStatic(v, corrected, 0.2);
        this.damageFromImpact(state, v, 5);
        this.reflectVelocity(v, corrected);
        applyBuildingDamping(v);
        continue;
      }
      if (t !== 8 && t !== 9) continue;
      const contact = obbOverlap(obb, aabbForTile(gx,gy)); if (!contact) continue;
      const corrected = { ...contact, normal: contact.normal };
      resolveDynamicStatic(v, corrected, 0.2);
      this.reflectVelocity(v, corrected);
      applyBuildingDamping(v);
      this.damageFromImpact(state, v, 8);
    }
  }
  damageFromImpact(state, v, scale) {
    const now = Date.now();
    const canDamage = now - (v.lastDamageTime || 0) >= this.damageCooldown;
    if (!canDamage) return;
    const impactSpeed = Math.hypot(v.vel?.x||0, v.vel?.y||0);
    if (impactSpeed <= this.collisionDamageThreshold) return;
    if (!v.health) v.health = new Health(v.maxHealth || 100);
    const damage = Math.max(1, Math.round(impactSpeed * scale));
    v.health.takeDamage(damage);
    v.lastDamageTime = now;
    const snd = ['impact01','impact02','impact03'][Math.floor(Math.random()*3)];
    state.audio?.playSfxAt?.(snd, v.pos, state);
    state.particleSystem?.emitSparks(state, v.pos, Math.min(12, 4 + Math.floor(damage/5)), 4);
    if (!v.health.isAlive()) {
      state.explosionSystem?.createExplosion(state, v.pos);
      state.scoringSystem?.addCrime(state, 'destroy_vehicle', v);
      const idx = state.entities.indexOf(v); if (idx > -1) state.entities.splice(idx, 1);
      if (state.control?.vehicle === v) {
        const ds = state._engine?.systems?.death || state.deathSystem || state._engine?.deathSystem;
        ds?.handlePlayerDeath?.(state);
      }
    } else {
      state.damageTexts = state.damageTexts || [];
      state.damageTexts.push({ type:'damage_indicator', pos:{x:v.pos.x,y:v.pos.y}, text:`-${damage}`, color:'#ff3333', age:0, lifetime:1.5, size:14 });
    }
  }
  reflectVelocity(v, contact) {
    const restitution = 0.6;
    const speed = Math.hypot(v.vel.x || 0, v.vel.y || 0);
    const velDir = getVelocityDirection(v);
    const reflect = calculateBounceNormal(velDir, contact.normal);
    const bounceFactor = Math.max(0.25, restitution * 0.8);
    v.vel.x = reflect.x * speed * bounceFactor;
    v.vel.y = reflect.y * speed * bounceFactor;
  }
  handleMapBoundaries(state, v) {
    const map = state.world?.map; if (!map) return;
    const r = Math.ceil(Math.max(v.hitboxW||0.9, v.hitboxH||0.5)) + 1, tx=Math.floor(v.pos.x), ty=Math.floor(v.pos.y);
    const obb = entityOBB(v);
    for (let oy=-r; oy<=r; oy++) for (let ox=-r; ox<=r; ox++) {
      const gx=tx+ox, gy=ty+oy; if (gx<0||gy<0||gx>=map.width||gy>=map.height) continue;
      const t = map.tiles[gy][gx];
      if (isTreeTrunk(gx, gy, map)) {
        const contact = obbOverlap(obb, aabbForTrunk(gx, gy)); if (!contact) continue;
        const corrected = { ...contact, normal: contact.normal };
        resolveDynamicStatic(v, corrected, 0.6);
        this.reflectVelocity(v, corrected);
        applyBuildingDamping(v);
        continue;
      }
      if (t !== 8 && t !== 9) continue;
      const contact = obbOverlap(obb, aabbForTile(gx,gy)); if (!contact) continue;
      const corrected = { ...contact, normal: contact.normal };
      resolveDynamicStatic(v, corrected, 0.6);
      this.reflectVelocity(v, corrected);
      applyBuildingDamping(v);
    }
  }
}