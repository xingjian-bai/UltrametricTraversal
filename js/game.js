import { config } from "./config.js";
import { GameState } from "./state.js";
import { UI } from "./ui.js";

const state = new GameState();
const ui = new UI(document.getElementById("canvas"), state);

/* ----- DOM elements ----- */
const scoreEl = document.getElementById("score");
const overlayEl = document.getElementById("overlay");
const rulesEl = document.getElementById("rules");

/* ----- game-runtime vars ----- */
let agentNode = state.layers[0][0];
let currentLayer = 1;
let score = 0;
let isBusy = false;

/* ---------- initial draw ---------- */
writeRules();
ui.render(currentLayer, agentNode);
attachClickHandlers();

/* ---------- functions ---------- */
function attachClickHandlers() {
  ui.nodeGroup
    .selectAll("circle")
    .on("click", (event, d) => {
      if (isBusy || d.depth !== currentLayer) return;
      isBusy = true;

      const path = state.getPath(agentNode, d, ui.nodeMap);
      ui.flashPath(path);

      score += path.length - 1;
      scoreEl.textContent = score;
      agentNode = d;
      currentLayer++;

      setTimeout(() => {
        ui.render(currentLayer, agentNode);
        + attachClickHandlers();   // <-- re-bind listeners
        isBusy = false;
        if (currentLayer === config.DEPTH + 1) endGame();
        }, config.HIGHLIGHT_MS + 100);
    });
}

function endGame() {
  overlayEl.innerHTML = `
    <p>That's it!</p>
    <p>Your score: <strong>${score}</strong></p>
    <button class="button" onclick="location.reload()">Retry</button>`;
  overlayEl.style.display = "flex";
}

function writeRules() {
  rulesEl.innerHTML = `
    <h2>Ultrametric Traversal</h2>
    <h5>Rules of the Game</h5>
    <p>
      You are an <strong>agent</strong> (in green).
      Your goal is to reach the last layer (depth ${config.DEPTH})
      while traversing as few edges as possible. Perfect score is ${config.DEPTH}!
      <br /><br />
      <em>The tree is freshly sampled each round.</em>
    </p>`;
}
