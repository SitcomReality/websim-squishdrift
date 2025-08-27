import { Health } from '../../../components/Health.js';

export function handleVehicleDestruction(state, vehicle) {
  if (!vehicle.health || vehicle.health.isAlive()) return;

  if (state.explosionSystem) {
    state.explosionSystem.createExplosion(state, vehicle.pos);
  }

  if (state.scoringSystem) {
    state.scoringSystem.addCrime(state, 'destroy_vehicle', vehicle);
  }

  const vehicleIndex = state.entities.indexOf(vehicle);
  if (vehicleIndex > -1) {
    state.entities.splice(vehicleIndex, 1);
  }

  if (state.control?.vehicle === vehicle) {
    const deathSystem = state._engine?.systems?.death || 
                       state.deathSystem || 
                       state._engine?.deathSystem;
    if (deathSystem && deathSystem.handlePlayerDeath) {
      deathSystem.handlePlayerDeath(state);
    }
  }
}

export function addDamageIndicator(state, pos, damage) {
  if (!state.damageTexts) state.damageTexts = [];
  
  const actualDamage = damage || 0;
  
  const indicator = {
    type: 'damage_indicator',
    pos: { x: pos.x, y: pos.y },
    text: `-${actualDamage}`,
    color: '#ff3333',
    age: 0,
    lifetime: 1.5,
    size: 14
  };
  
  state.damageTexts.push(indicator);
}

export function smoothCollisionNormal(normal, objA, objB) {
  const centerToCenter = {
    x: objB.pos.x - objA.pos.x,
    y: objB.pos.y - objA.pos.y
  };
  
  const len = Math.hypot(centerToCenter.x, centerToCenter.y);
  if (len > 0) {
    centerToCenter.x /= len;
    centerToCenter.y /= len;
  }
  
  const blendFactor = 0.8;
  return {
    x: normal.x * blendFactor + centerToCenter.x * (1 - blendFactor),
    y: normal.y * blendFactor + centerToCenter.y * (1 - blendFactor)
  };
}

export function applyCollisionDamping(objA, objB) {
  if (typeof objA.angularVelocity === 'number') {
    objA.angularVelocity *= 0.7;
  }
  if (typeof objB.angularVelocity === 'number') {
    objB.angularVelocity *= 0.7;
  }
  
  let dampingFactor = 0.85;
  if (objB && objA?.vel && objB?.vel) {
    const rel = Math.hypot((objA.vel.x||0)-(objB.vel.x||0),(objA.vel.y||0)-(objB.vel.y||0));
    const a = (x)=>((x%(2*Math.PI))+2*Math.PI)%(2*Math.PI);
    const hDiff = (objA.rot!=null && objB.rot!=null) ? Math.abs(((a(objA.rot)-a(objB.rot)+Math.PI)%(2*Math.PI))-Math.PI) : Math.PI;
    if (rel < 0.6 && hDiff < 0.5) dampingFactor = 0.97;
  }
  if (objA.vel) {
    objA.vel.x *= dampingFactor;
    objA.vel.y *= dampingFactor;
  }
  if (objB.vel) {
    objB.vel.x *= dampingFactor;
    objB.vel.y *= dampingFactor;
  }
}

export function getVelocityDirection(entity) {
    const speed = Math.hypot(entity.vel.x, entity.vel.y);
    if (speed < 0.01) return { x: 0, y: 0 };
    return { x: entity.vel.x / speed, y: entity.vel.y / speed };
}

export function calculateBounceNormal(velocityDir, contactNormal) {
    if (velocityDir.x === 0 && velocityDir.y === 0) {
      return contactNormal;
    }

    const dot = velocityDir.x * contactNormal.x + velocityDir.y * contactNormal.y;
    const reflected = {
      x: velocityDir.x - 2 * dot * contactNormal.x,
      y: velocityDir.y - 2 * dot * contactNormal.y
    };

    const length = Math.hypot(reflected.x, reflected.y);
    if (length < 0.01) return contactNormal;

    return { x: reflected.x / length, y: reflected.y / length };
}

