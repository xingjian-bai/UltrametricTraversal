export const config = {
  VERSION: "0.16",

  /* newest first */
  VERSION_LOG: [
    { v: "0.16", msg: "Added leaderboard system for competitive play" },
    { v: "0.15", msg: "Refined depth display and game timing" },
    { v: "0.14", msg: "Simplified node colors and adjusted legend position" },
    { v: "0.13", msg: "Improved colors and added visual legend" },
    { v: "0.12", msg: "Added restart button and path direction arrows" },
    { v: "0.11", msg: "Added game stats panel: depth tracker, move history" },
    { v: "0.10", msg: "Fixed path highlighting" },
    { v: "0.9", msg: "Tidy-tree layout" },
    { v: "0.8", msg: "Score → Cost" },
    { v: "0.7", msg: "Planar grid layout" },
    { v: "0.6", msg: "Version history" },
    { v: "0.5", msg: "Node/edge alignment" },
    { v: "0.4", msg: "Depth/width controls" },
    { v: "0.3", msg: "Modular refactor" },
  ],

  /* defaults (overridden by sliders) */
  WIDTH: 5,
  DEPTH: 10,

  NODE_RADIUS: 7,          // Reduced from 10 to ~2/3 the size
  HIGHLIGHT_MS: 1000,      // Changed from 1300 to 1000 (1 second)
  
  /* Game colors */
  COLORS: {
    CURRENT_NODE: "#f57c00",    // Orange
    AVAILABLE_NODE: "#1976d2",  // Blue
    VISITED_NODE: "#9575cd",    // Light purple
    NORMAL_EDGE: "#78909c",     // Medium gray-blue
    PATH_HIGHLIGHT: "#d32f2f",  // Brick red
    CURRENT_LAYER_EDGE: "#4caf50" // Green
  }
};
