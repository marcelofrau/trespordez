// Import favorites do EmulationStation (ES-DE/Skraper) para o catalog do
// backlog. Varre um root (default E:\) atrás de gamelist.xml, ignora sistemas
// de arcade e pega somente os jogos com <favorite>true</favorite>. Cada favorito
// vira um item do catalog com:
//   - platform: mapeada para o vocabulário do site (mapa abaixo) ou o nome da
//     pasta de sistema quando não mapeado
//   - genre: <genre> do gamelist
//   - added_at: creation time (Windows) do arquivo de ROM — o gamelist.xml não
//     carrega "date added", e o sort por data do ES-DE usa a criação do arquivo
// Itens que já existem no backlog (nome normalizado, sem ruído de ROM) são
// ignorados — nada de duplicata.
//
// Uso:
//   node scripts/es-gamelist-import.mjs                  # dry-run
//   node scripts/es-gamelist-import.mjs --apply           # insere no sqlite
//   node scripts/es-gamelist-import.mjs --root D:\roms    # outro root
//   node scripts/es-gamelist-import.mjs --json out.json   # grava lista p/ review
// Depois de aplicar: node scripts/backlog-export.mjs

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { openDb, appendItems } from "./backlog-lib.mjs";
import { norm, stripNoise } from "./gamenorm.mjs";

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const HELP = argv.includes("--help") || argv.includes("-h");
const PLAYER = "the-archivist";

const flag = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : null;
};
const ROOT = flag("--root") || "E:";
const JSON_OUT = flag("--json");

const USAGE = `es-gamelist-import: favoritos do EmulationStation no catalog

  node scripts/es-gamelist-import.mjs [--apply] [--root E:\\] [--json arq.json]

  --apply    insere no sqlite (default: dry-run)
  --root     pasta raiz das coleções (default: E:\\)
  --json     grava a lista de inserções em JSON para revisão
  Ignora pastas arcade/mame. Dedupe por nome (sem ruído de ROM).`;

if (HELP) {
  console.log(USAGE);
  process.exit(0);
}

// Nome da pasta de sistema (top-level do root) -> plataforma do site.
const PLAT_BY_TOP = {
  "Atari 2600": "Atari 2600",
  "Atari 5200": "Atari 5200",
  "Atari 7800": "Atari 7800",
  "Atari Jaguar": "Atari Jaguar",
  "Atari Lynx": "Atari Lynx",
  "Commodore 64": "Commodore 64",
  "Commodore Amiga CD32": "Amiga CD32",
  "Commodore Vic-20": "VIC-20",
  "Microsoft MSX": "MSX",
  "Microsoft Xbox": "Xbox",
  "Microsoft Xbox 360": "Xbox 360",
  "NEC SuperGraFX": "SuperGrafx",
  "NEC TurboGraFX-16": "PC Engine",
  "Nintendo 3DS": "3DS",
  "Nintendo 64": "N64",
  "Nintendo DS": "DS",
  "Nintendo GameBoy": "GameBoy",
  "Nintendo GameBoy Advance": "GBA",
  "Nintendo Gamecube": "GC",
  "Nintendo NES": "NES",
  "Nintendo SNES": "SNES",
  "Nintendo Switch": "Switch",
  "Nintendo VirtualBoy": "VirtualBoy",
  "Nintendo Wii": "Wii",
  "Nintendo WiiU": "Wii U",
  "Panasonic 3DO": "3DO",
  "PC": "DOS",
  "Phillips CDi": "CD-i",
  "Pico 8": "PICO-8",
  "Sega 32x": "32x",
  "Sega CD": "SegaCD",
  "Sega Dreamcast": "Dreamcast",
  "Sega Game Gear": "Game Gear",
  "Sega Genesis": "MegaDrive",
  "Sega Master System": "MasterSystem",
  "Sega Saturn": "Saturn",
  "Sharp X68000": "X68000",
  "SNK Neo Geo": "NeoGeo",
  "SNK Neo Geo CD": "NeoGeo CD",
  "SNK Neo Geo Pocket": "Neo Geo Pocket",
  "Sony Playstation": "PS1",
  "Sony Playstation 2": "PS2",
  "Sony Playstation 3": "PS3",
  "Sony PSP": "PSP",
};

function findGamelists(root) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (/arcade|mame/i.test(e.name) || e.name.startsWith("_") || e.name.startsWith(".")) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && e.name.toLowerCase() === "gamelist.xml") out.push(p);
    }
  };
  walk(resolve(root));
  return out;
}

