  initialize() {
    this.state = createInitialState();
    this.state.control = { inVehicle: false, vehicle: null, equipped: null };
    this.state.canvas = null;
    
    // Reset weapon system state
    this.state.equippedWeapon = null;
    this.state.weaponUI = null;
    
    this.emergencyServices = new EmergencyServices(this.state);
    this.bloodManager = new BloodManager(20);
    
    this.state.emergencyServices = this.emergencyServices;
    this.state.bloodManager = this.bloodManager;
    
    return this.state;
  }

