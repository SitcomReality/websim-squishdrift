import { InputSystem } from '../InputSystem.js';

export class InputManager {
  constructor(canvas) {
    this.inputSystem = new InputSystem(canvas);
    this.gamepadManager = new GamepadManager();
  }

  update() {
    this.inputSystem.update();
    this.gamepadManager.update();
  }

  getInput() {
    return {
      ...this.inputSystem,
      gamepad: this.gamepadManager.getState()
    };
  }
}

class GamepadManager {
  constructor() {
    this.gamepad = null;
    this.lastTimestamp = 0;
    this.deadzone = 0.15;
    this.buttonMap = {
      0: 'A',
      1: 'B',
      2: 'X',
      3: 'Y',
      4: 'LB',
      5: 'RB',
      6: 'LT',
      7: 'RT',
      8: 'Back',
      9: 'Start',
      10: 'LeftStick',
      11: 'RightStick',
      12: 'DPadUp',
      13: 'DPadDown',
      14: 'DPadLeft',
      15: 'DPadRight'
    };
  }

  update() {
    const gamepads = navigator.getGamepads();
    this.gamepad = gamepads[0] || null;
  }

  getState() {
    if (!this.gamepad) return null;

    const axes = this.gamepad.axes;
    const buttons = this.gamepad.buttons;

    return {
      connected: true,
      buttons: {
        A: buttons[0].pressed,
        B: buttons[1].pressed,
        X: buttons[2].pressed,
        Y: buttons[3].pressed,
        LB: buttons[4].pressed,
        RB: buttons[5].pressed,
        LT: buttons[6].value > 0.5,
        RT: buttons[7].value > 0.5,
        Back: buttons[8].pressed,
        Start: buttons[9].pressed,
        DPadUp: buttons[12].pressed,
        DPadDown: buttons[13].pressed,
        DPadLeft: buttons[14].pressed,
        DPadRight: buttons[15].pressed
      },
      axes: {
        leftStick: {
          x: Math.abs(axes[0]) > this.deadzone ? axes[0] : 0,
          y: Math.abs(axes[1]) > this.deadzone ? axes[1] : 0
        },
        rightStick: {
          x: Math.abs(axes[2]) > this.deadzone ? axes[2] : 0,
          y: Math.abs(axes[3]) > this.deadzone ? axes[3] : 0
        },
        leftTrigger: axes[4] || 0,
        rightTrigger: axes[5] || 0
      }
    };
  }

  isButtonPressed(button) {
    if (!this.gamepad) return false;
    const index = Object.keys(this.buttonMap).find(key => this.buttonMap[key] === button);
    return index ? this.gamepad.buttons[index].pressed : false;
  }
}