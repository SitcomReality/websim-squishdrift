import { Vec2 } from '../../utils/Vec2.js';
import { Tile } from '../map/TileTypes.js';

export function drawStreetLight(r, state, lightEntity) {
  const { ctx } = r, ts = state.world.tileSize;
  const { pos } = lightEntity;

  ctx.save();
  ctx.translate(pos.x * ts, pos.y * ts);

  // Draw the base of the streetlight pole
  const baseRadius = ts * 0.12;
  ctx.fillStyle = '#333'; // Dark grey for the base
  ctx.beginPath();
  ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // Add a little highlight to the base to give it some dimension
  ctx.fillStyle = '#555';
  ctx.beginPath();
  ctx.arc(-baseRadius * 0.3, -baseRadius * 0.3, baseRadius * 0.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}