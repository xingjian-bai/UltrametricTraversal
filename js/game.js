/****************************************************************
 * game.js — orchestrates state ↔ UI ↔ user input  (v0.8)
 ****************************************************************/
import { config }    from "./config.js";
import { GameState } from "./state.js";
import { UI }        from "./ui.js";
import { Leaderboard } from "./leaderboard.js";

/* ── DOM handles ───────────────────────────────────────────── */
const svgEl       = document.getElementById("canvas");
const costEl      = document.getElementById("cost");
const versionEl   = document.getElementById("version");
const rulesEl     = document.getElementById("rules");
const overlayEl   = document.getElementById("overlay");
const depthSlider = document.getElementById("depthSlider");
const widthSlider = document.getElementById("widthSlider");
const depthVal    = document.getElementById("depthVal");
const widthVal    = document.getElementById("widthVal");
const genBtn      = document.getElementById("generateBtn");
const debugEl     = document.getElementById("debug");
const verHistEl   = document.getElementById("versionHistory");
const currentDepthEl = document.getElementById("current-depth");
const gameCostEl = document.getElementById("game-cost");
const costHistoryEl = document.getElementById("cost-history");
const restartBtn = document.getElementById("restartBtn");

/* ── reactive slider labels ───────────────────────────────── */
depthSlider.oninput = () => depthVal.textContent = depthSlider.value;
widthSlider.oninput = () => widthVal.textContent = widthSlider.value;

/* ── version banner + log ─────────────────────────────────── */
versionEl.textContent = `Version ${config.VERSION}`;
renderVersionLog();

/* ── game-runtime vars ────────────────────────────────────── */
let state, ui;
let agentNode, currentLayer, cost, busy, playing=false;
let moveNumber = 0;
window.leaderboard = new Leaderboard(config);

/* ── wire Generate button ─────────────────────────────────── */
genBtn.onclick = () => startNewGame(+widthSlider.value, +depthSlider.value);

/* initial hint */
appendDebug("Ready – set parameters and click Generate.");

/* ========================================================== */
function startNewGame(W, D) {
  if (playing) return;
  playing = true;

  /* lock controls */
  genBtn.disabled = depthSlider.disabled = widthSlider.disabled = true;

  /* fresh tree + UI */
  state = new GameState(W, D);
  ui    = new UI(svgEl, state);

  agentNode    = state.layers[0][0];
  currentLayer = 1;
  cost         = 0;
  busy         = false;

  costEl.textContent = cost;
  debugEl.textContent = "";
  appendDebug(`New game — width=${W}, depth=${D}`);

  ui.render(currentLayer, agentNode);
  attachClickHandlers();

  /* update depth note in rules panel */
  document.getElementById("depthDisplay").textContent = D;

  // Initialize stat displays
  currentDepthEl.textContent = "0";
  gameCostEl.textContent = "0";
  costHistoryEl.innerHTML = "";
  moveNumber = 0;
}

/* ── attach click behaviour to current layer nodes ───────── */
function attachClickHandlers() {
  ui.nodeG.selectAll("circle").on("click", (event, d) => {
    if (busy || d.depth !== currentLayer) return;
    busy = true;

    /* path & cost */
    const path = state.getPath(agentNode, d, ui.nodeMap);
    const stepCost = path.length - 1;
    cost += stepCost;
    costEl.textContent = cost;
    gameCostEl.textContent = cost; // Update game panel cost
    moveNumber++;
    
    // Add move to history
    const moveItem = document.createElement("li");
    moveItem.textContent = `Move ${moveNumber}: cost ${stepCost}`;
    costHistoryEl.prepend(moveItem); // Add newer moves at the top
    
    appendDebug(`Layer ${d.depth} → node ${d.id}; stepCost=${stepCost}, total=${cost}`);

    ui.flash(path);
    agentNode = d;
    currentLayer++;
    
    // Update current depth display
    currentDepthEl.textContent = currentLayer - 1;

    setTimeout(() => {
      ui.render(currentLayer, agentNode);
      attachClickHandlers();      // re-bind after redraw
      busy = false;

      if (currentLayer === state.depth + 1) endGame();
    }, config.HIGHLIGHT_MS + 50);
  });
}

