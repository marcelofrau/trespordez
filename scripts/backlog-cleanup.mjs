// Repassada geral no backlog: tira extensão de arquivo do nome (Gran Turismo.iso),
// capitaliza nomes e gêneros que entraram tudo minúsculo (ScreenScraper/playlist)
// e sinaliza valores estranhos ("THE", "eur", "ecwolf.exe"...). Não apaga nada:
// só renomeia; estranhos vão para a lista de revisão.
//
// Uso:
//   node scripts/backlog-cleanup.mjs                # dry-run: mostra mudanças + junk
//   node scripts/backlog-cleanup.mjs --apply         # grava no sqlite
//   node scripts/backlog-cleanup.mjs --dump-junk j.txt
// Depois de aplicar: node scripts/backlog-export.mjs

import { openDb } from "./backlog-lib.mjs";
import { writeFileSync } from "node:fs";

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const HELP = argv.includes("--help") || argv.includes("-h");
const flag = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : null;
};
const DUMP_JUNK = flag("--dump-junk");

// Extensões que removemos do nome (o jogo é o que sobra).
const EXT = /\.(iso|zip|7z|rar|bin|cue|cmd|bat|exe|com|lnk|desktop|url|ini|cfg|dll|sys)\s*$/i;

// Tokens que ficam todos em maiúscula mesmo em nome/gênero minúsculo.
const UPPER_TOKEN = new Set(["3d", "2d", "hd", "usa", "us", "eu", "e", "j", "u", "jp", "wo", "ii", "iii", "iv", "vt"]);

// Palavras de ligação que ficam minúsculas em title case.
const LOWER_TOKEN = new Set(["of", "the", "and", "for", "to", "in", "on", "at", "with", "a", "an", "or", "de", "da", "do", "e"]);

const EXT_WARN = /\.(iso|cmd|bat|exe|com|lnk)$/i; // extensões ainda presentes = "curioso"
const REGION_ONLY = /^(eur|usa|us|jp|j|e|u|en|fr|de|es|it|nl|pt|wo)$/i;

function titleToken(tok) {
  const lo = tok.toLowerCase();
  if (LOWER_TOKEN.has(lo)) return lo;
  if (UPPER_TOKEN.has(lo)) return lo.toUpperCase();
  if (lo.startsWith("'")) return "'" + lo.charAt(1).toUpperCase() + lo.slice(2);
  const nums = /^[0-9.]+$/.test(lo);
  return nums ? lo : lo.charAt(0).toUpperCase() + lo.slice(1);
}

// Aplica só quando a string inteira está minúscula (as mistas já vêm OK).
function titleCaseIfLower(value) {
  const s = String(value ?? "").trim();
  if (!s || s !== s.toLowerCase()) return s;
  return s.replace(/(\p{L}[\p{L}\p{N}']*)/gu, titleToken).replace(/\s+/g, " ").trim();
}

// Slugs de gênero curados (vêm minúsculos de propósito — não capitalizar).
const CURATED_SLUGS = new Set([
  "action", "action-adventure", "action-rpg", "arcade", "fighting", "fps",
  "horror", "jrpg", "metroidvania", "pinball", "platformer", "point and click",
  "puzzle", "racing", "rail shooter", "roguelike", "rpg", "run and gun",
  "sandbox", "shoot-em-up", "simulation", "sports", "stealth", "strategy",
  "survival",
]);

function cleanGenre(value) {
  const s = String(value ?? "").trim();
  if (!s) return null;
  if (CURATED_SLUGS.has(s)) return s;
  return titleCaseIfLower(s);
}

function cleanName(name) {
  let n = String(name ?? "").trim();
  const base = n.replace(EXT, "").trim();
  if (base.length >= 2) n = base;
  return n;
}

function main() {
  const db = openDb();
  const rows = db
    .prepare("SELECT id, section, name, genre, platform FROM backlog_items")
    .all();

  const changes = [];
  const junk = [];

  for (const r of rows) {
    const before = r.name;
    const newName = cleanName(before);
    const capName = titleCaseIfLower(newName);
    const capGenre = cleanGenre(r.genre);

    let reason = null;
    if (capName !== before) reason = "nome";
    if (capGenre !== r.genre) reason = reason ? `${reason}+genero` : "genero";

    if (reason) changes.push({
      id: r.id,
      section: r.section,
      name: before,
      newName: capName,
      genre: r.genre,
      newGenre: capGenre,
      reason,
    });

    if (EXT_WARN.test(newName) || REGION_ONLY.test(newName) || newName.length < 2) {
      junk.push({ id: r.id, section: r.section, name: before, platform: r.platform, flag: "estranho" });
    }
  }

  console.log(`Items: ${rows.length} | Mudanças: ${changes.length} | Junk: ${junk.length}`);
  console.log("\n--- Mudanças (amostra 30) ---");
  for (const c of changes.slice(0, 30)) {
    console.log(`${c.reason.padEnd(12)} [${c.section}] "${c.name}" -> "${c.newName}"${c.genre !== c.newGenre ? `  genre:"${c.genre}" -> "${c.newGenre}"` : ""}`);
  }
  if (changes.length > 30) console.log(`   ... mais ${changes.length - 30}`);

  console.log("\n--- Junk para revisão ---");
  for (const j of junk) {
    console.log(`[${j.section}] ${j.name} (platform=${j.platform}) ${j.flag}`);
  }

  if (DUMP_JUNK) {
    writeFileSync(DUMP_JUNK, JSON.stringify(junk, null, 2), "utf8");
    console.log(`\nJunk: ${DUMP_JUNK}`);
  }

  if (APPLY) {
    const upd = db.prepare("UPDATE backlog_items SET name = ?, genre = ? WHERE id = ?");
    let touched = 0;
    for (const c of changes) {
      upd.run(c.newName, c.newGenre, c.id);
      touched++;
    }
    console.log(`\nAplicado: ${touched} itens atualizados.`);
    console.log("Rode: node scripts/backlog-export.mjs para regenerar _data/backlog/*.yml");
  } else {
    console.log("\n[dry-run] Nada escrito. Use --apply para gravar.");
  }
}

if (HELP) {
  console.log(`backlog-cleanup: repassada geral (extensão, capitalização, junk)

  node scripts/backlog-cleanup.mjs [--apply] [--dump-junk arq.json]
  --apply        grava renomeações no sqlite (default: dry-run)
  --dump-junk    grava lista de estranhos em JSON`);
  process.exit(0);
}

main();