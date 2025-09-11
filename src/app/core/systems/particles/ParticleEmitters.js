import { Vec2 } from '../../../../utils/Vec2.js';
import { ParticleTypes, ParticleColors } from './ParticleTypes.js';

export function emitVehicleSmoke(state, vehicle, damageLevel) {
  if (!state.particles) state.particles = [];

  const count = 1 + Math.floor(damageLevel * 2);
  const frontOffset = 0.2;
  const offsetX = Math.cos(vehicle.rot) * frontOffset;
  const offsetY = Math.sin(vehicle.rot) * frontOffset;
  const spread = 0.2;

  for (let i = 0; i < count; i++) {
    const x = vehicle.pos.x + offsetX + (Math.random() - 0.5) * spread;
    const y = vehicle.pos.y + offsetY + (Math.random() - 0.5) * spread;

    const lightness = 20 + Math.random() * 50;
    const alpha = 0.7 - (damageLevel * 0.3);

    state.particles.push({
      type: ParticleTypes.SMOKE,
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -0.3 - (damageLevel * 0.4),
      life: 2.0 + (damageLevel * 1.5),
      maxLife: 2.0 + (damageLevel * 1.5),
      alpha: alpha,
      size: 0.05 + (damageLevel * 0.05),
      color: `hsl(0, 0%, ${lightness}%)`
    });
  }
}

export function emitCollisionSparks(state, pos, count = 6, power = 4, collisionNormal = null) {
  if (!state.particles) state.particles = [];

  const sparkSize = 0.01 + Math.random() * 0.015;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = power * (0.4 + Math.random());

    state.particles.push({
      type: ParticleTypes.SPARK,
      x: pos.x,
      y: pos.y,
      vx: Math.cos(angle) * speed * 0.5,
      vy: Math.sin(angle) * speed * 0.5,
      life: 0.15 + Math.random() * 0.2,
      maxLife: 0.15 + Math.random() * 0.2,
      size: sparkSize,
      maxSize: Math.max(sparkSize * 0.08, sparkSize * 0.6),
      color: 'rgba(255,200,50,1)',
      alpha: 1.0
    });
  }
}

export function emitBlood(state, pos, count = 8, power = 3) {
  if (!state.particles) state.particles = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = power * (0.4 + Math.random());

    state.particles.push({
      type: ParticleTypes.BLOOD,
      x: pos.x,
      y: pos.y,
      vx: Math.cos(angle) * speed * 0.5,
      vy: Math.sin(angle) * speed * 0.5,
      life: 0.4 + Math.random() * 0.6,
      maxLife: 0.4 + Math.random() * 0.6,
      size: 0.02 + Math.random() * 0.03,
      color: ParticleColors.RED,
      alpha: 1.0
    });
  }
}

