/****************************************************************
 * game.js — orchestration layer: state ↔ UI ↔ user input
 ****************************************************************/
import { config }   from "./config.js";
import { GameState } from "./state.js";
import { UI }       from "./ui.js";

/* ----- DOM handles ----- */
const svgEl       = document.getElementById("canvas");
const scoreEl     = document.getElementById("score");
const versionEl   = document.getElementById("version");
const overlayEl   = document.getElementById("overlay");
const rulesEl     = document.getElementById("rules");
const depthSlider = document.getElementById("depthSlider");
const widthSlider = document.getElementById("widthSlider");
const depthVal    = document.getElementById("depthVal");
const widthVal    = document.getElementById("widthVal");
const genBtn      = document.getElementById("generateBtn");
const debugEl     = document.getElementById("debug");

/* ----- initialisation ----- */
let state, ui;
let agentNode, currentLayer, score, busy, playing=false;

depthSlider.oninput = () => depthVal.textContent = depthSlider.value;
widthSlider.oninput = () => widthVal.textContent = widthSlider.value;
genBtn.onclick      = () => startNewGame(+widthSlider.value, +depthSlider.value);

versionEl.textContent = `Version ${config.VERSION}`;
writeRules();
appendDebug("Ready – choose parameters and click Generate.");

/* ========================================================== */
function startNewGame(W, D) {
  if (playing) return;               // guard
  playing = true;
  genBtn.disabled = true;            // lock controls
  depthSlider.disabled = widthSlider.disabled = true;

  /* build fresh tree ----------------------------------------------------- */
  state = new GameState(W, D);
  ui    = new UI(svgEl, state);

  /* reset runtime vars --------------------------------------------------- */
  agentNode    = state.layers[0][0];
  currentLayer = 1;
  score        = 0;
  busy         = false;

  scoreEl.textContent = 0;
  debugEl.textContent = "";
  appendDebug(`New game: width=${W}, depth=${D}`);

  ui.render(currentLayer, agentNode);
  attachClickHandlers();
}

/* ---------------------------------------------------------------------- */
function attachClickHandlers() {
  ui.nodeG.selectAll("circle").on("click", (event, d) => {
    if (busy || d.depth !== currentLayer) return;
    busy = true;

    const path  = state.getPath(agentNode, d, ui.nodeMap);
    score += path.length - 1;
    scoreEl.textContent = score;
    appendDebug(`Click depth ${d.depth}  node ${d.id};  pathLen=${path.length-1}  score=${score}`);

    ui.flashPath(path);
    agentNode = d;
    currentLayer++;

    setTimeout(() => {
      ui.render(currentLayer, agentNode);
      attachClickHandlers();   // rebind after redraw
      busy = false;

      if (currentLayer === state.depth + 1) endGame();
    }, config.HIGHLIGHT_MS + 50);
  });
}

/* ---------------------------------------------------------------------- */
function endGame() {
  appendDebug("Game over.");
  overlayEl.innerHTML = `
    <p>That's it!</p>
    <p>Your score: <strong>${score}</strong></p>
    <button class="button" onclick="location.reload()">Restart Page</button>
  `;
  overlayEl.style.display = "flex";
  playing = false;
  genBtn.disabled = depthSlider.disabled = widthSlider.disabled = false;
}

/* ---------------------------------------------------------------------- */
function writeRules() {
  rulesEl.innerHTML = `
    <h2>Ultrametric Traversal</h2>
    <p>
      Choose <em>depth</em> and <em>width</em>, click <strong>Generate</strong>, then
      reach the last layer using as few edges as possible. Green = your current node,
      blue = selectable nodes in current layer, yellow = visited.
    </p>`;
}

/* ---------------------------------------------------------------------- */
function appendDebug(msg) {
  const time = new Date().toLocaleTimeString();
  debugEl.textContent += `[${time}] ${msg}\n`;
  debugEl.scrollTop = debugEl.scrollHeight;
}
