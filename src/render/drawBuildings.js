      const floorRect = { 
        x: b.rect.x * ts, 
        y: b.rect.y * ts, 
        w: b.rect.width * ts, 
        h: b.rect.height * ts 
      };
      
      // Calculate perspective-based roof scale
      const distanceFromCamera = Math.hypot(
        (b.rect.x + b.rect.width/2) - cam.x,
        (b.rect.y + b.rect.height/2) - cam.y
      );
      const maxDistance = 20; // tiles
      const perspectiveScale = 0.8 + (b.height / 200) * Math.max(0, 1 - distanceFromCamera / maxDistance);
      const roofScale = 1 + (b.height / 400) * Math.max(0, 1 - distanceFromCamera / maxDistance);
      
      let roofOffset = { x: 0, y: 0 };
      if (!isCamInside) {
        const bx = b.rect.x + b.rect.width/2, by = b.rect.y + b.rect.height/2;
        const dir = { x: bx - cam.x, y: by - cam.y };
        const len = Math.hypot(dir.x, dir.y) || 1;
        dir.x /= len; dir.y /= len;
        const offsetMagnitude = b.height * perspectiveScale * Math.min(1, len / 20);
        roofOffset.x = dir.x * offsetMagnitude;
        roofOffset.y = dir.y * offsetMagnitude;
      }
      
      const roofWidth = floorRect.w * roofScale;
      const roofHeight = floorRect.h * roofScale;
      const roofRect = { 
        x: floorRect.x + roofOffset.x - (roofWidth - floorRect.w) / 2, 
        y: floorRect.y + roofOffset.y - (roofHeight - floorRect.h) / 2, 
        w: roofWidth, 
        h: roofHeight 
      };