function platformFor(gamelistPath) {
  const rel = resolve(gamelistPath)
    .replace(resolve(ROOT), "")
    .replace(/[\\/]+/g, "/")
    .replace(/^\//, "");
  const segs = rel.split("/");
  const top = segs[0] || "";
  const rest = segs.slice(1, -1).join("/").toLowerCase();
  let p = PLAT_BY_TOP[top];
  if (!p) p = top;
  if (top === "Nintendo GameBoy" && rest.includes("gbc")) p = "GameBoyColor";
  if (top === "PC" && rest.includes("flash")) p = "Flash";
  return p;
}

function decodeXml(s) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function parseGamelist(file) {
  let xml;
  try {
    xml = readFileSync(file, "utf8");
  } catch {
    return [];
  }
  const games = [];
  const re = /<game\b[^>]*>([\s\S]*?)<\/game>/g;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const tag = (name) => {
      const r = new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`);
      const hit = r.exec(block);
      return hit ? decodeXml(hit[1]) : null;
    };
    const fav = (tag("favorite") || "").trim().toLowerCase();
    if (fav !== "true") continue;
    const path = tag("path") || "";
    const name = (tag("name") || "").trim() || basename(path);
    const genre = (tag("genre") || "").replace(/\s+/g, " ").trim() || null;
    games.push({ file, path, name, genre });
  }
  return games;
}

// Creation time (Windows) do arquivo de ROM = quando entrou na coleção.
function romAdded(file, relPath) {
  const abs = resolve(dirname(file), relPath.replace(/^\.\/+/, ""));
  try {
    const s = statSync(abs);
    return s.birthtime ? s.birthtime.toISOString().slice(0, 10) : null;
  } catch {
    return null;
  }
}

function main() {
  const gamelists = findGamelists(ROOT);
  if (!gamelists.length) {
    console.error(`Nenhum gamelist.xml encontrado em ${ROOT}`);
    process.exit(1);
  }

  const byPlatform = new Map();
  const favorites = [];
  for (const gl of gamelists) {
    const platform = platformFor(gl);
    for (const g of parseGamelist(gl)) {
      favorites.push({ ...g, platform });
      byPlatform.set(platform, (byPlatform.get(platform) || 0) + 1);
    }
  }

  const db = openDb();
  const existing = db
    .prepare(
      "SELECT name FROM backlog_items WHERE player_key = ? AND section IN ('backlog', 'catalog')"
    )
    .all(PLAYER);
  const known = new Set();
  for (const r of existing) {
    const n = norm(r.name);
    if (n) known.add(n);
    const sn = norm(stripNoise(r.name));
    if (sn) known.add(sn);
  }

  const seen = new Set();
  const inserts = [];
  for (const g of favorites) {
    const key = norm(stripNoise(g.name)) || norm(g.name);
    if (!key || known.has(key) || seen.has(key)) continue;
    seen.add(key);
    inserts.push({
      name: g.name,
      platform: g.platform,
      genre: g.genre,
      added_at: romAdded(g.file, g.path),
    });
  }

  console.log(`Gamelists: ${gamelists.length} | Favoritos: ${favorites.length}`);
  console.log("\nFavoritos por plataforma:");
  for (const [p, n] of [...byPlatform.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${String(p).padEnd(16)} ${n}`);
  }
  console.log(`\nNovos no catalog (após dedupe): ${inserts.length}`);
  for (const g of inserts.slice(0, 20)) {
    console.log(
      `add  ${g.name.padEnd(34)} platform=${g.platform.padEnd(12)} genre="${g.genre}" added=${g.added_at}`
    );
  }
  if (inserts.length > 20) console.log(`   ... mais ${inserts.length - 20}`);

  if (JSON_OUT) {
    writeFileSync(JSON_OUT, JSON.stringify(inserts, null, 2), "utf8");
    console.log(`JSON: ${JSON_OUT}`);
  }

  if (APPLY) {
    if (inserts.length) {
      const n = appendItems(db, PLAYER, "catalog", inserts);
      console.log(`\nInserido no catalog: ${n} itens.`);
      console.log("Rode: node scripts/backlog-export.mjs para regenerar _data/backlog/*.yml");
    } else {
      console.log("\nNada a inserir (tudo já no backlog).");
    }
  } else {
    console.log("\n[dry-run] Nada escrito. Use --apply para gravar.");
  }
}

main();