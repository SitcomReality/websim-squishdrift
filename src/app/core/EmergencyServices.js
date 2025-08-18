import { Vec2 } from '../../utils/Vec2.js';
import { Health } from '../components/Health.js';
import { findPath } from '../../utils/pathfinding.js';

export class EmergencyServices {
  constructor(state) {
    this.wantedLevel = 0;
    this.wantedDecay = 0
    this.activeIncidents = []
    this.emergencyVehicles = []
    this.lastIncidentCheck = 0
    
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
    })

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

      const spawnPoints = [
        new Vec2(1, Math.floor(Math.random() * this.map.height)),
        new Vec2(this.map.width - 2, Math.floor(Math.random() * this.map.height)),
        new Vec2(Math.floor(Math.random() * this.map.width), 1),
        new Vec2(Math.floor(Math.random() * this.map.width), this.map.height - 2)
      ]
      
      const spawnPos = spawnPoints[Math.floor(Math.random() * spawnPoints.length)]

      const startNode = this.findNearestRoadNode(spawnPos)
      const endNode = this.findNearestRoadNode(incident.position)
      
      if (!startNode || !endNode) {
        incident.responded = true
        continue
      }
      
      const path = findPath(this.roadGraph, startNode, endNode)

      if (!path) {
        incident.responded = true
        continue
      }
      
      const vehicle = {
        type: 'emergency',
        vehicleType,
        pos: new Vec2(startNode.x + 0.5, startNode.y + 0.5),
        targetIncident: incident,
        color,
        health: new Health(100),
        speed: 8,
        siren: true,
        path: path,
        pathIndex: 0
      }
      
      state.entities.push(vehicle)
      this.emergencyVehicles.push(vehicle)
      incident.responded = true
    }
  }

  updateEmergencyVehicles(state, dt) {
    if (!state || !state.entities) return
    
    for (let i = this.emergencyVehicles.length - 1; i >= 0; i--) {
      const vehicle = this.emergencyVehicles[i]
      
      if (!vehicle.path || vehicle.pathIndex >= vehicle.path.length) {
        const distToTarget = Math.hypot(
          vehicle.pos.x - vehicle.targetIncident.position.x,
          vehicle.pos.y - vehicle.targetIncident.position.y
        )
        
        if (distToTarget < 1.5) {
          if (vehicle.vehicleType === 'police') {
            this.wantedLevel = Math.max(0, this.wantedLevel - 1)
          }
          
          this.activeIncidents = this.activeIncidents.filter(
            inc => inc !== vehicle.targetIncident
          )
          const index = state.entities.indexOf(vehicle)
          if (index > -1) state.entities.splice(index, 1)
          this.emergencyVehicles.splice(i, 1)
        } else {
          const startNode = this.findNearestRoadNode(vehicle.pos)
          const endNode = this.findNearestRoadNode(vehicle.targetIncident.position)
          if (startNode && endNode) {
            vehicle.path = findPath(this.roadGraph, startNode, endNode)
            vehicle.pathIndex = 0
          } else {
            const index = state.entities.indexOf(vehicle)
            if (index > -1) state.entities.splice(index, 1)
            this.emergencyVehicles.splice(i, 1)
          }
        }
        continue
      }

      const targetNode = vehicle.path[vehicle.pathIndex]
      const targetPos = { x: targetNode.x + 0.5, y: targetNode.y + 0.5 }
      
      const dx = targetPos.x - vehicle.pos.x
      const dy = targetPos.y - vehicle.pos.y
      const dist = Math.hypot(dx, dy)
      
      if (dist < 0.1) {
        vehicle.pathIndex++
      } else {
        const moveX = (dx / dist) * vehicle.speed * dt
        const moveY = (dy / dist) * vehicle.speed * dt
        vehicle.pos.x += moveX
        vehicle.pos.y += moveY
        vehicle.rot = Math.atan2(dy, dx)
      }
    }
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