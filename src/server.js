const fs = require("fs");
const path = require("path");
const http = require("http");
const express = require("express");
const { WebSocketServer } = require("ws");
const { LINES } = require("./scenarios");
const { createGame, parseChat } = require("./game");
const { connectTwitch } = require("./twitch");

const root = path.join(__dirname, "..");
const configPath = path.join(root, "config.json");
const publicDir = path.join(root, "public");

function loadConfig() {
  const raw = JSON.parse(fs.readFileSync(configPath, "utf8"));
  return {
    channel: String(raw.channel || "").trim(),
    admins: (raw.admins || []).map((name) => String(name).trim().toLowerCase()).filter(Boolean),
    port: Number(raw.port) || 3000,
  };
}

const config = loadConfig();
const game = createGame(LINES);
let chatStatus = config.channel ? "connecting" : "no-channel";

const app = express();
app.use(express.json());
app.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.get("/overlay", (_req, res) => {
  res.sendFile(path.join(publicDir, "overlay.html"));
});

app.get("/try", (_req, res) => {
  res.sendFile(path.join(publicDir, "try.html"));
});

app.get("/api/state", (_req, res) => {
  res.json({ ...game.snapshot(), chat: chatStatus });
});

function isLocal(req) {
  const ip = req.socket.remoteAddress || "";
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

app.post("/dev/chat", (req, res) => {
  if (!isLocal(req)) {
    res.status(403).json({ ok: false });
    return;
  }
  handleChat(String(req.body.user || ""), String(req.body.text || ""));
  res.json({ ok: true, state: game.snapshot() });
});

app.use(express.static(publicDir));

const server = http.createServer(app);
const sockets = new WebSocketServer({ server });

function broadcast() {
  const payload = JSON.stringify({ ...game.snapshot(), chat: chatStatus });
  for (const socket of sockets.clients) {
    if (socket.readyState === 1) socket.send(payload);
  }
}

sockets.on("connection", (socket) => {
  socket.send(JSON.stringify({ ...game.snapshot(), chat: chatStatus }));
});

function handleChat(user, text) {
  const parsed = parseChat(text);
  if (!parsed) return;
  const login = String(user || "").trim().toLowerCase();

  if (parsed.type === "command") {
    if (!config.admins.includes(login)) return;
    if (parsed.command === "cstart") {
      game.start();
      console.log(`[старт] ${login} запустив голосування`);
    } else {
      game.stop();
      console.log(`[стоп] ${login} вимкнув завдання`);
    }
    broadcast();
    return;
  }

  if (game.vote(login, parsed.choice)) broadcast();
}

connectTwitch(config.channel, {
  onMessage: handleChat,
  onStatus(status) {
    chatStatus = status;
    broadcast();
  },
});

setInterval(() => {
  if (game.tick(Date.now())) {
    console.log(`[наказ] ${game.snapshot().active}`);
    broadcast();
  }
}, 200);

server.listen(config.port, "127.0.0.1", () => {
  console.log(`Оверлей: http://127.0.0.1:${config.port}/overlay`);
  console.log(`Перевірка: http://127.0.0.1:${config.port}/try`);
  if (!config.channel) console.log("У config.json порожній channel, чат Twitch не слухаю.");
  if (config.admins.length === 0 || config.admins.includes("your_twitch_nick")) {
    console.log("У config.json вкажи свій нік в admins, інакше cstart і coff ніхто не увімкне.");
  }
});