export function emitDriftParticles(state, vehicle) {
  if (!state.particles) state.particles = [];

  const vx = vehicle.vel?.x || 0;
  const vy = vehicle.vel?.y || 0;
  const speed = Math.hypot(vx, vy);

  if (speed < 0.05) return;

  const fwdX = Math.cos(vehicle.rot || 0);
  const fwdY = Math.sin(vehicle.rot || 0);
  const lateral = Math.abs(vx * fwdY - vy * fwdX);
  const longitudinal = Math.abs(vx * fwdX + vy * fwdY);
  const lateralImportance = lateral / (longitudinal + lateral + 1e-6);

  if (lateralImportance < 0.08) return;

  const comboCount = state.comboCount || 0;
  const comboForScaling = Math.min(comboCount, 10);
  const comboIntensity = (comboForScaling + 2) / 9.5;

  const baseCount = (1 + Math.ceil(lateral * 0.6)) * comboIntensity;
  const slipDirection = Math.sign(vx * fwdY - vy * fwdX);

  let leftCount = Math.floor(baseCount * (slipDirection >= 0 ? (1 + lateralImportance * 3.0) : (1 - lateralImportance * 0.5));
  let rightCount = Math.floor(baseCount * (slipDirection <= 0 ? (1 + lateralImportance * 3.0) : (1 - lateralImportance * 0.5));

  leftCount = Math.max(0, leftCount);
  rightCount = Math.max(0, rightCount);

  const rearWheelOffset = -0.3;
  const perpX = -fwdY;
  const perpY = fwdX;

  let trackHalfWidth = 0.23;
  if (vehicle.vehicleType === 'compact' || vehicle.vehicleType === 'sports') {
    trackHalfWidth = 0.23 * 0.6;
  } else {
    trackHalfWidth = 0.23 * 0.6;
  }

  const rearX = vehicle.pos.x + fwdX * rearWheelOffset;
  const rearY = vehicle.pos.y + fwdY * rearWheelOffset;

  const wheelPositions = {
    left: { x: rearX - perpX * trackHalfWidth, y: rearY - perpY * trackHalfWidth },
    right: { x: rearX + perpX * trackHalfWidth, y: rearY + perpY * trackHalfWidth }
  };

  const emitFromWheel = (pos, count) => {
    for (let i = 0; i < count; i++) {
      const superSparkChance = 0.02 + 0.1 * (comboForScaling / 10);
      const isSuperSpark = Math.random() < superSparkChance;
      
      const oppositeAngle = Math.atan2(-vy, -vx);
      const spread = Math.PI * (0.6 + Math.min(0.9, lateralImportance * 1.5));
      const angle = oppositeAngle + (Math.random() - 0.5) * spread;
      
      const particleSpeed = (0.6 + Math.random() * 0.9) * (1 + lateral * 1.6);
      
      let color, size, life, coronaColor = null;

      if (isSuperSpark) {
        color = 'rgba(255, 255, 220, 1.0)';
        const vibrantColors = [
          ParticleColors.PURPLE,
          ParticleColors.CYAN,
          ParticleColors.MAGENTA,
          ParticleColors.GREEN
        ];
        const numColors = 1 + Math.floor((comboForScaling / 10) * (vibrantColors.length - 1));
        coronaColor = vibrantColors[Math.floor(Math.random() * numColors)];

        life = (0.08 + Math.random() * 0.08) * (1 + lateral * 1.5) * comboIntensity;
        size = (0.008 + Math.random() * 0.004) * (0.8 + lateralImportance) * comboIntensity;
      } else {
        const colorfulness = comboForScaling / 10;
        const randColor = Math.random();
        
        if (randColor < 0.6 * (1 - colorfulness * 0.85)) {
          color = 'rgba(255, 255, 255, 0.9)';
        } else if (randColor < 0.8) {
          color = 'rgba(255, 220, 100, 0.9)';
        } else {
          const vibrantColors = [
            ParticleColors.PURPLE,
            ParticleColors.CYAN,
            ParticleColors.MAGENTA,
            ParticleColors.GREEN
          ];
          const numColors = 1 + Math.floor(colorfulness * (vibrantColors.length - 1));
          color = vibrantColors[Math.floor(Math.random() * numColors)];
        }

        life = (0.03 + Math.random() * 0.07) * (1 + lateral * 1.8) * comboIntensity;
        size = (0.005 + Math.random() * 0.005) * (0.8 + lateralImportance) * comboIntensity;
      }

      const spark = {
        type: ParticleTypes.SPARK,
        x: pos.x,
        y: pos.y,
        vx: Math.cos(angle) * particleSpeed,
        vy: Math.sin(angle) * particleSpeed,
        life: life,
        maxLife: life,
        size: size,
        maxSize: Math.max(size * 0.12, size * 0.6),
        color: color,
        coronaColor: coronaColor,
        alpha: 0.9,
        maxAlpha: 0.9
      };
      
      state.particles.push(spark);

      if (isSuperSpark) {
        state.particles.push({
          type: ParticleTypes.GHOST,
          x: pos.x,
          y: pos.y,
          vx: spark.vx * 0.8,
          vy: spark.vy * 0.8,
          life: spark.life * 1.2,
          maxLife: spark.life * 1.2,
          size: spark.size * 2.5,
          color: coronaColor.replace('0.9', '0.0'),
          endColor: coronaColor.replace('0.9', '0.3')
        });
      }
    }
  };

  emitFromWheel(wheelPositions.left, leftCount);
  emitFromWheel(wheelPositions.right, rightCount);
}

```javascript
```
<javascript>```javascript
</javascript>```javascript
```javascript
import { Vec2 } from '../../../../utils/Vec2.js';
import { ParticleTypes, ParticleColors } from './ParticleTypes.js';

export function emitVehicleSmoke(state, vehicle, damageLevel) {
  if (!state.particles) state.particles = [];

  const count = 1 + Math.floor(damageLevel * 2);
  const frontOffset = 0.2;
  const offsetX = Math.cos(vehicle.rot) * frontOffset;
  const offsetY = Math.sin(vehicle.rot) * frontOffset;
  const spread = 0.2;

  for (let i = 0; i < count; i++) {
    const x = vehicle.pos.x + offsetX + (Math.random() - 0.5) * spread;
    const y = vehicle.pos.y + offsetY + (Math.random() - 0.5) * spread;

    const lightness = 20 + Math.random() * 50;
    const alpha = 0.7 - (damageLevel * 0.3);

    state.particles.push({
      type: ParticleTypes.SMOKE,
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -0.3 - (damageLevel * 0.4),
      life: 2.0 + (damageLevel * 1.5),
      maxLife: 2.0 + (damageLevel * 1.5),
      alpha: alpha,
      size: 0.05 + (damageLevel * 0.05),
      color: `hsl(0, 0%, ${lightness}%)`
    });
  }
}

export function emitCollisionSparks(state, pos, count = 6, power = 4, collisionNormal = null) {
  if (!state.particles) state.particles = [];

  const sparkSize = 0.01 + Math.random() * 0.015;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = power * (0.4 + Math.random());

    state.particles.push({
      type: ParticleTypes.SPARK,
      x: pos.x,
      y: pos.y,
      vx: Math.cos(angle) * speed * 0.5,
      vy: Math.sin(angle) * speed * 0.5,
      life: 0.15 + Math.random() * 0.2,
      maxLife: 0.15 + Math.random() * 0.2,
      size: sparkSize,
      maxSize: Math.max(sparkSize * 0.08, sparkSize * 0.6),
      color: 'rgba(255,200,50,1)',
      alpha: 1.0
    });
  }
}

export function emitBlood(state, pos, count = 8, power = 3) {
  if (!state.particles) state.particles = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = power * (0.4 + Math.random());

    state.particles.push({
      type: ParticleTypes.BLOOD,
      x: pos.x,
      y: pos.y,
      vx: Math.cos(angle) * speed * 0.5,
      vy: Math.sin(angle) * speed * 0.5,
      life: 0.4 + Math.random() * 0.6,
      maxLife: 0.4 + Math.random() * 0.6,
      size: 0.02 + Math.random() * 0.03,
      color: ParticleColors.RED,
      alpha: 1.0
    });
  }
}

export function emitDriftParticles(state, vehicle) {
  if (!state.particles) state.particles = [];

  const vx = vehicle.vel?.x || 0;
  const vy = vehicle.vel?.y || 0;
  const speed = Math.hypot(vx, vy);

  if (speed < 0.05) return;

  const fwdX = Math.cos(vehicle.rot || 0);
  const fwdY = Math.sin(vehicle.rot || 0);
  const lateral = Math.abs(vx * fwdY - vy * fwdX);
  const longitudinal = Math.abs(vx * fwdX + vy * fwdY);
  const lateralImportance = lateral / (longitudinal + lateral + 1e-6);

  if (lateralImportance < 0.08) return;

  const comboCount = state.comboCount || 0;
  const comboForScaling = Math.min(comboCount, 10);
  const comboIntensity = (comboForScaling + 2) / 9.5;

  const baseCount = (1 + Math.ceil(lateral * 0.6)) * comboIntensity;
  const slipDirection = Math.sign(vx * fwdY - vy * fwdX);

  let leftCount = Math.floor(baseCount * (slipDirection >= 0 ? (1 + lateralImportance * 3.0) : (1 - lateralImportance * 0.5));
  let rightCount = Math.floor(baseCount * (slipDirection <= 0 ? (1 + lateralImportance * 3.0) : (1 - lateralImportance * 0.5));

  leftCount = Math.max(0, leftCount);
  rightCount = Math.max(0, rightCount);

  const rearWheelOffset = -0.3;
  const perpX = -fwdY;
  const perpY = fwdX;

  let trackHalfWidth = 0.23;
  if (vehicle.vehicleType === 'compact' || vehicle.vehicleType === 'sports') {
    trackHalfWidth = 0.23 * 0.6;
  } else {
    trackHalfWidth = 0.23 * 0.6;
  }

  const rearX = vehicle.pos.x + fwdX * rearWheelOffset;
  const rearY = vehicle.pos.y + fwdY * rearWheelOffset;

  const wheelPositions = {
    left: { x: rearX - perpX * trackHalfWidth, y: rearY - perpY * trackHalfWidth },
    right: { x: rearX + perpX * trackHalfWidth, y: rearY + perpY * trackHalfWidth }
  };

  const emitFromWheel = (pos, count) => {
    for (let i = 0; i < count; i++) {
      const superSparkChance = 0.02 + 0.1 * (comboForScaling / 10);
      const isSuperSpark = Math.random() < superSparkChance;
      
      const oppositeAngle = Math.atan2(-vy, -vx);
      const spread = Math.PI * (0.6 + Math.min(0.9, lateralImportance * 1.5));
      const angle = oppositeAngle + (Math.random() - 0.5) * spread;
      
      const particleSpeed = (0.6 + Math.random() * 0.9) * (1 + lateral * 1.6);
      
      let color, size, life, coronaColor = null;

      if (isSuperSpark) {
        color = 'rgba(255, 255, 220, 1.0)';
        const vibrantColors = [
          ParticleColors.PURPLE,
          ParticleColors.CYAN,
          ParticleColors.MAGENTA,
          ParticleColors.GREEN
        ];
        const numColors = 1 + Math.floor((comboForScaling / 10) * (vibrantColors.length - 1));
        coronaColor = vibrantColors[Math.floor(Math.random() * numColors)];

        life = (0.08 + Math.random() * 0.08) * (1 + lateral * 1.5) * comboIntensity;
        size = (0.008 + Math.random() * 0.004) * (0.8 + lateralImportance) * comboIntensity;
      } else {
        const colorfulness = comboForScaling / 10;
        const randColor = Math.random();
        
        if (randColor < 0.6 * (1 - colorfulness * 0.85)) {
          color = 'rgba(255, 255, 255, 0.9)';
        } else if (randColor < 0.8) {
          color = 'rgba(255, 220, 100, 0.9)';
        } else {
          const vibrantColors = [
            ParticleColors.PURPLE,
            ParticleColors.CYAN,
            ParticleColors.MAGENTA,
            ParticleColors.GREEN
