/* Normaliza plataformas e gêneros do banco (`data/trespordez.sqlite`).
 * USO: node scripts/backlog-normalize.mjs        # dry-run
 *      node scripts/backlog-normalize.mjs --apply # grava as mudanças
 *
 * Plataformas: mapa direto de aliases → canônico.
 * Gêneros: tokens separados por vírgula e barra (árvores Backloggery),
 *   normalizados por vocabulário canônico → lista deduplicada unida por ", ".
 *   Tokens sem mapeamento caem em "Various" e são reportados para revisão.
 */
import { openDb } from "./backlog-lib.mjs";

export const PLATFORM_MAP = {
  "32x": "32X",
  "MS-DOS": "DOS",
  "GameBoy": "Game Boy",
  "GameBoyColor": "Game Boy Color",
  "MasterSystem": "Master System",
  "MegaDrive": "Mega Drive",
  "NeoGeo": "Neo Geo",
  "NeoGeo CD": "Neo Geo CD",
  "Playstation": "PlayStation",
  "Scumm": "SCUMM",
  "SegaCD": "Sega CD",
  "FanGames": "Homebrew",
  "OpenSource": "Open Source",
  "VirtualBoy": "Virtual Boy",
  "EA app": "EA App",
};

const squash = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

const CANON = [
  "platformer",
  "action",
  "adventure",
  "action-adventure",
  "rpg",
  "jrpg",
  "tactical-rpg",
  "shooter",
  "fps",
  "run-and-gun",
  "shoot-em-up",
  "rail-shooter",
  "lightgun",
  "beat-em-up",
  "fighting",
  "racing",
  "sports",
  "puzzle",
  "strategy",
  "simulation",
  "arcade",
  "point-and-click",
  "stealth",
  "horror",
  "metroidvania",
  "roguelike",
  "survival",
  "rhythm",
  "music",
  "visual-novel",
  "sandbox",
  "card-game",
  "board-game",
  "educational",
  "pinball",
  "compilation",
  "moba",
  "party",
  "casual",
  "various",
];
const CANON_KEY = new Set(CANON.map(squash));

