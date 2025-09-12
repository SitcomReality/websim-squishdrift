import { entityOBB, aabbForTile, aabbForTrunk } from '../app/vehicles/physics/geom.js';

/**
 * Converts an OBB or AABB to a list of vertex points.
 * @param {object} shape - The OBB or AABB object.
 * @returns {Array<{x: number, y: number}>} An array of vertices.
 */
function getVerticesFromShape(shape) {
    const vertices = [];
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];

    for (const corner of corners) {
        const sx = corner[0];
        const sy = corner[1];

        const vx = shape.axes[0].x * shape.ext[0] * sx + shape.axes[1].x * shape.ext[1] * sy;
        const vy = shape.axes[0].y * shape.ext[0] * sx + shape.axes[1].y * shape.ext[1] * sy;
        
        vertices.push({
            x: shape.cx + vx,
            y: shape.cy + vy
        });
    }
    return vertices;
}

/**
 * Gathers all potential light occluders within a given radius of a light source.
 * Returns a list of occluder polygons (as vertex arrays).
 * @param {object} state - The game state.
 * @param {{x : number, y: number}} lightPosition - The world-space position of the light.
 * @param {number} lightRadius - The radius of the light.
 * @returns {Array<Array<{x : number, y : number}>>} A list of occluder polygons.
 */
export function getOccludersInRadius(state, lightPosition, lightRadius) {
    const occluders = [];
    const lightRadiusSq = lightRadius * lightRadius;
    const { map } = state.world;
    const processedBuildings = new Set();
    const processedTrees = new Set();

    // 1. Buildings and Trees (static occluders)
    const minTileX = Math.floor(lightPosition.x - lightRadius);
    const maxTileX = Math.ceil(lightPosition.x + lightRadius);
    const minTileY = Math.floor(lightPosition.y - lightRadius);
    const maxTileY = Math.ceil(lightPosition.y + lightRadius);

    for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
            if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) continue;

            const tileType = map.tiles[ty][tx];
            
            // Buildings
            if (tileType === 8 || tileType === 9) { // BuildingFloor or BuildingWall
                const building = (map.buildings || []).find(b => tx >= b.rect.x && tx < b.rect.x + b.rect.width && ty >= b.rect.y && ty < b.rect.y + b.rect.height);
                if (building && !processedBuildings.has(building) && (building.currentHeight ?? building.height) > 0.1) {
                    const buildingAABB = { cx: building.rect.x + building.rect.width / 2, cy: building.rect.y + building.rect.height / 2, axes: [{ x: 1, y: 0 }, { x: 0, y: 1 }], ext: [building.rect.width / 2, building.rect.height / 2] };
                    occluders.push(getVerticesFromShape(buildingAABB));
                    processedBuildings.add(building);
                }
            }
            
            // Trees
            const tree = (map.trees || []).find(t => Math.floor(t.pos.x) === tx && Math.floor(t.pos.y) === ty);
            if (tree && !processedTrees.has(tree) && (tree.currentTrunkHeight ?? tree.trunkHeight) > 0.1) {
                occluders.push(getVerticesFromShape(aabbForTrunk(tx, ty)));
                processedTrees.add(tree);
            }
        }
    }

    // 2. Vehicles and Pedestrians (dynamic occluders)
    for (const entity of state.entities) {
        if (!entity.pos) continue;
        const dx = entity.pos.x - lightPosition.x;
        const dy = entity.pos.y - lightPosition.y;
        if (dx * dx + dy * dy > lightRadiusSq) continue;
        
        // --- NEW: Scale up occluder hitboxes slightly so shadows start outside the sprite ---
        const occluderScale = 1.15;

        if (entity.type === 'vehicle') {
            const obb = entityOBB(entity);
            obb.ext[0] *= occluderScale;
            obb.ext[1] *= occluderScale;
            occluders.push(getVerticesFromShape(obb));
        } else if (entity.type === 'npc' || entity.type === 'player') {
            const size = ((entity.hitboxW || 0.15) / 2) * occluderScale;
            const pedAABB = { cx: entity.pos.x, cy: entity.pos.y, axes: [{ x: 1, y: 0 }, { x: 0, y: 1 }], ext: [size, size] };
            occluders.push(getVerticesFromShape(pedAABB));
        }
    }

    return occluders;
}

