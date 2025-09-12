import { Vec2 } from '../../../utils/Vec2.js';
import { drawTiles } from '../../../render/drawTiles.js';
import { drawBuildings } from '../../entities/drawBuildings.js';
import { drawRoadDebug } from '../../../render/drawRoadDebug.js';
import { drawPlayer } from '../../entities/drawPlayer.js';
import { drawVehicle } from '../../entities/drawVehicle.js';
import { drawNPC } from '../../entities/drawNPC.js';
import { drawItem } from '../../entities/drawItem.js';
import { drawEmergency } from '../../entities/drawEmergency.js';
import { drawHealthBar } from '../../entities/drawHealthBar.js';
import { drawDamageIndicator } from '../../entities/drawDamageIndicator.js';
import { drawDamageText } from '../../entities/drawDamageText.js';
import { drawExplosion } from '../../entities/drawExplosion.js';
import { drawSkidmarks } from '../../../render/drawSkidmarks.js';
import { drawBlood } from '../../entities/drawBlood.js';
import { drawParticle } from '../../entities/drawParticle.js';
import { drawDebugHitboxes } from '../../../render/drawDebugHitboxes.js';
import { drawMouseReticule } from '../../entities/drawMouseReticule.js';

export class LightingSystem {
  constructor() {
    this.darknessAlpha = 0.95; // 0 = full bright, 1 = full dark
    this._smoke = null;
  }

  render(renderer, state) {
    const { ctx, canvas } = renderer;
    const { camera } = state;

    if (!camera) return;

    const z = camera.zoom || 1;

    // Calculate the visible area in world-space pixels.
    // The canvas transform is already set to world space, so we draw using world coordinates.
    const viewWidth = canvas.width / z;
    const viewHeight = canvas.height / z;

    // The camera's (x, y) is in tile units, and it's at the center of the screen.
    // We need to convert it to world-space pixels.
    const ts = state.world.tileSize;
    const cameraWorldX = camera.x * ts;
    const cameraWorldY = camera.y * ts;

    const viewX = cameraWorldX - viewWidth / 2;
    const viewY = cameraWorldY - viewHeight / 2;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(viewX, viewY);
    ctx.scale(z, z);
    // pixel-snap the world transform to avoid tile seams
    const snapX = Math.round((camera.x * ts * z) / z);
    const snapY = Math.round((camera.y * ts * z) / z);
    ctx.translate(-snapX, -snapY);

    // Step 1.1: Draw the darkness overlay.
    // This covers the entire visible area with a semi-transparent black rectangle.
    // Later, light sources will "cut holes" into this overlay.
    ctx.fillStyle = `rgba(21, 21, 31, ${this.darknessAlpha})`; // A dark blueish color for night
    ctx.fillRect(viewX, viewY, viewWidth, viewHeight);

    // Draw all layers
    drawTiles(renderer, state, 'ground');
    // When flattened, draw roofs on the ground before entities.
    if (state.isFlattened) {
      drawBuildings(renderer, state, 'roofs_flat');
    } else {
      // In non-flattened mode, draw walls/roofs for any building that still has height,
      // then draw roofs. drawBuildings internally skips walls/roofs based on currentHeight.
      drawBuildings(renderer, state, 'walls');
      drawBuildings(renderer, state, 'roofs');
    }

    // Draw entities: player, vehicles, NPCs, items, etc.
    const entities = state.entities.filter(e => e.type === 'player' || e.type === 'vehicle' || e.type === 'npc' || e.type === 'item' || e.type === 'emergency');
    for (const entity of entities) {
      if (entity.type === 'player') {
        drawPlayer(renderer, state, entity);
        drawHealthBar(renderer, entity);
      } else if (entity.type === 'vehicle') {
        drawVehicle(renderer, state, entity);
      } else if (entity.type === 'npc') {
        drawNPC(renderer, state, entity);
      } else if (entity.type === 'item') {
        drawItem(renderer, state, entity);
      } else if (entity.type === 'emergency') {
        drawEmergency(renderer, state, entity);
      }
    }

    // Draw blood stains and particles
    const bloodStains = state.entities.filter(e => e.type === 'blood');
    for (const blood of bloodStains) {
      drawBlood(renderer, state, blood);
    }

    // Draw explosions
    const explosions = state.explosions || [];
    for (const explosion of explosions) {
      drawExplosion(renderer, state, explosion);
    }

    // Draw damage text and floating text
    drawDamageText(renderer, state);

    // Draw skidmarks
    drawSkidmarks(renderer, state);

    // Draw particles
    const particles = state.particles || [];
    for (const p of particles) {
      if (p.type === 'smoke') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x * ts, p.y * ts, p.size * ts, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x * ts, p.y * ts, p.size * ts, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw debug hitboxes and mouse reticule
    drawDebugHitboxes(state, renderer);
    drawMouseReticule(state, renderer);

    ctx.restore();
  }

  setSmokeEmitter(smokeEmitter) {
    this._smoke = smokeEmitter;
  }

  updateVehicleSmoke(state, dt) {
    const vehicles = state.entities.filter(e => e.type === 'vehicle' && e.health && e.health.hp < e.health.maxHp);
    for (const vehicle of vehicles) {
      const healthPercent = vehicle.health.hp / vehicle.health.maxHp;
      if (healthPercent >= 1.0) continue;
      const damageLevel = 1 - healthPercent;
      this._smoke.emitSmoke(state, vehicle, damageLevel);
    }
  }
}