/** Token squashed → gênero(s) canônico(s). Cobre os aliases/compostos reais do banco. */
const TOKEN_CANON = {
  // Platform
  "platform": ["platformer"],
  "plataforma": ["platformer"],
  "platformplatform": ["platformer"],
  "platformerplatform": ["platformer"],
  "runjump": ["platformer"],
  "runjumpplatform": ["platformer"],
  "runjumpscrolling": ["platformer"],
  "runjumpplatform": ["platformer"],
  "runjumpscrollingplatform": ["platformer"],
  "runjumpscrollingplatformadventure": ["platformer", "adventure"],
  "scrollingplatform": ["platformer"],
  "correepulaplataforma": ["platformer"],
  "horizontal": ["platformer"],
  "runandgunplataformaplataforma": ["run-and-gun", "platformer"],
  "platformaction": ["platformer", "action"],
  "actionplatform": ["platformer", "action"],
  "platformactionplatform": ["platformer", "action"],
  "platformshooter": ["run-and-gun"],
  "platformshootemupaction": ["platformer", "shoot-em-up", "action"],
  "platformcasualgame": ["platformer", "casual"],
  "platformroleplayinggames": ["platformer", "rpg"],
  "platformcompilation": ["platformer", "compilation"],
  "platformadventure": ["platformer", "adventure"],
  "puzzleplatform": ["puzzle", "platformer"],
  "puzzlegameplatform": ["puzzle", "platformer"],
  "platformsports": ["platformer", "sports"],
  "musicanddancingplatform": ["music", "platformer"],
  "compilationplatformplatform": ["compilation", "platformer"],
  "actionadventureplatform": ["action-adventure", "platformer"],
  "fighterscrollingplatform": ["beat-em-up", "platformer"],
  "shooterscrollingplatform": ["shooter", "platformer"],
  "horizontalplataformaplataforma": ["platformer"],
  "adventureplatform": ["adventure", "platformer"],
  // Action
  "acao": ["action"],
  "actionaction": ["action"],
  "actionshooter": ["action", "shooter"],
  "actionshootemup": ["action", "shoot-em-up"],
  "actionbeatemup": ["beat-em-up"],
  "actionfighting": ["fighting"],
  "actioncompilation": ["action", "compilation"],
  "actionquiz": ["action", "puzzle"],
  "actionpinball": ["pinball"],
  "actionsports": ["action", "sports"],
  "actionvariousadventurecompilation": ["action", "adventure", "compilation"],
  "actionfight": ["fighting"],
  "actionrpg": ["action-rpg"],
  "actionrpgroleplayinggame": ["action-rpg"],
  "actionrpgadventureroleplayinggame": ["action-rpg", "adventure"],
  "actionshooter": ["action", "shooter"],
  "adventureadventureaction": ["adventure", "action"],
  "simulationactionplatform": ["simulation", "action", "platformer"],
  "shooteractionplatform": ["shooter", "action", "platformer"],
  "fpvactionshooter": ["fps"],
  "adventureaction": ["action-adventure"],
  "adventureactionroleplayinggame": ["action-adventure", "rpg"],
  "adventureroleplayinggamesaction": ["action-adventure", "rpg"],
  "actionadventure": ["action-adventure"],
  "aventuraacao": ["action-adventure"],
  "adventureactionplayingcards": ["card-game", "adventure"],
  // RPG
  "roleplayinggame": ["rpg"],
  "roleplayinggames": ["rpg"],
  "roleplayingrpg": ["rpg"],
  "jogosderpg": ["rpg"],
  "roleplayinggamestrategy": ["rpg", "strategy"],
  "roleplayinggameshooter": ["rpg", "shooter"],
  "roleplayinggameadventure": ["rpg", "adventure"],
  "roleplayinggameplatform": ["rpg", "platformer"],
  "roleplayinggamehuntingandfishing": ["rpg", "sports"],
  "mmorpgroleplayinggame": ["rpg"],
  "dungeoncrawlerrpgroleplayinggame": ["rpg"],
  "partybasedrpgroleplayinggame": ["rpg", "party"],
  "japaneserpgroleplayinggame": ["jrpg"],
  "roleplayinggamesactionrpg": ["action-rpg"],
  "roleplayinggamesstrategytacticalrpg": ["strategy", "tactical-rpg"],
  "roleplayinggamestacticalrpg": ["tactical-rpg"],
  "rpgtacticojogosderpg": ["tactical-rpg"],
  "tacticalrpgroleplayinggame": ["tactical-rpg"],
  "strategytacticalrpg": ["strategy", "tactical-rpg"],
  "footballsoccersportsroleplayinggame": ["sports", "rpg"],
  "dungeoncrawlerrpgroleplayinggame": ["rpg"],
  "roleplayinggamesvarious": ["rpg"],
  "adventureroleplayinggame": ["adventure", "rpg"],
  "pinballroleplayinggame": ["pinball", "rpg"],
  "boardgameroleplayinggame": ["board-game", "rpg"],
  "puzzleroleplayinggame": ["puzzle", "rpg"],
  "simulationroleplayinggame": ["simulation", "rpg"],
  "runandgunroleplayinggameshooter": ["run-and-gun", "rpg"],
  "tactical": ["tactical-rpg"],
  // Shooter / FPS / Shmup
  "tiro": ["shooter"],
  "tirotiro": ["shooter"],
  "tiroem1pessoatiro": ["fps"],
  "tiroem3pessoatiro": ["shooter"],
  "tirocomrolagem": ["shooter"],
  "tirocomlightgun": ["lightgun"],
  "1stpersonshooter": ["fps"],
  "firstpersonshooter": ["fps"],
  "fpp": ["fps"],
  "fpv": ["fps"],
  "fpvshooter": ["fps"],
  "tpvshooter": ["shooter"],
  "3rdpersonshooter": ["shooter"],
  "carro3pessoatiro": ["shooter"],
  "carro1pessoatiro": ["fps"],
  "shootershooter": ["shooter"],
  "shooterracing": ["shooter", "racing"],
  "verticalshooter": ["shoot-em-up"],
  "planishooter": ["shoot-em-up"],
  "spaceinvaderslikeshooter": ["shoot-em-up"],
  "spaceinvaderslikeshootershootemup": ["shoot-em-up"],
  "shootemup": ["shoot-em-up"],
  "shootemupshootemup": ["shoot-em-up"],
  "verticalshootemup": ["shoot-em-up"],
  "horizontalshootemup": ["shoot-em-up"],
  "verticalshootershootemupaction": ["shoot-em-up"],
  "shootemupactionshootemup": ["shoot-em-up"],
  "shootemupaction": ["shoot-em-up"],
  "lightgunshootershootemup": ["lightgun"],
  "lightgunshootershooter": ["lightgun"],
  "horizontal": ["platformer"],
  "vertical": ["shoot-em-up"],
  "railshooter": ["rail-shooter"],
  "runandgun": ["run-and-gun"],
  "runandgunshooter": ["run-and-gun"],
  "runandgunshootemupshooter": ["run-and-gun"],
  "runandgunshootemupshootemup": ["run-and-gun"],
  "adventureshooter": ["adventure", "shooter"],
  // Fighting / Beat'em up
  "beatemup": ["beat-em-up"],
  "beatemupaction": ["beat-em-up"],
  "hackandslash": ["beat-em-up"],
  "fighterscrolling": ["beat-em-up"],
  "vs": ["fighting"],
  "versus": ["fighting"],
  "versusfighting": ["fighting"],
  "versusfightingaction": ["fighting"],
  "versusluta": ["fighting"],
  "luta": ["fighting"],
  "fight": ["fighting"],
  "fightaction": ["fighting"],
  "fightcompilationaction": ["fighting", "compilation"],
  "2dfighting": ["fighting"],
  "3dluta": ["fighting"],
  "brigaderua": ["fighting"],
  "combateesporte": ["fighting"],
  "sportsactionfightfight": ["sports", "fighting"],
  // Racing
  "race": ["racing"],
  "driving": ["racing"],
  "corrida": ["racing"],
  "pilotagem": ["racing"],
  "racingtpvracing": ["racing"],
  "drivingracingtpv": ["racing"],
  "nauticocorrida": ["racing"],
  "corridaem3pessoacorrida": ["racing"],
  "vehicle": ["racing"],
  "motorcycleracetpvracing": ["racing"],
  "drivingmotorcyclerace": ["racing"],
  "horizontalshootemupshooteraction": ["shoot-em-up", "shooter"],
  // Sports
  "sport": ["sports"],
  "sportssports": ["sports"],
  "esporte": ["sports"],
  "esporteesporte": ["sports"],
  "futebolesporte": ["sports"],
  "futebolamericanoesporte": ["sports"],
  "boxeesporte": ["sports"],
  "golfeesporte": ["sports"],
  "skateesporte": ["sports"],
  "esquiesporte": ["sports"],
  "tenisesporte": ["sports"],
  "lutalivreesporte": ["sports"],
  "footballsoccersports": ["sports"],
  "baseballsports": ["sports"],
  "basketballsports": ["sports"],
  "tennissports": ["sports"],
  "golfsports": ["sports"],
  "hockeysports": ["sports"],
  "boxingsports": ["sports"],
  "footballamericansports": ["sports"],
  "rugbysports": ["sports"],
  "volleyballsports": ["sports"],
  "multisportssports": ["sports"],
  "cyclingsports": ["sports"],
  "skiingsports": ["sports"],
  "sumosports": ["sports"],
  "sumosportsfighting": ["sports"],
  "sportswithanimalshorseracing": ["sports"],
  "dodgeballfightingsports": ["sports"],
  "wrestlingfightingsports": ["sports"],
  "sportsracing": ["sports", "racing"],
  "sportsfighting": ["sports", "fighting"],
  "poolsports": ["sports"],
  "pool": ["sports"],
  "baseball": ["sports"],
  "soccer": ["sports"],
  "football": ["sports"],
  "golf": ["sports"],
  "hockey": ["sports"],
  "basketball": ["sports"],
  "tennis": ["sports"],
  "tabletennis": ["sports"],
  "drivingsimulationsports": ["simulation", "sports"],
  "drivingsportssports": ["racing", "sports"],
  "actionsportssports": ["action", "sports"],
  "musicanddancingsports": ["music", "sports"],
  "sportswithanimalssimulation": ["simulation"],
  "skateboardactionsports": ["action", "sports"],
  "skateboardsportsracing": ["sports", "racing"],
  "rugby": ["sports"],
  // Puzzle
  "puzzlegame": ["puzzle"],
  "puzzlegamestrategy": ["puzzle", "strategy"],
  "puzzlegamepuzzlegame": ["puzzle"],
  "puzzlegameactionrpgaction": ["puzzle", "action-rpg"],
  "puzzlegamesimulation": ["puzzle", "simulation"],
  "puzzlestrategy": ["puzzle", "strategy"],
  "puzzleadventure": ["puzzle", "adventure"],
  "puzzleaction": ["puzzle", "action"],
  "fall": ["puzzle"],
  "fallpuzzle": ["puzzle"],
  "fallpuzzlestrategy": ["puzzle", "strategy"],
  "fallpuzzlecompilation": ["puzzle", "compilation"],
  "throwpuzzle": ["puzzle"],
  "quebracabecas": ["puzzle"],
  "quebracabecasacao": ["puzzle", "action"],
  "quedaquebracabecas": ["puzzle"],
  "estrategiaquebracabecas": ["strategy", "puzzle"],
  "quiz": ["puzzle"],
  "trivia": ["puzzle"],
  // Strategy
  "turnbasedstrategytbs": ["strategy"],
  "realtimestrategyrts": ["strategy"],
  "strategyadventure": ["strategy", "adventure"],
  "strategyroleplayinggame": ["strategy", "rpg"],
  "strategypuzzle": ["strategy", "puzzle"],
  "strategyroleplayinggame": ["strategy", "rpg"],
  "strategystrategy": ["strategy"],
  // Simulation
  "simulator": ["simulation"],
  "managerial": ["simulation"],
  "building": ["simulation"],
  "life": ["simulation"],
  "lifesimulation": ["simulation"],
  "buildandmanagementsimulation": ["simulation"],
  "buildandmanagementsimulationbuildandmanagementsimulationpuzzle": ["simulation", "puzzle"],
  "varioussimulation": ["simulation"],
  "musicanddancingsimulation": ["music"],
  "simulationadventure": ["simulation", "adventure"],
  // Adventure
  "aventura": ["adventure"],
  "adventurecasualgame": ["adventure", "casual"],
  "adventuremusicanddancing": ["adventure", "music"],
  "detectivemystery": ["adventure"],
  "exploration": ["adventure"],
  "survivalhorroraventura": ["horror", "survival"],
  "survivalhorroradventure": ["horror", "survival"],
  // Horror / Stealth / Survival
  "horror": ["horror"],
  "survivalhorrorescape": ["horror", "survival"],
  // P&C / VN
  "pointandclickadventure": ["point-and-click"],
  "pointandclick": ["point-and-click"],
  "visualnovel": ["visual-novel"],
  "visualnoveladventure": ["visual-novel", "adventure"],
  "visualnovelpuzzleadventure": ["visual-novel", "puzzle", "adventure"],
  "visualnovelsimulationadventure": ["visual-novel", "simulation", "adventure"],
  "interactivefiction": ["visual-novel"],
  // Music / Rhythm
  "musicanddancing": ["music"],
  "musicanddancersimulation": ["music"],
  "musicanddancerhythm": ["music"],
  "musicmusicanddancingvarious": ["music"],
  "musicanddancestrategyrhythm": ["music", "strategy"],
  "rhythmmusicanddancing": ["rhythm"],
  "ritmicomusicaedanca": ["music"],
  "rhymemusical": ["music"],
  "rhyme": ["music"],
  // Card / Board
  "cardboardgame": ["board-game"],
  "cardgame": ["card-game"],
  "playingcards": ["card-game"],
  "playingcardscasino": ["card-game"],
  "casino": ["card-game"],
  "mahjongasiaticboardgame": ["board-game"],
  "shougiasiaticboardgame": ["board-game"],
  "goasiaticboardgame": ["board-game"],
  "hanafudaasiaticboardgame": ["board-game"],
  "asiaticboardgame": ["board-game"],
  "asiaticboardgamemahjong": ["board-game"],
  "othelloboardgameasiaticboardgame": ["board-game"],
  "adultsmahjongasiaticboardgame": ["board-game"],
  "casinoboardgame": ["board-game", "card-game"],
  "boardgame": ["board-game"],
  // Various / misc
  "various": ["various"],
  "variation": ["various"],
  "variouseducational": ["educational"],
  "varioussimulation": ["simulation"],
  "adventurevarious": ["adventure"],
  "educationalvarious": ["educational"],
  "adventureactionvarious": ["action-adventure"],
  "platformcasualgame": ["platformer", "casual"],
  "casualgame": ["casual"],
  "quizeducational": ["educational"],
  "unofficial": ["various"],
  "2d": ["various"],
  "compilation": ["compilation"],
  "compilationaction": ["compilation", "action"],
  "compilationpuzzle": ["compilation", "puzzle"],
  "moba": ["moba"],
  "party": ["party"],
  "openworld": ["sandbox"],
  "rulemaking": ["board-game"],
  "strategy": ["strategy"],
  // Leftovers reais do banco
  "indie": ["indie"],
  "roleplaying": ["rpg"],
  "3rdpers": ["shooter"],
  "drivingrace3rdpersview": ["racing"],
  "fishinghuntingandfishing": ["sports"],
  "labyrinth": ["puzzle"],
  "labirintoacao": ["action"],
  "plane": ["simulation"],
  "realtime": ["strategy"],
};

