import { config } from "./config.js";

/* helper: convert flat array → hierarchy -------------------- */
function toHierarchy(nodes) {
  const map = new Map(nodes.map(n => [n.id, { ...n, children: [] }]));
  let root;
  nodes.forEach(n => {
    const cur = map.get(n.id);
    if (n.parent == null) root = cur;
    else map.get(n.parent).children.push(cur);
  });
  return root;
}

export class UI {
  constructor(svgEl, state) {
    this.svg   = d3.select(svgEl);
    this.state = state;

    // Create arrow marker definition with new color
    this.svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -3 12 6")
      .attr("refX", 10)
      .attr("refY", 0)
      .attr("markerWidth", 8)
      .attr("markerHeight", 4)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-3L12,0L0,3")
      .attr("fill", config.COLORS.PATH_HIGHLIGHT);

    this.edgeG = this.svg.append("g");
    this.nodeG = this.svg.append("g");
    this.axisG = this.svg.append("g");

    this.svgW = +svgEl.getAttribute("width");
    this.svgH = +svgEl.getAttribute("height");
    this.padX = 120;  // Increased left padding to avoid depth scale overlap
    this.padY = 50;
    
    // Reserve space for the stats panel (assuming it's about 200px wide)
    this.rightPadding = 220;

    this.nodeMap = new Map();
    this._layoutDone = false;

    // Adjust node sizes for mobile
    this.nodeSizeFactor = window.innerWidth <= 768 ? 2.0 : 1.0;
    
    // Recalculate on window resize
    window.addEventListener('resize', () => {
      this.nodeSizeFactor = window.innerWidth <= 768 ? 2.0 : 1.0;
      if (this.state) {
        this.render(this.currentLayer, this.currentNode);
      }
    });
  }

  render(visibleDepth = 0, agentNode = null) {
    // Clear existing content
    this.nodeG.selectAll("*").remove();
    this.edgeG.selectAll("*").remove();

    if (!this._layoutDone) this.#layout();
    this._layoutDone = true;

    this.#edges(agentNode);
    this.#nodes(visibleDepth, agentNode);
    this.#axis();

    this.nodeG.raise();         // keep circles above lines
  }

  flash(path) {
    // Create path segments with direction information
    const pathSegments = [];
    for (let i = 0; i < path.length - 1; i++) {
      pathSegments.push({
        source: path[i].id,
        target: path[i+1].id,
        sourceNode: path[i],
        targetNode: path[i+1]
      });
    }
    
    // Remove any existing highlighted paths
    this.edgeG.selectAll(".highlight-path").remove();
    
    // Create new path segments with arrows
    const highlightGroup = this.edgeG.append("g")
      .attr("class", "highlight-path");
      
    highlightGroup.selectAll("line")
      .data(pathSegments)
      .join("line")
      .attr("x1", d => this.nodeMap.get(d.source).x)
      .attr("y1", d => this.nodeMap.get(d.source).y)
      .attr("x2", d => this.nodeMap.get(d.target).x)
      .attr("y2", d => this.nodeMap.get(d.target).y)
      .attr("stroke", config.COLORS.PATH_HIGHLIGHT)
      .attr("stroke-width", 3)
      .attr("marker-end", "url(#arrowhead)");
    
    // Remove the highlight after a delay
    setTimeout(() => {
      highlightGroup.transition().duration(300)
        .style("opacity", 0)
        .remove();
    }, config.HIGHLIGHT_MS);
  }

  /* ---------- private helpers ----------------------------- */
  #layout() {
    const root = d3.hierarchy(toHierarchy(this.state.nodes));
    
    // Calculate available width (accounting for left padding and right stats panel)
    const availableWidth = this.svgW - this.padX - this.rightPadding;
    
    const treeLayout = d3.tree()
      .size([availableWidth, this.svgH - 2*this.padY]);
    
    treeLayout(root);
    
    // Center the tree in the available space
    const centeringOffset = this.padX; // This ensures proper left padding
    
    root.descendants().forEach(d => {
      // Add the centering offset to position nodes properly
      d.data.x = d.x + centeringOffset;
      d.data.y = d.y + this.padY;
      this.nodeMap.set(d.data.id, d.data);
    });
  }

  #edges(agent) {
    const sel = this.edgeG.selectAll("line")
                .data(this.state.edges, d => `${d.source}-${d.target}`);

    sel.join(enter => enter.append("line"))
      .attr("x1", d => this.nodeMap.get(d.source).x)
      .attr("y1", d => this.nodeMap.get(d.source).y)
      .attr("x2", d => this.nodeMap.get(d.target).x)
      .attr("y2", d => this.nodeMap.get(d.target).y)
      .attr("stroke", config.COLORS.NORMAL_EDGE)
      .attr("stroke-width", 2)
      .attr("visibility", d =>
         d.depthParent <= agent.depth ? "visible":"hidden");
  }

  #nodes(layer, agent) {
    const sel = this.nodeG.selectAll("circle")
                .data(this.state.nodes, d => d.id);

    sel.join(enter => enter.append("circle").attr("r", config.NODE_RADIUS))
      .attr("cx", d => this.nodeMap.get(d.id).x)
      .attr("cy", d => this.nodeMap.get(d.id).y)
      .attr("visibility", d => d.depth <= layer ? "visible" : "hidden")
      .attr("fill", d => {
        if (d.id === agent.id)      return config.COLORS.CURRENT_NODE;
        if (d.depth < layer)        return config.COLORS.VISITED_NODE;
        if (d.depth === layer)      return config.COLORS.AVAILABLE_NODE;
        return "none";
      });
  }

  #axis() {
    const y = d3.scaleLinear()
                .domain([0, this.state.depth])
                .range([this.padY, this.svgH - this.padY]);

    const axis = d3.axisLeft(y).ticks(this.state.depth).tickFormat(d3.format("d"));
    this.axisG.attr("transform", `translate(${this.padX-40},0)`).call(axis);
  }

  nodeColor(d, visibleDepth, agentNode) {
    if (agentNode && d.data.id === agentNode.id) return "green";
    if (d.data.depth < visibleDepth) return "yellow";
    if (d.data.depth === visibleDepth) return "blue";
    return "none";
  }
}
