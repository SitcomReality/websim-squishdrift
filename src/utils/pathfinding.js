class PriorityQueue {
    constructor() {
        this._nodes = [];
    }
    enqueue(priority, key) {
        this._nodes.push({ key: key, priority: priority });
        this.sort();
    }
    dequeue() {
        return this._nodes.shift().key;
    }
    sort() {
        this._nodes.sort((a, b) => a.priority - b.priority);
    }
    isEmpty() {
        return !this._nodes.length;
    }
}

function heuristic(a, b) {
    // Manhattan distance
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function findPath(graph, startNode, endNode) {
    const openSet = new PriorityQueue();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const startKey = `${startNode.x},${startNode.y},${startNode.dir}`;
    const endKey = `${endNode.x},${endNode.y},${endNode.dir}`;

    graph.nodes.forEach(node => {
        gScore.set(`${node.x},${node.y},${node.dir}`, Infinity);
        fScore.set(`${node.x},${node.y},${node.dir}`, Infinity);
    });

    gScore.set(startKey, 0);
    fScore.set(startKey, heuristic(startNode, endNode));
    openSet.enqueue(fScore.get(startKey), startKey);
    
    const nodeMap = new Map();
    graph.nodes.forEach(n => nodeMap.set(`${n.x},${n.y},${n.dir}`, n));

    while (!openSet.isEmpty()) {
        const currentKey = openSet.dequeue();
        
        if (currentKey === endKey) {
            return reconstructPath(cameFrom, currentKey, nodeMap);
        }

        const currentNode = nodeMap.get(currentKey);
        if (!currentNode) continue;

        // Use pre-computed neighbors from the road graph
        const neighbors = currentNode.next.map(n => graph.byKey.get(`${n.x},${n.y},${n.dir}`)).filter(Boolean);
        
        for (const neighbor of neighbors) {
            const neighborKey = `${neighbor.x},${neighbor.y},${neighbor.dir}`;
            const tentativeGScore = gScore.get(currentKey) + 1; // assume cost is 1

            if (tentativeGScore < gScore.get(neighborKey)) {
                cameFrom.set(neighborKey, currentKey);
                gScore.set(neighborKey, tentativeGScore);
                fScore.set(neighborKey, tentativeGScore + heuristic(neighbor, endNode));
                openSet.enqueue(fScore.get(neighborKey), neighborKey);
            }
        }
    }

    return null; // No path found
}

function reconstructPath(cameFrom, currentKey, nodeMap) {
    const totalPath = [nodeMap.get(currentKey)];
    let current = currentKey;
    while (cameFrom.has(current)) {
        current = cameFrom.get(current);
        totalPath.unshift(nodeMap.get(current));
    }
    return totalPath;
}