/** Tons/contextos que não são gênero — descartados, não viram "Various". */
const SKIP_TOKEN = new Set(["comedy", "fantasy", "historical", "scifi"]);

/** Específico presente → remove o genérico irmão. */
const SOAK = new Map([
  ["action-adventure", "action"],
  ["action-rpg", "rpg"],
]);

const VOCAB_KEY = [...CANON_KEY]
  .map((k) => ({ k, len: k.length }))
  .sort((a, b) => b.len - a.len);

export function normalizeGenre(genre) {
  if (genre == null) return genre;
  const tokens = String(genre)
    .split(",")
    .flatMap((raw) => String(raw).split("/"))
    .map((s) => s.trim())
    .filter(Boolean);
  let out = [];
  const leftover = [];
  for (const token of tokens) {
    const key = squash(token);
    if (!key) continue;
    if (SKIP_TOKEN.has(key)) continue;
    let canon = TOKEN_CANON[key];
    if (!canon && CANON_KEY.has(key)) canon = [CANON.find((c) => squash(c) === key)];
    if (!canon) {
      const hit = VOCAB_KEY.find(({ k }) => key.includes(k));
      canon = hit ? [CANON.find((c) => squash(c) === hit.k)] : null;
    }
    if (!canon) {
      leftover.push(token);
      continue;
    }
    for (const g of canon) if (!out.includes(g)) out.push(g);
  }
  for (const [spec, generic] of SOAK) {
    if (out.includes(spec)) out = out.filter((g) => g !== generic);
  }
  if (!out.length && !leftover.length) return genre;
  if (out.length && leftover.length) out.push("various");
  return out.length ? out.join(", ") : "Varios";
}

