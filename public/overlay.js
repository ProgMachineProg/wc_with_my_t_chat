const idleEl = document.querySelector("#idle");
const liveEl = document.querySelector("#live");
const scenarioEl = document.querySelector("#scenario");
const clockEl = document.querySelector("#clock");
const wavesEl = document.querySelector("#waves");
const fillEl = document.querySelector("#timefill");
const optionsEl = document.querySelector("#options");
const activeEl = document.querySelector("#active");
const activeText = document.querySelector("#active-text");

let state = { running: false };
let endsAt = null;
const ROUND_MS = 120000;
let durationMs = ROUND_MS;
let previousVotes = [];
let previousActive = null;

function formatLeft(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes + ":" + String(seconds).padStart(2, "0");
}

function render() {
  if (!state.running) {
    idleEl.hidden = false;
    liveEl.hidden = true;
    endsAt = null;
    previousVotes = [];
    previousActive = null;
    return;
  }
  idleEl.hidden = true;
  liveEl.hidden = false;
  scenarioEl.hidden = !state.scenario;
  scenarioEl.textContent = state.scenario || "";
  const waves = Number(state.waves) || 0;
  const goal = Number(state.waveGoal) || 20;
  wavesEl.textContent = String(waves);
  const goalEl = document.createElement("span");
  goalEl.textContent = "/" + goal;
  wavesEl.append(goalEl);
  endsAt = state.endsAt;
  durationMs = state.durationMs || ROUND_MS;
  const votes = state.options.map((option) => option.votes);
  const top = Math.max(0, ...votes);
  const leaders = votes.filter((count) => count === top && top > 0).length;
  const sameRound = previousVotes.length === votes.length;
  optionsEl.innerHTML = state.options.map((option, index) => {
    const width = top > 0 ? Math.round((option.votes / top) * 100) : 0;
    const lead = top > 0 && option.votes === top && leaders === 1;
    const grew = sameRound && option.votes > (previousVotes[index] || 0);
    return (
      '<li class="option' + (lead ? " lead" : "") + (grew ? " flash" : "") + '">' +
      '<span class="fill" style="width:' + width + '%"></span>' +
      '<span class="num">' + (index + 1) + "</span>" +
      '<span class="text"></span>' +
      '<span class="votes">' + option.votes + "</span>" +
      "</li>"
    );
  }).join("");
  optionsEl.querySelectorAll(".text").forEach((node, index) => {
    node.textContent = state.options[index].text;
  });
  previousVotes = votes;
  activeEl.hidden = false;
  activeText.textContent = state.active || "—";
  if (state.active && state.active !== previousActive) activeEl.classList.add("flash");
  else activeEl.classList.remove("flash");
  previousActive = state.active;
}

function tick() {
  if (endsAt) {
    const left = Math.max(0, endsAt - Date.now());
    const span = Math.max(durationMs, left);
    const ratio = span > 0 ? Math.max(0, Math.min(1, left / span)) : 0;
    clockEl.textContent = formatLeft(left);
    fillEl.style.transform = "none";
    fillEl.style.width = (ratio * 100) + "%";
  }
  requestAnimationFrame(tick);
}

function connect() {
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  const socket = new WebSocket(protocol + "://" + location.host);
  socket.addEventListener("message", (event) => {
    state = JSON.parse(event.data);
    render();
  });
  socket.addEventListener("close", () => {
    setTimeout(connect, 1000);
  });
}

connect();
requestAnimationFrame(tick);
