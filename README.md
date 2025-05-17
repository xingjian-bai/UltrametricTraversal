# UltrametricTraversal


## 🚧 TODO — Next-Round Feature Roadmap

- [x] **Anonymous, centred initial layout**
  - Randomly shuffle the order of **all child arrays** *before* running the `d3.tree()` layout so that wide/narrow sub-trees cannot be inferred from sibling spacing.  
  - Horizontally centre the root and the whole first visible layer inside the SVG canvas (`root.x = canvasWidth / 2`).  
  - Keep the shuffle order fixed for the entire session to preserve path coherence after each click.  
  - Verify: at depth 0 and 1 all nodes are equally spaced, and no horizontal clue hints at deeper branching.

- [x] **Dynamic depth / width controls**
  - Add two `<input type="range">` sliders in the rules panel:  
    `DEPTH ∈ [4, 25]` `WIDTH ∈ [2, 12]` (live numeric read-outs beside each).  
  - A **Generate** button clears the SVG and instantiates a fresh `GameState` with the chosen parameters; version counter increments.  
  - Disable the sliders while a game is running; re-enable them on game-over.

- [ ] **Vertical layer axis**
  - Render a `d3.axisLeft` along the left edge, ticks and grid-lines at every integer depth from 0 to the current `DEPTH`.  
  - Grid-lines span the full canvas width (light-grey, dashed) to help visual alignment.  
  - Axis updates automatically when a new tree is generated or if `DEPTH` is changed.

- [ ] **Baseline comparison panel**
  - After the overlay shows “Game Over”, enable a **Compare with Baselines** button.  
  - Implement **deterministic DFS** as the first baseline (future-proof for Random, Entropy-max, etc.).  
  - Re-run the exact same random tree (same node/edge IDs) under the baseline policy and record its total score.  
  - Display a mini bar-chart (D3) inside the overlay comparing:  
    *Your score* vs *DFS score* (and future baselines).  
  - Tooltips show the raw edge-count; colours follow the game’s palette.
