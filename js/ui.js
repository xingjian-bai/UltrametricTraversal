/****************************************************************
 * UI  — all SVG / D3 rendering, including axis & animations.
 ****************************************************************/
import { config }  from "./config.js";

export class UI {
  /**
   * @param {SVGSVGElement} svgEl – main canvas
   * @param {GameState}      state
   */
  constructor(svgEl, state) {
    this.svg      = d3.select(svgEl);
    this.state    = state;
    this.edgeG    = this.svg.append("g");
    this.nodeG    = this.svg.append("g");
    this.axisG    = this.svg.append("g");
    this.nodeMap  = new Map();   // id → node+pos
    this.svgW     = +svgEl.getAttribute("width");
    this.svgH     = +svgEl.getAttribute("height");
  }

  /* ---------------------------------------------------------- */
  /** Recompute layout and redraw everything. */
  render(currentLayer, agentNode) {
    this.#layout(currentLayer === 1);   // anonymise first draw?

    this.#drawEdges(agentNode);
    this.#drawNodes(currentLayer, agentNode);
    this.#drawAxis();
  }

  /* ---------------------------------------------------------- */
  flashPath(path) {
    const keySet = new Set(
      path.slice(0, -1).map((_, i) => `${path[i].id}-${path[i+1].id}`)
    );

    this.edgeG.selectAll("line")
      .classed("highlight", d => keySet.has(`${d.source}-${d.target}`))
      .transition()
        .delay(config.HIGHLIGHT_MS)
        .on("end", function() { d3.select(this).classed("highlight", false); });
  }

  /* ========================================================== *
   *                    INTERNAL  HELPERS                       *
   * ========================================================== */
  /** Build tidy layout; option to anonymise depth≤1. */
  #layout(firstDraw) {
    /* hierarchy builder --------------------------------------------------- */
    const hRoot = d3.hierarchy(_buildHierarchy(this.state.nodes))
                    .sort(() => Math.random()-0.5); // shuffle sibling order

    d3.tree().size([this.svgW-200, this.svgH-100])(hRoot);

    /* cache positions ----------------------------------------------------- */
    this.nodeMap.clear();
    hRoot.descendants().forEach(d => {
      const data = d.data;
      data.x = d.x + 100;
      data.y = d.y +  50;
      this.nodeMap.set(data.id, data);
    });

    /* anonymise the first visible layers ---------------------------------- */
    if (firstDraw) {
      const depth1 = this.state.layers[1];
      const spacing = this.svgW / (depth1.length + 1);
      depth1.forEach((n, i) => {
        const data = this.nodeMap.get(n.id);
        data.x = spacing * (i+1);
      });
      const root = this.nodeMap.get(this.state.layers[0][0].id);
      root.x = this.svgW / 2;
    }
  }

  /* ---------------------------------------------------------------------- */
  #drawEdges(agentNode) {
    const sel = this.edgeG.selectAll("line")
        .data(this.state.edges, d => `${d.source}-${d.target}`);

    sel.join(
      enter => enter.append("line")
        .attr("x1", d => this.nodeMap.get(d.source).x)
        .attr("y1", d => this.nodeMap.get(d.source).y)
        .attr("x2", d => this.nodeMap.get(d.target).x)
        .attr("y2", d => this.nodeMap.get(d.target).y),
      update => update
    ).attr("stroke", d => d.depthParent===0 ? "green" : "#999")
     .attr("visibility", d => d.depthParent<=agentNode.depth ? "visible":"hidden");
  }

  /* ---------------------------------------------------------------------- */
  #drawNodes(currentLayer, agentNode) {
    const sel = this.nodeG.selectAll("circle")
        .data(this.state.nodes, d => d.id);

    sel.join(
      enter => enter.append("circle")
        .attr("r", config.NODE_RADIUS)
        .attr("cx", d => this.nodeMap.get(d.id).x)
        .attr("cy", d => this.nodeMap.get(d.id).y),
      update => update
        .attr("cx", d => this.nodeMap.get(d.id).x)
        .attr("cy", d => this.nodeMap.get(d.id).y)
    ).attr("visibility", d => d.depth<=currentLayer ? "visible":"hidden")
     .attr("fill", d => {
        if (d.id === agentNode.id)    return "green";
        if (d.depth < currentLayer)   return "yellow";
        if (d.depth === currentLayer) return "blue";
        return "none";
      });
  }

  /* ---------------------------------------------------------------------- */
  #drawAxis() {
    const yScale = d3.scaleLinear()
        .domain([0, this.state.depth])
        .range([50, this.svgH-50]);

    const axis = d3.axisLeft(yScale)
        .ticks(this.state.depth)
        .tickFormat(d3.format("d"));

    this.axisG.attr("transform", "translate(60,0)").call(axis);

    /* grid-lines */
    this.axisG.selectAll(".grid").data(yScale.ticks(this.state.depth))
      .join(
        enter => enter.append("line").attr("class","grid")
      )
      .attr("x1", 0)
      .attr("x2", this.svgW-100)
      .attr("y1", d => yScale(d))
      .attr("y2", d => yScale(d))
      .attr("stroke", "#eee")
      .attr("stroke-dasharray", "2 2");
  }
}

/* helper: convert flat list → hierarchy ---------------------------------- */
function _buildHierarchy(nodes) {
  const map = new Map(nodes.map(n => [n.id, { ...n, children:[] }]));
  let root;
  nodes.forEach(n => {
    const cur = map.get(n.id);
    if (n.parent == null) root = cur;
    else map.get(n.parent).children.push(cur);
  });
  return root;
}
