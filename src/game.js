const ROUND_MS = 3 * 60 * 1000;
const WAVE_GOAL = 10;

function emptyCounts() {
  return [0, 0, 0];
}

function pickOptions(lines, rng) {
  const pool = lines.slice();
  const picked = [];
  const used = new Set();
  while (picked.length < 3 && pool.length > 0) {
    const index = Math.floor(rng() * pool.length);
    const line = pool.splice(index, 1)[0];
    if (used.has(line)) continue;
    used.add(line);
    picked.push(line);
  }
  return picked;
}

function createGame(lines, random) {
  const rng = random || Math.random;
  const game = {
    lines,
    running: false,
    options: [],
    endsAt: 0,
    votes: new Map(),
    counts: emptyCounts(),
    active: null,
    waves: 0,
  };

  function clearVotes() {
    game.votes = new Map();
    game.counts = emptyCounts();
  }

  function currentOptions() {
    if (!game.running) return [];
    return game.options;
  }

  function deal() {
    game.options = pickOptions(game.lines, rng);
  }

  function start() {
    game.running = true;
    game.active = null;
    game.waves = 0;
    game.endsAt = Date.now() + ROUND_MS;
    clearVotes();
    deal();
  }

  function stop() {
    game.running = false;
    game.options = [];
    game.active = null;
    game.waves = 0;
    game.endsAt = 0;
    clearVotes();
  }

  function vote(user, choice) {
    if (!game.running) return false;
    if (choice < 1 || choice > 3) return false;
    const name = String(user || "").toLowerCase();
    if (!name) return false;
    const previous = game.votes.get(name);
    if (previous === choice) return false;
    if (previous) game.counts[previous - 1] -= 1;
    game.votes.set(name, choice);
    game.counts[choice - 1] += 1;
    return true;
  }

  function finishRound(now) {
    const options = currentOptions();
    const top = Math.max(game.counts[0], game.counts[1], game.counts[2]);
    const leaders = [0, 1, 2].filter((index) => game.counts[index] === top);
    const winner = leaders[Math.floor(rng() * leaders.length)];
    game.active = options[winner];
    game.waves += 1;
    deal();
    clearVotes();
    game.endsAt += ROUND_MS;
    if (now - game.endsAt > ROUND_MS) game.endsAt = now + ROUND_MS;
  }

  function tick(now) {
    if (!game.running) return false;
    const moment = now || Date.now();
    if (moment < game.endsAt) return false;
    let changed = false;
    let guard = 0;
    while (game.running && moment >= game.endsAt && guard < 5) {
      finishRound(moment);
      changed = true;
      guard += 1;
    }
    return changed;
  }

  function snapshot(now) {
    const moment = now || Date.now();
    if (!game.running) {
      return {
        running: false,
        scenario: null,
        endsAt: null,
        durationMs: ROUND_MS,
        options: [],
        active: null,
        waves: 0,
        waveGoal: WAVE_GOAL,
      };
    }
    return {
      running: true,
      scenario: null,
      endsAt: game.endsAt,
      durationMs: ROUND_MS,
      secondsLeft: Math.max(0, Math.ceil((game.endsAt - moment) / 1000)),
      options: currentOptions().map((text, index) => ({
        text,
        votes: game.counts[index],
      })),
      active: game.active,
      waves: game.waves,
      waveGoal: WAVE_GOAL,
    };
  }

  return { start, stop, vote, tick, snapshot, state: game };
}

function parseChat(text) {
  const trimmed = String(text || "").trim().toLowerCase();
  if (!trimmed) return null;
  const word = trimmed.split(/\s+/)[0];
  if (word === "cstart" || word === "coff") return { type: "command", command: word };
  if (trimmed === "1" || trimmed === "2" || trimmed === "3") {
    return { type: "vote", choice: Number(trimmed) };
  }
  return null;
}

module.exports = {
  ROUND_MS,
  WAVE_GOAL,
  createGame,
  parseChat,
};
