export class ScoringSystem {
  constructor() {
    this.score = 0;
    this.wantedPoints = 0;
    this.wantedLevel = 0;
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

      // Calculate score with multiplier
      const multiplier = this.wantedLevel + 1;
      const scoreGain = basePoints * multiplier;
      this.score += scoreGain;

      // Add floating score text
      if (state.damageTextSystem && scoreGain > 0) {
        state.damageTextSystem.addScoreText(state, target.pos, scoreGain);
      }

      // Update state for other systems to access
      if (state) {
        state.score = this.score;
        state.wantedLevel = this.wantedLevel;
        state.wantedPoints = this.wantedPoints;
      }
    }
  }

  getWantedLevel() {
    return this.wantedLevel;
  }

  getScore() {
    return this.score;
  }

  reset() {
    this.score = 0;
    this.wantedPoints = 0;
    this.wantedLevel = 0;
  }
}