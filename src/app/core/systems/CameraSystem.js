    const speed = this._prevTarget && dt ? Math.hypot(target.x - this._prevTarget.x, target.y - this._prevTarget.y) / dt : 0;
    const maxRef = state.control.inVehicle ? (state.control.vehicle?.maxSpeed || 6) : ((state.entities.find(e=>e.type==='player')?.moveSpeed) || 6);
    const frac = Math.max(0, Math.min(1, speed / (maxRef || 1)));
    const desiredZoom = cam.defaultZoom * (1 + frac); // up to 2x at max speed

    const speed = this._prevTarget && dt ? Math.hypot(target.x - this._prevTarget.x, target.y - this._prevTarget.y) / dt : 0;
    const maxRef = state.control.inVehicle ? (state.control.vehicle?.maxSpeed || 6) : ((state.entities.find(e=>e.type==='player')?.moveSpeed) || 6);
    const speedThreshold = maxRef * 0.4; // Reduce threshold to 40% of max speed
    const frac = Math.max(0, Math.min(1, speed / (speedThreshold || 1)));
    const desiredZoom = cam.defaultZoom * (1 + frac); // up to 2x at max speed

