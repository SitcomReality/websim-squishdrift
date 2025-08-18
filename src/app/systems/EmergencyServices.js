import { Vec2 } from '../../utils/Vec2.js';
import { Health } from '../components/Health.js';
import { findPath } from '../../utils/pathfinding.js';
import { createVehicle } from '../vehicles/VehicleTypes.js';

export class EmergencyServices {
  constructor(state) {
    this.wantedLevel = 0;
    this.wantedDecay = 0;
    this.activeIncidents = [];
    this.emergencyVehicles = [];
    this.lastIncidentCheck = 0;
    
    // Defensive initialization with fallbacks
    this.roadGraph = state?.world?.map?.roads || { nodes: [] }
    this.map = state?.world?.map || { width: 100, height: 100, tiles: [] }
  }

  addIncident(type, position, severity = 1) {
    this.activeIncidents.push({
      type,
      position: new Vec2(position.x, position.y),
      severity,
      time: Date.now(),
      responded: false
    });

    if (type === 'gunshot' || type === 'assault') {
      this.wantedLevel = Math.min(5, this.wantedLevel + severity)
      this.wantedDecay = 0
    }
  }

  update(state, dt) {
    if (!state) return
    
    this.wantedDecay += dt
    if (this.wantedDecay > 10 && this.wantedLevel > 0) {
      this.wantedLevel = Math.max(0, this.wantedLevel - 1)
      this.wantedDecay = 0
    }

    this.checkRandomEvents(state, dt)
    this.updateEmergencyResponse(state)
    this.updateEmergencyVehicles(state, dt)
  }

  checkRandomEvents(state, dt) {
    if (!state || !state.rand) return
    
    this.lastIncidentCheck += dt
    if (this.lastIncidentCheck < 5) return
    this.lastIncidentCheck = 0

    const rand = state.rand()
    if (rand < 0.1) {
      const parkTiles = []
      const map = state.world?.map || this.map
      for (let y = 0; y < map.height; y++) {
        for (let x = 0; x < map.width; x++) {
          if (map.tiles?.[y]?.[x] === 10) {
            parkTiles.push(new Vec2(x + 0.5, y + 0.5))
          }
        }
      }
      if (parkTiles.length > 0) {
        const pos = parkTiles[Math.floor(rand * parkTiles.length)]
        this.addIncident('fire', pos, 2)
      }
    }

    if (rand < 0.15) {
      const vehicles = state.entities?.filter(e => e.type === 'vehicle' && !e.controlled) || []
      if (vehicles.length > 0) {
        const vehicle = vehicles[Math.floor(rand * vehicles.length)]
        this.addIncident('theft', vehicle.pos, 1)
      }
    }
  }

  updateEmergencyResponse(state) {
    if (!state || !state.entities) return
    
    const unresponded = this.activeIncidents.filter(i => !i.responded)
    
    for (const incident of unresponded) {
      let vehicleType, color
      
      switch(incident.type) {
        case 'fire':
          vehicleType = 'firetruck'
          color = '#FF4500'
          break
        case 'theft':
        case 'assault':
        case 'gunshot':
          vehicleType = 'police'
          color = '#0000FF'
          break
        default:
          vehicleType = 'ambulance'
          color = '#FF0000'
      }

      // Find valid spawn points on roads
      const spawnPoints = this.findValidSpawnPoints(state)
      
      if (spawnPoints.length === 0) {
        console.warn('No valid spawn points found for emergency vehicle')
        incident.responded = true
        continue
      }

      const spawnPos = spawnPoints[Math.floor(Math.random() * spawnPoints.length)]

      const startNode = this.findNearestRoadNode(spawnPos)
      const endNode = this.findNearestRoadNode(incident.position)
      
      if (!startNode || !endNode) {
        console.warn('Could not find road nodes for emergency response', { 
          startPos: spawnPos, 
          endPos: incident.position,
          startNode: startNode ? 'found' : 'not found',
          endNode: endNode ? 'found' : 'not found'
        })
        incident.responded = true
        continue
      }
      
      const path = findPath(this.roadGraph, startNode, endNode)

      if (!path || path.length === 0) {
        console.warn('Could not find path for emergency vehicle', {
          start: `${startNode.x},${startNode.y},${startNode.dir}`,
          end: `${endNode.x},${endNode.y},${endNode.dir}`,
          pathLength: path?.length || 0
        })
        incident.responded = true
        continue
      }
      
      const rot = ({N:-Math.PI/2,E:0,S:Math.PI/2,W:Math.PI})[startNode.dir] ?? 0;
      const vehicle = createVehicle('emergency', new Vec2(startNode.x + 0.5, startNode.y + 0.5), {
        vehicleType,
        color,
        rot,
        controlled: false,
        siren: true,
        isEmergency: true,
        aiTargetSpeed: 5.0,
        node: startNode,
        plannedRoute: path,
        currentPathIndex: 0,
        targetIncident: incident
      })
      state.entities.push(vehicle)
      this.emergencyVehicles.push(vehicle)
      incident.responded = true
    }
  }

