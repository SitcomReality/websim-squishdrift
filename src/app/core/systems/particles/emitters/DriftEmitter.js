import { Vec2 } from '../../../utils/Vec2.js';

export class DriftEmitter {
  emitDriftParticles(state, vehicle) {
    state.particles = state.particles || [];

    const isPlayerVehicle = state.control?.inVehicle && state.control.vehicle === vehicle;
    const comboCount = isPlayerVehicle ? (state.comboCount || 0) : 0;
    const comboForScaling = Math.min(comboCount, 10);
    const comboIntensity = (comboForScaling + 2) / 9.5;

    const vx = vehicle.vel?.x || 0, vy = vehicle.vel?.y || 0;
    const fwdX = Math.cos(vehicle.rot || 0), fwdY = Math.sin(vehicle.rot || 0);
    const speed = Math.hypot(vx, vy);
    if (speed < 0.05) return;

    const lateral = Math.abs((vx * fwdY - vy * fwdX));
    const longitudinal = Math.abs((vx * fwdX + vy * fwdY));
    const lateralImportance = lateral / (longitudinal + lateral + 1e-6);
    if (lateralImportance < 0.08) return;

    const slipDirection = Math.sign((vx * fwdY - vy * fwdX));

    const perpX = -fwdY, perpY = fwdX;
    const rearWheelOffset = -0.3;
    let trackHalfWidth = 0.23;
    if (vehicle.vehicleType === 'truck') trackHalfWidth = 0.23;
    else trackHalfWidth = 0.23 * 0.6;

    const rearX = vehicle.pos.x + fwdX * rearWheelOffset;
    const rearY = vehicle.pos.y + fwdY * rearWheelOffset;

    const wheelPositions = {
      left: { x: rearX - perpX * trackHalfWidth, y: rearY - perpY * trackHalfWidth },
      right:{ x: rearX + perpX * trackHalfWidth, y: rearY + perpY * trackHalfWidth }
    };

    const baseCount = (1 + Math.ceil(lateral * 0.6)) * comboIntensity;
    let leftCount = Math.floor(baseCount * (slipDirection >= 0 ? (1 + lateralImportance * 3.0) : (1 - lateralImportance * 0.5)));
    let rightCount = Math.floor(baseCount * (slipDirection <= 0 ? (1 + lateralImportance * 3.0) : (1 - lateralImportance * 0.5)));
    leftCount = Math.max(0, leftCount); rightCount = Math.max(0, rightCount);

    const oppositeAngle = Math.atan2(-vy, -vx);
    const spread = Math.PI * (0.6 + Math.min(0.9, lateralImportance * 1.5));

    const vibrantColors = [
      'rgba(180, 120, 255, 0.9)',
      'rgba(0, 255, 255, 0.9)',
      'rgba(255, 0, 255, 0.9)',
      'rgba(50, 255, 50, 0.9)'
    ];

    const emitFromWheel = (pos, count) => {
      for (let i = 0; i < count; i++) {
        const angle = oppositeAngle + (Math.random() - 0.5) * spread;
        const particleSpeed = (0.6 + Math.random() * 0.9) * (1 + lateral * 1.6);

        const superSparkChance = 0.02 + 0.1 * (comboForScaling / 10);
        const isSuperSpark = Math.random() < superSparkChance;

        let color, size, life, coronaColor = null;
        if (isSuperSpark) {
          color = 'rgba(255, 255, 220, 1.0)';
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
            const numColors = 1 + Math.floor(colorfulness * (vibrantColors.length - 1));
            color = vibrantColors[Math.floor(Math.random() * numColors)];
          }
          life = (0.03 + Math.random() * 0.07) * (1 + lateral * 1.8) * comboIntensity;
          size = (0.005 + Math.random() * 0.005) * (0.8 + lateralImportance) * comboIntensity;
        }

        const spark = {
          type: 'spark',
          x: pos.x, y: pos.y,
          vx: Math.cos(angle) * particleSpeed,
          vy: Math.sin(angle) * particleSpeed,
          life, maxLife: life,
          size, maxSize: Math.max(size * 0.12, size * 0.6),
          color, coronaColor,
          alpha: 0.9, maxAlpha: 0.9,
        };
        state.particles.push(spark);

        if (isSuperSpark) {
          state.particles.push({
            type: 'ghost',
            x: pos.x, y: pos.y,
            vx: spark.vx * 0.8, vy: spark.vy * 0.8,
            life: spark.life * 1.2, maxLife: spark.life * 1.2,
            size: spark.size * 2.5,
            color: coronaColor.replace('0.9', '0.0'),
            endColor: coronaColor.replace('0.9', '0.3'),
          });
        }
      }
    };

    emitFromWheel(wheelPositions.left, leftCount);
    emitFromWheel(wheelPositions.right, rightCount);
  }
}