export function normalizePlatform(platform) {
  if (platform == null) return platform;
  return PLATFORM_MAP[platform] || platform;
}

function report(rows) {
  const platforms = new Map();
  const genres = new Map();
  const leftoverSet = new Set();
  let platformChanges = 0;
  let genreChanges = 0;
  for (const row of rows) {
    const p = normalizePlatform(row.platform);
    if (p !== row.platform) platformChanges++;
    platforms.set(p === null ? "(vazio)" : p, (platforms.get(p === null ? "(vazio)" : p) || 0) + 1);
    const g = normalizeGenre(row.genre);
    if (g !== row.genre) genreChanges++;
    if (g !== null) genres.set(g, (genres.get(g) || 0) + 1);
    const rem = unusedTokens(row.genre);
    rem.forEach((t) => leftoverSet.add(t));
  }
  return { platforms, genres, leftoverSet, platformChanges, genreChanges };
}

function unusedTokens(genre) {
  if (genre == null) return [];
  return String(genre)
    .split(",")
    .flatMap((raw) => String(raw).split("/"))
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((token) => {
      const key = squash(token);
      if (!key) return false;
      if (TOKEN_CANON[key] || CANON_KEY.has(key)) return false;
      return !VOCAB_KEY.some(({ k }) => key.includes(k));
    });
}

