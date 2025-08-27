    applyImpactDamage(state, v, damageMultiplier) {
        const now = Date.now();
        const canDamage = now - (v.lastDamageTime || 0) >= this.system.damageCooldown;

        if (canDamage) {
            const impactSpeed = Math.hypot(v.vel?.x || 0, v.vel?.y || 0);
            if (impactSpeed > this.system.collisionDamageThreshold) {
                if (!v.health) v.health = new Health(v.maxHealth || 100);
                const damage = Math.max(1, Math.round(impactSpeed * damageMultiplier));
                v.health.takeDamage(damage);
                v.lastDamageTime = now;
                
                const impactSound = ['impact01', 'impact02', 'impact03'][Math.floor(Math.random() * 3)];
                // Reduce volume to 30% for environment collisions
                state.audio?.playSfxAt?.(impactSound, v.pos, state, { volume: 0.3 });
                
                handleVehicleDestruction(state, v);
                addDamageIndicator(state, v.pos, damage);
            }
        }
    }

