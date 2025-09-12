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

    // 1. Buildings and Trees (static occluders)
    // Broad-phase check using a tile grid scan
    const minTileX = Math.floor(lightPosition.x - lightRadius);
    const maxTileX = Math.ceil(lightPosition.x + lightRadius);
    const minTileY = Math.floor(lightPosition.y - lightRadius);
    const maxTileY = Math.ceil(lightPosition.y + lightRadius);

    for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
            if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) continue;

            // Check if building tile
            const tileType = map.tiles[ty][tx];
            if (tileType === 8 || tileType === 9) {