/**
 * Computes the intersection point of a ray and a line segment.
 * @param {{p1: {x,y}, p2: {x,y}}} ray - The ray.
 * @param {{p1: {x,y}, p2: {x,y}}} segment - The line segment.
 * @returns {{x,y}|null} The intersection point or null.
 */
function getIntersection(ray, segment) {
    const r_px = ray.p1.x, r_py = ray.p1.y;
    const r_dx = ray.p2.x - r_px, r_dy = ray.p2.y - r_py;
    const s_px = segment.p1.x, s_py = segment.p1.y;
    const s_dx = segment.p2.x - s_px, s_dy = segment.p2.y - s_py;

    const r_mag = Math.sqrt(r_dx * r_dx + r_dy * r_dy);
    const s_mag = Math.sqrt(s_dx * s_dx + s_dy * s_dy);
    if (r_mag === 0 || s_mag === 0) return null;
    if (r_dx / r_mag === s_dx / s_mag && r_dy / r_mag === s_dy / s_mag) return null; // Parallel

    const T2 = (r_dx * (s_py - r_py) + r_dy * (r_px - s_px)) / (s_dx * r_dy - s_dy * r_dx);
    const T1 = (s_px + s_dx * T2 - r_px) / r_dx;

    if (T1 < 0) return null;
    if (T2 < 0 || T2 > 1) return null;

    return { x: r_px + r_dx * T1, y: r_py + r_dy * T1 };
}

/**
 * Computes a visibility polygon for a light source given a set of occluders.
 * @param {{x,y}} lightPosition - The position of the light source.
 * @param {number} lightRadius - The radius of the light.
 * @param {Array<Array<{x,y}>>} occluders - An array of occluder polygons.
 * @returns {Array<{x,y}>} The vertices of the visibility polygon.
 */
export function computeVisibilityPolygon(lightPosition, lightRadius, occluders) {
    const allVertices = [];
    const segments = [];
    for (const polygon of occluders) {
        for (let i = 0; i < polygon.length; i++) {
            allVertices.push(polygon[i]);
            segments.push({ p1: polygon[i], p2: polygon[(i + 1) % polygon.length] });
        }
    }

    // Add boundary points of the light radius as "vertices" to cast rays to
    const boundaryPoints = [
        { x: lightPosition.x - lightRadius, y: lightPosition.y - lightRadius },
        { x: lightPosition.x + lightRadius, y: lightPosition.y - lightRadius },
        { x: lightPosition.x + lightRadius, y: lightPosition.y + lightRadius },
        { x: lightPosition.x - lightRadius, y: lightPosition.y + lightRadius }
    ];
    allVertices.push(...boundaryPoints);
    
    const angles = [];
    for (const vertex of allVertices) {
        const angle = Math.atan2(vertex.y - lightPosition.y, vertex.x - lightPosition.x);
        angles.push(angle - 0.0001, angle, angle + 0.0001);
    }
    
    angles.sort((a, b) => a - b);
    const uniqueAngles = angles.filter((v, i, a) => i === 0 || v > a[i - 1]);

    const visibilityPoints = [];
    for (const angle of uniqueAngles) {
        const ray = {
            p1: lightPosition,
            p2: {
                x: lightPosition.x + Math.cos(angle) * lightRadius * 2, // extend beyond radius
                y: lightPosition.y + Math.sin(angle) * lightRadius * 2,
            },
        };

        let closestIntersection = null;
        let minDistanceSq = Infinity;

        for (const segment of segments) {
            const intersection = getIntersection(ray, segment);
            if (intersection) {
                const dx = intersection.x - lightPosition.x;
                const dy = intersection.y - lightPosition.y;
                const distanceSq = dx * dx + dy * dy;

                if (distanceSq < minDistanceSq) {
                    minDistanceSq = distanceSq;
                    closestIntersection = intersection;
                }
            }
        }
        
        // If no intersection, point is on the radius boundary
        if (!closestIntersection) {
            closestIntersection = {
                x: lightPosition.x + Math.cos(angle) * lightRadius,
                y: lightPosition.y + Math.sin(angle) * lightRadius
            };
        } else {
             // Clamp intersection to light radius
            const dist = Math.sqrt(minDistanceSq);
            if(dist > lightRadius) {
                 closestIntersection = {
                    x: lightPosition.x + Math.cos(angle) * lightRadius,
                    y: lightPosition.y + Math.sin(angle) * lightRadius
                };
            }
        }
        visibilityPoints.push(closestIntersection);
    }

    return visibilityPoints;
}