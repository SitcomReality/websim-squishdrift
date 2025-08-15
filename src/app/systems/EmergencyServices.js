import { Vec2 } from '../../utils/Vec2.js';
import { Health } from '../components/Health.js';

export class EmergencyServices {
  constructor() {
    this.wantedLevel = 0;
    this.wantedDecay = 0;
    this.activeIncidents = [];
    this.emergencyVehicles = [];
    this.lastIncidentCheck = 0;
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
      this.wantedLevel = Math.min(5, this.wantedLevel + severity);
      this.wantedDecay = 0;
    }
  }

  update(state, dt) {
    this.wantedDecay += dt;
    if (this.wantedDecay > 10 && this.wantedLevel > 0) {
      this.wantedLevel = Math.max(0, this.wantedLevel - 1);
      this.wantedDecay = 0;
    }

    this.checkRandomEvents(state, dt);

    this.updateEmergencyResponse(state);

    this.updateEmergencyVehicles(state, dt);
  }

  checkRandomEvents(state, dt) {
    this.lastIncidentCheck += dt;
    if (this.lastIncidentCheck < 5) return;
    this.lastIncidentCheck = 0;

    const rand = state.rand();
    if (rand < 0.1) {
      const parkTiles = [];
      for (let y = 0; y < state.world.map.height; y++) {
        for (let x = 0; x < state.world.map.width; x++) {
          if (state.world.map.tiles[y][x] === 10) { 
            parkTiles.push(new Vec2(x + 0.5, y + 0.5));
          }
        }
      }
      if (parkTiles.length > 0) {
        const pos = parkTiles[Math.floor(rand * parkTiles.length)];
        this.addIncident('fire', pos, 2);
      }
    }

    if (rand < 0.15) {
      const vehicles = state.entities.filter(e => e.type === 'vehicle' && !e.controlled);
      if (vehicles.length > 0) {
        const vehicle = vehicles[Math.floor(rand * vehicles.length)];
        this.addIncident('theft', vehicle.pos, 1);
      }
    }
  }

  updateEmergencyResponse(state) {
    const unresponded = this.activeIncidents.filter(i => !i.responded);
    
    for (const incident of unresponded) {
      let vehicleType, color;
      
      switch(incident.type) {
        case 'fire':
          vehicleType = 'firetruck';
          color = '#FF4500';
          break;
        case 'theft':
        case 'assault':
        case 'gunshot':
          vehicleType = 'police';
          color = '#0000FF';
          break;
        default:
          vehicleType = 'ambulance';
          color = '#FF0000';
      }

      const spawnPoints = [
        new Vec2(0, state.rand() * state.world.map.height),
        new Vec2(state.world.map.width - 1, state.rand() * state.world.map.height),
        new Vec2(state.rand() * state.world.map.width, 0),
        new Vec2(state.rand() * state.world.map.width, state.world.map.height - 1)
      ];
      
      const spawn = spawnPoints[Math.floor(state.rand() * spawnPoints.length)];
      const vehicle = {
        type: 'emergency',
        vehicleType,
        pos: new Vec2(spawn.x, spawn.y),
        targetIncident: incident,
        color,
        health: new Health(100),
        speed: 8,
        siren: true
      };
      
      state.entities.push(vehicle);
      this.emergencyVehicles.push(vehicle);
      incident.responded = true;
    }
  }

  updateEmergencyVehicles(state, dt) {
    for (let i = this.emergencyVehicles.length - 1; i >= 0; i--) {
      const vehicle = this.emergencyVehicles[i];
      
      if (vehicle.targetIncident) {
        const target = vehicle.targetIncident.position;
        const dx = target.x - vehicle.pos.x;
        const dy = target.y - vehicle.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 1) {
          if (vehicle.vehicleType === 'police') {
            this.wantedLevel = Math.max(0, this.wantedLevel - 1);
          }
          
          this.activeIncidents = this.activeIncidents.filter(
            i => i !== vehicle.targetIncident
          );
          const index = state.entities.indexOf(vehicle);
          if (index > -1) state.entities.splice(index, 1);
          this.emergencyVehicles.splice(i, 1);
        } else {
          const moveX = (dx / dist) * vehicle.speed * dt;
          const moveY = (dy / dist) * vehicle.speed * dt;
          vehicle.pos.x += moveX;
          vehicle.pos.y += moveY;
        }
      }
    }
  }
}