export function main(db, apply) {
  const rows = db.prepare("SELECT id, platform, genre FROM backlog_items").all();
  const { platforms, genres, leftoverSet, platformChanges, genreChanges } = report(rows);
  console.log(`plataformas distintas: antes → depois (${[...platforms].length} valores canônicos)`);
  console.log(`mudanças: ${platformChanges} plataformas, ${genreChanges} gêneros`);
  console.log("\nvocabulário de gênero (canônico × itens):");
  for (const [g, c] of [...genres.entries()].sort((a, b) => b[1] - a[1])) console.log(`${String(c).padStart(5)}  ${g}`);
  console.log("\ntokens sem mapeamento:", leftoverSet.size);
  for (const t of [...leftoverSet].sort()) console.log(`   → ${t}`);

  if (!apply) {
    console.log("\n(dry-run — rode com --apply para gravar)");
    return;
  }
  const upP = db.prepare("UPDATE backlog_items SET platform = ? WHERE id = ?");
  const upG = db.prepare("UPDATE backlog_items SET genre = ? WHERE id = ?");
  let n = 0;
  for (const row of rows) {
    const p = normalizePlatform(row.platform);
    const g = normalizeGenre(row.genre);
    if (p !== row.platform) upP.run(p, row.id);
    if (g !== row.genre) upG.run(g, row.id);
    if (p !== row.platform || g !== row.genre) n++;
  }
  console.log(`\ngravou ${n} linhas`);
}

const run = process.argv[1] && process.argv[1].endsWith("backlog-normalize.mjs");
if (run) {
  const apply = process.argv.includes("--apply");
  const db = openDb();
  main(db, apply);
}