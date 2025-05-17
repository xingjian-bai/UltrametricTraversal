import { config } from "./config.js";

/**
 * All code that touches D3 / DOM lives here.
 */
export class UI {
  /**
   * @param {SVGSVGElement} svgEl
   * @param {GameState} state
   */
  constructor(svgEl, state) {
    this.svg = d3.select(svgEl);
    this.state = state;
    this.edgeGroup = this.svg.append("g");
    this.nodeGroup = this.svg.append("g");
    /** Maps nodeId -> {x, y, ...node} */
    this.nodeMap = new Map();
  }

  /** Compute a tidy-tree layout and cache coordinates in nodeMap. */
  layout() {
    const hierarchy = d3
      .hierarchy(buildHierarchy(this.state.nodes))
      .sort((a, b) => d3.ascending(a.data.id, b.data.id));

    d3.tree().size([800, 700])(hierarchy);

    hierarchy.descendants().forEach((d) => {
      const data = d.data;
      data.x = d.x + 100;
      data.y = d.y + 50;
      this.nodeMap.set(data.id, data);
    });
  }

  /** Draw or update all SVG elements. */
  render(currentLayer, agentNode) {
    this.layout();

    /* --- edges --- */
    const edges = this.edgeGroup
      .selectAll("line")
      .data(this.state.edges, (d) => `${d.source}-${d.target}`);

    edges
      .join((enter) =>
        enter
          .append("line")
          .attr("class", "edge")
          .attr("x1", (d) => this.nodeMap.get(d.source).x)
          .attr("y1", (d) => this.nodeMap.get(d.source).y)
          .attr("x2", (d) => this.nodeMap.get(d.target).x)
          .attr("y2", (d) => this.nodeMap.get(d.target).y)
      )
      .transition()
      .attr("stroke", (d) => (d.depthParent === 0 ? "green" : "#999"))
      .attr("visibility", (d) =>
        d.depthParent <= agentNode.depth ? "visible" : "hidden"
      );

    /* --- nodes --- */
    const nodes = this.nodeGroup
      .selectAll("circle")
      .data(this.state.nodes, (d) => d.id);

    nodes
      .join((enter) =>
        enter
          .append("circle")
          .attr("class", "node")
          .attr("r", config.NODE_RADIUS)
          .attr("cx", (d) => this.nodeMap.get(d.id).x)
          .attr("cy", (d) => this.nodeMap.get(d.id).y)
      )
      .on("click", null) // listeners attached from game.js
      .transition()
      .attr("visibility", (d) => (d.depth <= currentLayer ? "visible" : "hidden"))
      .attr("fill", (d) => {
        if (d.id === agentNode.id) return "green";
        if (d.depth < currentLayer) return "yellow";
        if (d.depth === currentLayer) return "blue";
        return "none";
      });
  }

  /** Briefly highlight all edges in `path` (array of node objects). */
  flashPath(path) {
    const pairSet = new Set(
      path.slice(0, -1).map((_, i) => `${path[i].id}-${path[i + 1].id}`)
    );
    this.edgeGroup
      .selectAll("line")
      .classed("highlight", (d) => pairSet.has(`${d.source}-${d.target}`))
      .transition()
      .delay(config.HIGHLIGHT_MS)
      .on("end", function () {
        d3.select(this).classed("highlight", false);
      });
  }
}

/* ---------- helpers ---------- */
function buildHierarchy(nodes) {
  const map = new Map(nodes.map((n) => [n.id, { ...n, children: [] }]));
  let root;
  nodes.forEach((n) => {
    const cur = map.get(n.id);
    if (n.parent == null) root = cur;
    else map.get(n.parent).children.push(cur);
  });
  return root;
}