  updateEmergencyVehicles(state, dt) {
    if (!state || !state.entities) return
    
    for (let i = this.emergencyVehicles.length - 1; i >= 0; i--) {
      const vehicle = this.emergencyVehicles[i]
      
      if (!vehicle || !state.entities.includes(vehicle)) { this.emergencyVehicles.splice(i,1); continue; }
      
      const distToTarget = Math.hypot(vehicle.pos.x - vehicle.targetIncident.position.x, vehicle.pos.y - vehicle.targetIncident.position.y)
      if (distToTarget < 1.5) { // Arrived
        if (vehicle.vehicleType === 'police') {
          this.wantedLevel = Math.max(0, this.wantedLevel - 1)
        }
        
        this.activeIncidents = this.activeIncidents.filter(
          inc => inc !== vehicle.targetIncident
        )
        const index = state.entities.indexOf(vehicle)
        if (index > -1) state.entities.splice(index, 1)
        this.emergencyVehicles.splice(i, 1)
        continue
      }
      
      // If plannedRoute is missing (e.g., graph changed), recompute and hand to AI driver
      if (!vehicle.plannedRoute || !vehicle.plannedRoute.length) {
        const startNode = this.findNearestRoadNode(vehicle.pos)
        const endNode = this.findNearestRoadNode(vehicle.targetIncident.position)
        if (startNode && endNode) {
          const newPath = findPath(this.roadGraph, startNode, endNode)
          if (newPath) { vehicle.plannedRoute = newPath; vehicle.currentPathIndex = 0; vehicle.node = startNode; }
        }
      }
    }
  }

  findValidSpawnPoints(state) {
    const spawnPoints = []
    const map = state.world?.map || this.map
    
    // Find all road nodes that are valid for spawning
    for (const node of this.roadGraph.nodes) {
      // Check if this is a valid road tile
      const tileType = map.tiles[node.y]?.[node.x]
      if (tileType >= 1 && tileType <= 4) { // Road tiles
        spawnPoints.push(new Vec2(node.x + 0.5, node.y + 0.5))
      }
    }
    
    // If no road nodes found, use edge positions
    if (spawnPoints.length === 0) {
      const edgePositions = [
        new Vec2(2, 2),
        new Vec2(map.width - 3, 2),
        new Vec2(2, map.height - 3),
        new Vec2(map.width - 3, map.height - 3)
      ]
      return edgePositions
    }
    
    return spawnPoints
  }
  
  findNearestRoadNode(pos) {
    let bestNode = null
    let bestDistSq = Infinity
    for (const node of this.roadGraph.nodes) {
      const dx = node.x - pos.x
      const dy = node.y - pos.y
      const distSq = dx * dx + dy * dy
      if (distSq < bestDistSq) {
        bestDistSq = distSq
        bestNode = node
      }
    }
    return bestNode
  }
}