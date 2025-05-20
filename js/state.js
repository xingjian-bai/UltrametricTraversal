/****************************************************************
 * GameState — random tree + path utilities
 ****************************************************************/
export class GameState {
  constructor(width, depth) {
    this.width = width;
    this.depth = depth;
    this.nodes = [];
    this.edges = [];
    this.layers = [];
    this.#buildTree();
  }

  #buildTree() {
    let id = 0;
    const root = { id: id++, depth: 0, parent: null };
    this.nodes.push(root);
    this.layers.push([root]);

    for (let d = 1; d <= this.depth; d++) {
      const layer = [];
      for (let i = 0; i < this.width; i++) {
        const parent = this.layers[d - 1][Math.floor(Math.random() *
                                this.layers[d - 1].length)];
        const node = { id: id++, depth: d, parent: parent.id };
        this.nodes.push(node);
        this.edges.push({ source: parent.id, target: node.id, depthParent: parent.depth });
        layer.push(node);
      }
      this.layers.push(layer);
    }
  }

  /* path between two nodes through the LCA */
  getPath(a, b, nodeMap) {
    const lca = this.#lca(a, b, nodeMap);
    const up = [];
    for (let cur = a; cur.id !== lca.id; cur = nodeMap.get(cur.parent)) up.push(cur);
    const down = [];
    for (let cur = b; cur.id !== lca.id; cur = nodeMap.get(cur.parent)) down.push(cur);
    down.reverse();
    return [...up, lca, ...down];
  }

  #lca(a, b, nodeMap) {
    const anc = new Set();
    for (let cur = a; cur; cur = nodeMap.get(cur.parent)) anc.add(cur.id);
    for (let cur = b; cur; cur = nodeMap.get(cur.parent))
      if (anc.has(cur.id)) return cur;
    return null; // unreachable
  }
}
