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
```

```
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
```

```
  // Draw the streetlight itself (a conical gradient)
  const lightRadius = ts * 1.5;
  ctx.fillStyle = `rgba(255, 255, 255, ${lightEntity.intensity})`;
  ctx.beginPath();
  ctx.arc(0, 0, lightRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // Add some lines to the streetlight to give it a more 3D effect
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(0, lightRadius);
  ctx.lineTo(0, lightRadius + ts * 0.5);
  ctx.stroke();
  
  // Add a small shadow at the bottom of the streetlight
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, lightRadius + ts * 0.5, ts * 2, ts);
  
  // Add some glow to the streetlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.beginPath();
  ctx.arc(0, lightRadius, ts * 0.5, 0, Math.PI * 2);
  ctx.fill();
  
  // Add some lines to the streetlight to give it a more 3D effect
  ctx.strokeStyle = '#555';
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(0, lightRadius);
  ctx.lineTo(0, lightRadius + ts * 0.5);
  ctx.stroke();
  
  // Add a small highlight to the top of the streetlight
  ctx.fillStyle = '#555';
  ctx.beginPath();
  ctx.arc(0, lightRadius + ts * 0.5, ts * 0.3, 0, Math.PI * 2);
  ctx.fill();
  
  // Add a small shadow at the bottom of the streetlight
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, lightRadius + ts * 0.5, ts * 2, ts);
  
  // Add some glow to the streetlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.beginPath();
  ctx.arc(0, lightRadius, ts * 0