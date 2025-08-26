export class PoliceChaseManager {
  constructor() {
    this.chasers = [];
    this.spawnCooldown = 0;
    this.repathInterval = 1.0;
    this._lastRepath = 0;
  }

  update(state, dt, emergencyServices) {
    const level = this.getWantedLevel(state);
    this.cleanup(state);
    this.spawnCooldown = Math.max(0, this.spawnCooldown - dt);

    const desired = Math.min(3, Math.max(0, level));
    while (this.chasers.length < desired && this.spawnCooldown <= 0) {
      if (this.trySpawnChaser(state, emergencyServices)) {
        this.spawnCooldown = this.getRespawnDelay(level);
      } else break;
    }

    this._lastRepath += dt;
    if (this._lastRepath >= this.repathInterval) {
      this._lastRepath = 0;
      this.repathAll(state, emergencyServices);
    }
  }

  getWantedLevel(state) {
    return state.scoringSystem?.getWantedLevel?.() ?? (state.wantedLevel || 0);
  }

  getRespawnDelay(level) {
    return level === 3 ? 5 : level === 2 ? 15 : 30;
  }

  cleanup(state) {
    this.chasers = this.chasers.filter(v => v && state.entities.includes(v));
  }

  trySpawnChaser(state, es) {
    const player = state.entities.find(e => e.type === 'player');
    if (!player) return false;
    const spawnPoints = es.findValidSpawnPoints(state) || [];
    if (!spawnPoints.length) return false;

    // Prefer spawns 8-14 tiles from player and not on top of other chasers
    const candidates = spawnPoints.filter(p => {
      const d = Math.hypot(p.x - player.pos.x, p.y - player.pos.y);
      if (d < 8 || d > 14) return false;
      return !this.chasers.some(c => Math.hypot(c.pos.x - p.x, c.pos.y - p.y) < 2.0);
    });
    const pos = (candidates.length ? candidates : spawnPoints)[Math.floor(Math.random() * (candidates.length ? candidates.length : spawnPoints.length))];

    const startNode = es.findNearestRoadNode(pos);
    const endNode = es.findNearestRoadNode(player.pos);
    if (!startNode || !endNode) return false;

    const path = es.roadGraph ? es.roadGraph && state.world.map.roads && es.roadGraph.byKey ? (state.world.map.roads && state.world.map.roads.byKey ? state.world.map.roads : es.roadGraph) : es.roadGraph : state.world.map.roads;
    const route = (awaitPath(es, path, startNode, endNode)) || [];
    const rot = ({N:-Math.PI/2,E:0,S:Math.PI/2,W:Math.PI})[startNode.dir] ?? 0;

    // Build emergency police car set to reckless
    const v = es.createChaserVehicle(pos, rot, startNode, route, endNode);
    if (!v) return false;

    state.entities.push(v);
    this.chasers.push(v);
    return true;
  }

  repathAll(state, es) {
    const player = state.entities.find(e => e.type === 'player');
    if (!player) return;
    for (const v of this.chasers) {
      const startNode = es.findNearestRoadNode(v.pos);
      const endNode = es.findNearestRoadNode(player.pos);
      if (!startNode || !endNode) continue;

      const pathGraph = state.world.map.roads;
      const newPath = awaitPath(es, pathGraph, startNode, endNode);
      if (newPath && newPath.length) {
        v.node = startNode;
        v.plannedRoute = newPath;
        v.currentPathIndex = 0;
        v.drivingStyle = 'reckless';
        v.aiTargetSpeed = 5.0;
        v.siren = true;
      }
    }
  }
}

function awaitPath(es, graph, start, end) {
  try {
    // es.findPath is not exposed; ES uses imported findPath
    const { findPath } = es._pathfinding || {};
    if (findPath) return findPath(graph, start, end);
  } catch {}
  // Fallback: graph builder pathfinder already available globally in module
  try {
    const { findPath } = es.__findPathModule || {};
    if (findPath) return findPath(graph, start, end);
  } catch {}
  // As EmergencyServices imported findPath at module scope, reuse via es
  return (es && es.constructor && es.constructor.prototype && es.constructor.prototype.findPath)
    ? es.constructor.prototype.findPath(graph, start, end)
    : (window.findPath ? window.findPath(graph, start, end) : null);
}