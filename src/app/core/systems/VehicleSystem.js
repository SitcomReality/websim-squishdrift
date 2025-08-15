export class VehicleSystem {
  update(state, input, dt) {
    if (state.control.inVehicle) {
      this.updatePlayerVehicle(state, input, dt);
    } else {
      this.updateAIVehicles(state, dt);
    }
  }

  updatePlayerVehicle(state, input, dt) {
    const vehicle = state.control.vehicle;
    if (!vehicle) return;

    const throttle = (input.keys.has('KeyW') || input.keys.has('ArrowUp') ? 1 : 0) +
                     (input.keys.has('KeyS') || input.keys.has('ArrowDown') ? -1 : 0);
    const steer = (input.keys.has('KeyA') || input.keys.has('ArrowLeft') ? -1 : 0) +
                 (input.keys.has('KeyD') || input.keys.has('ArrowRight') ? 1 : 0);
    const brake = input.keys.has('Space') ? 1 : 0;

    vehicle.speed += throttle * vehicle.accel * dt;
    const drag = vehicle.drag + (brake ? 8 : 0);
    const sign = Math.sign(vehicle.speed);
    vehicle.speed -= sign * drag * dt;
    if (Math.sign(vehicle.speed) !== sign) vehicle.speed = 0;
    
    vehicle.speed = Math.max(-vehicle.maxSpeed*0.4, Math.min(vehicle.maxSpeed, vehicle.speed));
    
    const speedFactor = Math.min(1, Math.abs(vehicle.speed) / vehicle.maxSpeed);
    vehicle.rot += steer * vehicle.turnRate * (speedFactor || 0) * dt * (vehicle.speed>=0 ? 1 : -1);
    
    vehicle.pos.x += Math.cos(vehicle.rot) * vehicle.speed * dt;
    vehicle.pos.y += Math.sin(vehicle.rot) * vehicle.speed * dt;
  }

  updateAIVehicles(state, dt) {
    for (const veh of state.entities.filter(e => e.type === 'vehicle' && !e.controlled)) {
      if (veh.next) {
        veh.t += (veh.speed * dt);
        while (veh.t >= 1 && veh.node) {
          veh.node = veh.next;
          const choices = veh.node.next;
          veh.next = choices && choices.length ? choices[(Math.floor(state.rand()*choices.length))] : veh.node;
          veh.t -= 1;
        }
      }
    }
  }
}

