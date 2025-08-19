import { createInitialState } from '../state/createInitialState.js';
import { EmergencyServices } from '../systems/EmergencyServices.js';
import { BloodManager } from '../entities/drawBlood.js';

export class GameStateManager {
  constructor() {
    this.state = null;
    this.emergencyServices = null;
    this.bloodManager = null;
  }

  initialize() {
    // Generate a new random seed for each initialization
    const randomSeed = Math.random().toString(36).substring(2, 15);
    this.state = createInitialState(randomSeed);
    this.state.control = { inVehicle: false, vehicle: null, equipped: null };
    this.state.canvas = null;
    
    this.emergencyServices = new EmergencyServices(this.state);
    this.bloodManager = new BloodManager(20);
    
    this.state.emergencyServices = this.emergencyServices;
    this.state.bloodManager = this.bloodManager;
    
    return this.state;
  }

  getState() {
    return this.state;
  }
}