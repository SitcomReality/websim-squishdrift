export class InputManager {
  constructor(canvas) {
    this.inputSystem = new InputSystem(canvas);
  }

  update() {
    this.inputSystem.update();
  }

  getInput() {
    return this.inputSystem;
  }
}

