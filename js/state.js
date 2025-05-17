import { config } from "./config.js";

/**
 * Immutable information about one node.
 * @typedef {Object} Node
 * @property {number} id
 * @property {number} depth
 * @property {?number} parent
 */

export class GameState {
  constructor(width = config.WIDTH, depth = config.DEPTH) {
    this.width = width;
    this.depth = depth;
    this.nodes = [];
    this.edges = [];
    this.layers = [];
    this._generateRandomTree();
  }

  _generateRandomTree() {
    let nodeId = 0;
    const root = { id: nodeId++, depth: 0, parent: null };
    this.nodes.push(root);
    this.layers.push([root]);

    for (let d = 1; d <= this.depth; d++) {
      const layer = [];
      for (let i = 0; i < this.width; i++) {
        const parent =
          this.layers[d - 1][Math.floor(Math.random() * this.layers[d - 1].length)];
        const node = { id: nodeId++, depth: d, parent: parent.id };
        this.nodes.push(node);
        this.edges.push({ source: parent.id, target: node.id, depthParent: parent.depth });
        layer.push(node);
      }
      this.layers.push(layer);
    }
  }

  /** Return lowest common ancestor of two nodes (inclusive). */
  getLCA(a, b, nodeMap) {
    const ancestors = new Set();
    let cur = a;
    while (cur) {
      ancestors.add(cur.id);
      cur = nodeMap.get(cur.parent);
    }
    cur = b;
    while (cur) {
      if (ancestors.has(cur.id)) return cur;
      cur = nodeMap.get(cur.parent);
    }
    return null;
  }

  /** Return path (array of nodes) between two nodes through the LCA. */
  getPath(a, b, nodeMap) {
    const lca = this.getLCA(a, b, nodeMap);
    if (!lca) return [];
    const up = [];
    for (let cur = a; cur.id !== lca.id; cur = nodeMap.get(cur.parent)) up.push(cur);
    const down = [];
    for (let cur = b; cur.id !== lca.id; cur = nodeMap.get(cur.parent)) down.push(cur);
    down.reverse();
    return [...up, lca, ...down];
  }
}
