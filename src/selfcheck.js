const { LINES } = require("./scenarios");
const { createGame, parseChat, ROUND_MS, WAVE_GOAL } = require("./game");

if (LINES.length !== 100) throw new Error("у пулі не 100 рядків");
if (LINES.some((line) => !line || !line.trim())) throw new Error("порожній рядок");
if (LINES[0] !== "Побудувати землянку рівно між шахтою і головною будівлею") {
  throw new Error("старий пул ще в списку");
}

const game = createGame(LINES, () => 0);
if (game.vote("bob", 1)) throw new Error("голос до старту");
game.start();
const first = game.snapshot();
if (!first.running || first.active) throw new Error("старт одразу з наказом");
if (first.scenario) throw new Error("сценарій більше не потрібен");
if (first.options.length !== 3) throw new Error("немає трійки");
if (new Set(first.options.map((option) => option.text)).size !== 3) throw new Error("повтор усередині трійки");
if (first.options[0].text !== LINES[0]) throw new Error("при нульовому рандомі взявся не перший рядок");
if (first.waves !== 0 || first.waveGoal !== WAVE_GOAL) throw new Error("лічильник не з нуля");
game.vote("a", 1);
game.vote("a", 2);
game.vote("b", 2);
const voted = game.snapshot();
if (voted.options[0].votes !== 0 || voted.options[1].votes !== 2) {
  throw new Error("перенесення голосу зламане");
}
game.tick(game.state.endsAt);
const after = game.snapshot();
if (after.active !== LINES[1]) throw new Error("переможець не став");
if (after.waves !== 1) throw new Error("хвиля не порахувалась");
if (after.options[0].votes !== 0) throw new Error("голоси не скинулися");
if (after.options.length !== 3) throw new Error("нова хвилина без трійки");
game.start();
if (game.snapshot().active) throw new Error("рестарт не очистив наказ");
if (game.snapshot().waves !== 0) throw new Error("рестарт не скинув лічильник");
const again = game.snapshot().options.map((option) => option.text).join("|");
if (again !== LINES.slice(0, 3).join("|")) throw new Error("новий запуск не роздав заново");
for (let i = 0; i < 21; i += 1) game.tick(game.state.endsAt);
if (game.snapshot().waves !== 21) throw new Error("лічильник зупинився на 20");
game.stop();
if (game.snapshot().running) throw new Error("coff не вимкнув");

const rolls = [0.99, 0.5, 0.01, 0, 0.4, 0.2, 0.8];
let roll = 0;
const shuffled = createGame(LINES, () => rolls[roll++]);
shuffled.start();
const opened = shuffled.snapshot().options.map((option) => option.text).join("|");
shuffled.tick(shuffled.state.endsAt);
const next = shuffled.snapshot().options.map((option) => option.text).join("|");
if (opened === next) throw new Error("наступна хвилина не перемішалася");
if (new Set(next.split("|")).size !== 3) throw new Error("у новій хвилині повтор");

if (parseChat("  CSTART ").command !== "cstart") throw new Error("cstart");
if (parseChat("coff now").command !== "coff") throw new Error("coff");
if (parseChat("2").choice !== 2) throw new Error("голос");
if (parseChat("привіт")) throw new Error("зайвий розбір");
if (parseChat("13")) throw new Error("13 зарахувалося");

if (ROUND_MS !== 60000) throw new Error("не 60 секунд");

console.log("ok");
console.log("рядків: " + LINES.length);
