export class CollisionAudioHandler {
  playImpactSound(state, position) {
    const impactSound = ['impact01', 'impact02', 'impact03'][Math.floor(Math.random() * 3)];
    state.audio?.playSfxAt?.(impactSound, position, state);
  }

  playPedestrianDeathSound(state, position) {
    state.audio?.playSfxAt?.('pedestrian_death', position, state);
  }
}