/* ── game over ───────────────────────────────────────────── */
function endGame() {
  playing = false;
  
  // Set final cost in overlay
  document.getElementById("final-cost").textContent = cost;
  
  // Calculate and display the relative score
  const relativeScore = (cost / config.DEPTH / Math.log(config.WIDTH)).toFixed(2);
  const finalScoreEl = document.getElementById('final-score');
  if (finalScoreEl) {
    finalScoreEl.textContent = relativeScore;
  }
  
  // Auto-fill username from localStorage if available
  if (window.leaderboard) {
    window.leaderboard.autoFillUsername();
  }
  
  // Display the overlay
  const overlay = document.getElementById("overlay");
  overlay.style.display = "flex";
  
  // Wire up the restart button in the overlay
  document.getElementById("restart-btn").onclick = () => {
    overlay.style.display = "none";
    restartGame();
  };
  
  // Re-enable controls
  genBtn.disabled = false;
  depthSlider.disabled = false;
  widthSlider.disabled = false;
  
  appendDebug("Game complete!");
}

/* ── rules panel ─────────────────────────────────────────── */
function updateRules() {
  rulesEl.innerHTML = `
    <h2>Ultrametric Traversal</h2>
    
    <p>Welcome to Ultrametric Traversal, a tree navigation puzzle. You'll move through a randomly generated tree structure one level at a time, starting from the root node (green).</p>
    
    <p>At each step, you can click on any blue node in the current layer. Your goal is to reach the bottom of the tree with the lowest total cost. The cost of each move is determined by the length of the path between your current position and the next node you select.</p>
    
    <p>In a tree, every pair of nodes has a unique common ancestor. The path between two nodes goes up to this common ancestor, then down to the destination. Careful planning of your moves will help minimize your total cost.</p>
    
    <div id="depthNote">Current tree depth: <span id="depthDisplay">15</span></div>
    
    <div class="score-explanation">
      <h3>Leaderboard Score</h3>
      <p>Your leaderboard score is calculated as: <strong>Cost ÷ Depth ÷ log(Width)</strong></p>
      <p>Lower scores are better! This formula allows fair comparison between games with different depths and widths.</p>
    </div>
  `;
}

/* immediately write rules */
updateRules();

/* ── debug & version log helpers ─────────────────────────── */
function appendDebug(msg) {
  const time = new Date().toLocaleTimeString();
  debugEl.textContent += `[${time}] ${msg}\n`;
  debugEl.scrollTop = debugEl.scrollHeight;
}

function renderVersionLog() {
  verHistEl.innerHTML = `
    <strong>Change Log</strong>
    <ul>${config.VERSION_LOG.map(e => `<li><b>${e.v}</b> – ${e.msg}</li>`).join("")}</ul>`;
}

/* ── restart game ────────────────────────────────────────── */
restartBtn.addEventListener("click", restartGame);

function restartGame() {
  playing = false;
  agentNode = null;
  currentLayer = 0;
  cost = 0;
  
  // Clear all SVG elements more thoroughly
  if (ui) {
    ui.nodeG.selectAll("*").remove();
    ui.edgeG.selectAll("*").remove();
    ui.axisG.selectAll("*").remove();
    
    // Force a clean SVG state
    ui.svg.selectAll(".highlight-path").remove();
  }
  
  // Hide the overlay if it's visible
  document.getElementById("overlay").style.display = "none";
  
  // Re-enable controls
  genBtn.disabled = false;
  depthSlider.disabled = false;
  widthSlider.disabled = false;
  
  // Reset display values
  costEl.textContent = "0";
  currentDepthEl.textContent = "0";
  gameCostEl.textContent = "0";
  costHistoryEl.innerHTML = "";
  moveNumber = 0;
  
  // Clear and update debug
  debugEl.textContent = "";
  appendDebug("Game restarted. Click 'Generate' to start a new game.");
}
