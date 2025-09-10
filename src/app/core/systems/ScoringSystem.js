export class ScoringSystem {
  constructor() {
    this.score = 0;
    this.wantedPoints = 0;
    this.wantedLevel = 0;
    
    // Combo system properties
    this.comboCount = 0;
    this.comboTimer = 0;
    this.comboMaxTime = 5; // seconds
    this.timeSinceLastScore = 0;
    this.comboPaused = false;
    
    // Track highest combo achieved
    this.highestCombo = 0;
  }

  update(state, dt) {
    const playerVehicle = state.control?.inVehicle ? state.control.vehicle : null;
    
    // --- NEW LOGIC: Tie combo timer to Big Drift Grace Period ---
    if (playerVehicle && playerVehicle.isBigDrifting) {
      // When actively drifting, the combo timer is effectively "paused" at max
      if (playerVehicle.driftState?.active) {
        this.comboPaused = true;
        this.comboTimer = this.comboMaxTime; 
      } 
      // When in grace period, the combo timer becomes the grace period timer
      else if (playerVehicle.driftState?.gracePeriodTimer > 0) {
        this.comboPaused = false; // allow countdown
        // Sync combo timer with drift grace period
        this.comboMaxTime = playerVehicle._skidmarkSystem.bigDriftGracePeriod; // from SkidmarkSystem
        this.comboTimer = playerVehicle.driftState.gracePeriodTimer;
      }
    } else {
      // --- Standard combo countdown logic for on-foot or non-drifting ---
      this.comboPaused = false;
      this.comboMaxTime = 5; // Reset to default max time

      if (this.comboCount > 0) {
        const countdownAcceleration = 1 + (this.timeSinceLastScore / 10);
        this.comboTimer -= dt * countdownAcceleration;

        if (this.comboTimer <= 0) {
          this.comboCount = 0;
          this.comboTimer = 0;
        }
      }
    }
    
    this.timeSinceLastScore += dt;
    
    // Expose combo info to state for HUD
    if (state) {
      state.comboCount = this.comboCount;
      state.comboTimer = this.comboTimer;
      state.comboMaxTime = this.comboMaxTime;
      state.comboPaused = this.comboPaused;
      state.highestCombo = this.highestCombo;
    }
  }

  addCrime(state, crimeType, target) {
    let basePoints = 0;

    switch (crimeType) {
      case 'kill_pedestrian':
        basePoints = 1;
        break;
      case 'shoot_vehicle':
        basePoints = 1;
        break;
      case 'destroy_vehicle':
        basePoints = 3;
        break;
      case 'shoot_police_vehicle':
        basePoints = 4;
        break;
      case 'kill_police':
        basePoints = 5;
        break;
    }

    if (basePoints > 0) {
      // Update wanted level based on base points
      this.wantedPoints += basePoints;
      this.wantedLevel = Math.min(3, Math.floor(this.wantedPoints / 10));

      // Calculate score with multipliers
      const wantedMultiplier = this.wantedLevel + 1;
      const comboMultiplier = 1 + this.comboCount * 0.1; // Multiplier based on current combo
      const scoreGain = Math.round(basePoints * wantedMultiplier * comboMultiplier);
      this.score += scoreGain;

      // Update combo state AFTER calculating score for this crime
      this.comboCount++;
      this.comboTimer = this.comboMaxTime;
      this.timeSinceLastScore = 0;

      // Update highest combo if current is higher
      if (this.comboCount > this.highestCombo) {
        this.highestCombo = this.comboCount;
      }

      // Add floating score text
      if (state.damageTextSystem && scoreGain > 0) {
        state.damageTextSystem.addScoreText(state, target.pos, scoreGain, this.comboCount);
      }

      // Update state for other systems to access
      if (state) {
        state.score = this.score;
        state.wantedLevel = this.wantedLevel;
        state.wantedPoints = this.wantedPoints;

        // Record a timestamp so HUD can animate the score pop/bulge
        state.lastScoreAt = (typeof performance !== 'undefined') ? performance.now() : Date.now();
        state.lastScoreGain = scoreGain;
      }
    }
  }

  getWantedLevel() {
    return this.wantedLevel;
  }

  getScore() {
    return this.score;
  }

  getHighestCombo() {
    return this.highestCombo;
  }

  reset() {
    this.score = 0;
    this.wantedPoints = 0;
    this.wantedLevel = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.timeSinceLastScore = 0;
    this.comboPaused = false;
    this.highestCombo = 0;
  }
}