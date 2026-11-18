const tmi = require("tmi.js");

function connectTwitch(channel, handlers) {
  const login = String(channel || "").replace(/^#/, "").trim().toLowerCase();
  if (!login) {
    handlers.onStatus("no-channel");
    return { close() {} };
  }

  const client = new tmi.Client({
    options: { skipUpdatingEmotesets: true },
    connection: { reconnect: true, secure: true },
    channels: [login],
  });

  client.on("message", (_channel, tags, message, self) => {
    if (self) return;
    const user = tags.username || "";
    handlers.onMessage(user, message);
  });

  client.on("connected", () => {
    handlers.onStatus("connected");
    console.log(`[твіч] чат #${login} підключено`);
  });

  client.on("disconnected", () => {
    handlers.onStatus("disconnected");
    console.log("[твіч] зв'язок обірвався, пробую знову");
  });

  client.connect().catch((error) => {
    handlers.onStatus("error");
    console.error("[твіч] не підключився:", error.message);
  });

  return {
    close() {
      client.removeAllListeners();
      client.disconnect().catch(() => {});
    },
  };
}

module.exports = { connectTwitch };
