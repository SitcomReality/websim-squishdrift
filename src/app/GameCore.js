    this.debugOverlay.update({
      fps: this.renderer.fps, dt: dt,
      player: { x: player.pos.x.toFixed(2), y: player.pos.y.toFixed(2) },
      camera: { x: cam.x.toFixed(2), y: cam.y.toFixed(2) },
      roads: {
        nodes: s.world.map.roads.nodes.length,
        links: s.world.map.roads.nodes.reduce((a,n)=>a+n.next.length,0)
      },
      vehicle: s.control.inVehicle ? { 
        at: s.control.vehicle.node ? [s.control.vehicle.node.x, s.control.vehicle.node.y] : [s.control.vehicle.pos.x, s.control.vehicle.pos.y], 
        speed: Number((s.control.vehicle.speed||0).toFixed(2)) 
      } : null,
      npcs: this.state.entities.filter(e=>e.type==='npc').length,
      control: { inVehicle: s.control.inVehicle },
      equipped: s.control.equipped ? s.control.equipped.name : null,
      items: s.entities.filter(e => e.type === 'item').length
    });

