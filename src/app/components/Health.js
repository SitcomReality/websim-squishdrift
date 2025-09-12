export class Health {
  constructor(maxHp = 100) {
    this.hp = maxHp;
    this.maxHp = maxHp;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  isAlive() {
    return this.hp > 0;
  }

  getPercent() {
    return this.hp / this.maxHp;
  }
}

