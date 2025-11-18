src/app/core/systems/ai/ObstacleDetector.js
```javascript
export class ObstacleDetector {
  constructor() {}

  // returns detected obstacle info or null
  detectAhead(state, v, obstacles, roads) {
    if (!v.plannedRoute || v.currentPathIndex === undefined) return null;
    const checkDistance = 3;
    const obstaclesList = obstacles.filter(o => o !== v);
    for (let i = 0; i < checkDistance; i++) {
      const pathIndex = (v.currentPathIndex || 0) + i;
      if (pathIndex >= v.plannedRoute.length) break;
      const node = v.plannedRoute[pathIndex];
      const nodePos = { x: node.x + 0.5, y: node.y + 0.5 };
      for (const obs of obstaclesList) {
        if (!obs.pos) continue;
        const distToNode = Math.hypot(obs.pos.x - nodePos.x, obs.pos.y - nodePos.y);
        if (distToNode < 0.7) {
          return { obstacle: obs, distance: i };
        }
      }
    }
    return null;
  }
}


```