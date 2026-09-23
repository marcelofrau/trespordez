// Import enrich do backlog a partir da biblioteca local do Playnite.
// Suporta os dois formatos de library:
//   - Playnite 7-9 (sqlite): library.db
//   - Playnite 10+ (LiteDB): library/games.db + genres.db + platforms.db,
//     extraídos por scripts/playnite-extract (C#, usa a LiteDB.dll do Playnite).
// Encontra a library e preenche colunas vazias de genre e added_at nos itens
// do backlog sqlite (seções backlog e catalog).
//
// Uso:
//   node scripts/playnite-backlog.mjs                 # dry-run (não escreve)
//   node scripts/playnite-backlog.mjs --apply          # escreve no sqlite
//   PLAYNITE_LIB=C:\Apps\Playnite node scripts/playnite-backlog.mjs
//
// Depois de aplicar, rode `node scripts/backlog-export.mjs` para regenerar
// _data/backlog/*.yml.

import { DatabaseSync } from "node:sqlite";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { openDb, appendItems } from "./backlog-lib.mjs";
import { norm, stripNoise, addedDate } from "./gamenorm.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const EXTRACT_EXE = join(SCRIPT_DIR, "playnite-extract", "bin", "Release", "net10.0", "playnite-extract.exe");

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const OVERWRITE = argv.includes("--overwrite-added");
const LIST_UNMATCHED = argv.includes("--unmatched");
const ADD_MISSING = argv.includes("--add-missing");
const HELP = argv.includes("--help") || argv.includes("-h");

const USAGE = `playnite-backlog: preenche genre/added_at do backlog a partir do Playnite

  node scripts/playnite-backlog.mjs [--apply] [--overwrite-added]

  --apply             escreve no sqlite (default: dry-run)
  --overwrite-added   sobrescreve added_at mesmo se já preenchido (a migração
                      grava a data de hoje como default; a data real vem do
                      Playnite). genre só preenche quando vazio.
  --unmatched         imprime a lista completa de jogos do Playnite sem
                      correspondência no backlog.
  --add-missing       adiciona no catalog os jogos do Playnite sem match
                      (platform "PC"; dry-run lista antes de gravar com --apply).
  PLAYNITE_LIB        caminho para a library do Playnite: pode ser o diretório
                      (com library/games.db — Playnite 10+ LiteDB) ou o arquivo
                      library.db (Playnite 7-9 sqlite). Default: procura em
                      %LOCALAPPDATA%\\Playnite, %APPDATA%\\Playnite,
                      Documents\\Playnite e C:\\Apps\\Playnite`;

if (HELP) {
  console.log(USAGE);
  process.exit(0);
}

function detectLib(target) {
  if (!target || !existsSync(target)) return null;
  const s = statSync(target);
  if (s.isDirectory()) {
    if (existsSync(join(target, "games.db"))) return { mode: "litedb", dir: target };
    if (existsSync(join(target, "library.db"))) return { mode: "sqlite", file: join(target, "library.db") };
    return null;
  }
  if (s.isFile()) {
    if (readFileSync(target).subarray(0, 16).includes("LiteDB")) {
      return { mode: "litedb", dir: dirname(target) };
    }
    return { mode: "sqlite", file: target };
  }
  return null;
}

function findPlayniteLib() {
  if (process.env.PLAYNITE_LIB) {
    const d = detectLib(process.env.PLAYNITE_LIB);
    if (d) return d;
  }
  const roots = [
    process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "Playnite") : null,
    process.env.APPDATA ? join(process.env.APPDATA, "Playnite") : null,
    process.env.USERPROFILE ? join(process.env.USERPROFILE, "Documents", "Playnite") : null,
    join("C:", "Apps", "Playnite"),
  ].filter(Boolean);
  for (const root of roots) {
    if (!existsSync(root)) continue;
    const d = detectLib(root);
    if (d) return d;
    const libDir = join(root, "library");
    if (existsSync(libDir)) {
      const d2 = detectLib(libDir);
      if (d2) return d2;
    }
  }
  return null;
}

function loadLiteGames(libDir) {
  if (!existsSync(EXTRACT_EXE)) {
    const build = spawnSync("dotnet", ["build", "-c", "Release", "--nologo"], {
      cwd: join(SCRIPT_DIR, "playnite-extract"),
      encoding: "utf8",
    });
    if (build.status !== 0) {
      throw new Error(`Falha ao compilar playnite-extract:\n${build.stderr || build.stdout}`);
    }
  }
  const out = execFileSync(EXTRACT_EXE, [libDir], {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });
  const rows = JSON.parse(out);
  if (!Array.isArray(rows)) throw new Error("saída do playnite-extract inválida");
  return rows.map((g) => ({
    name: g.name,
    added: addedDate(g.added),
    genres: g.genres || null,
    platforms: g.platforms || null,
  }));
}

function openPlaynite(path) {
  const db = new DatabaseSync(path, { readOnly: true });
  const hasGames = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='Games'")
    .get();
  if (!hasGames) {
    db.close();
    throw new Error(`"${path}" não parece ser a library.db do Playnite (sem tabela Games)`);
  }
  return db;
}

function tableColumns(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
}

function tableExists(db, table) {
  return !!db
    .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?" )
    .get(table);
}

function applyPlayniteSnapshot(db) {
  const gamesCols = tableColumns(db, "Games");
  const need = { genreIds: gamesCols.includes("GenreIds"), platformIds: gamesCols.includes("PlatformIds") };
  const sel = ["Id", "Name", "Added"];
  if (need.genreIds) sel.push("GenreIds");
  if (need.platformIds) sel.push("PlatformIds");
  const rows = db.prepare(`SELECT ${sel.join(", ")} FROM Games`).all();

  const lookup = (table, joinTable, fromCol, gameCol) => {
    if (!tableExists(db, table)) return new Map();
    const byId = new Map(db.prepare(`SELECT Id, Name FROM ${table}`).all().map((r) => [r.Id, r.Name]));
    const out = new Map();
    const gather = (id, list) => {
      const names = (list || [])
        .map((gid) => byId.get(gid))
        .filter(Boolean);
      out.set(id, names);
    };
    if (tableExists(db, joinTable)) {
      const joinCols = tableColumns(db, joinTable);
      if (joinCols.includes(fromCol) && joinCols.includes(gameCol)) {
        for (const r of db.prepare(`SELECT ${fromCol} AS gid, ${gameCol} AS game FROM ${joinTable}`).all()) {
          const name = byId.get(r.gid);
          if (name) {
            const list = out.get(r.game) || [];
            list.push(name);
            out.set(r.game, list);
          }
        }
        return out;
      }
    }
    for (const row of rows) {
      let raw;
      try {
        raw = JSON.parse(row[fromCol] ?? "[]");
      } catch {
        raw = [];
      }
      if (Array.isArray(raw)) gather(row.Id, raw);
    }
    return out;
  };

  const genresByGame = need.genreIds
    ? lookup("Genres", "GameGenres", "GenreIds", "GameId")
    : new Map();
  const platformsByGame = need.platformIds
    ? lookup("Platforms", "GamePlatforms", "PlatformIds", "GameId")
    : new Map();

  return rows
    .filter((r) => r.Name && String(r.Name).trim())
    .map((r) => ({
      name: String(r.Name).trim(),
      added: addedDate(r.Added),
      genres: (genresByGame.get(r.Id) || [])
        .map((g) => String(g).trim())
        .filter(Boolean)
        .join(", ") || null,
      platforms: (platformsByGame.get(r.Id) || [])
        .map((p) => String(p).trim())
        .filter(Boolean)
        .join(", ") || null,
    }));
}

function matchBacklog(playnite, items) {
  const clean = new Map();
  for (const item of items) {
    const n = norm(item.name);
    if (!n) continue;
    if (!clean.has(n)) clean.set(n, item);
    const stripped = norm(stripNoise(item.name));
    if (stripped && stripped !== n && !clean.has(stripped)) clean.set(stripped, item);
  }

  const plans = [];
  const unmatched = [];
  for (const game of playnite) {
    const n = norm(game.name);
    let item = clean.get(n);
    let viaPrefix = false;
    if (!item && n.length >= 5) {
      for (const [key, cand] of clean) {
        if (key.startsWith(n) || n.startsWith(key)) {
          item = cand;
          viaPrefix = true;
          break;
        }
      }
    }
    if (!item) {
      unmatched.push(game);
      continue;
    }
    if ((!item.genre && game.genres) || (game.added && (OVERWRITE || !item.added_at))) {
      plans.push({ item, game, viaPrefix });
    }
  }
  const byTier = { exact: plans.filter((p) => !p.viaPrefix).length, prefix: plans.filter((p) => p.viaPrefix).length };
  return { plans, unmatched, byTier };
}

function main() {
  const lib = findPlayniteLib();
  if (!lib) {
    console.error(
      "Library do Playnite não encontrada.\n" +
        "  1) Abra o Playnite nesta máquina (Playnite 10+ guarda em " +
        "%LOCALAPPDATA%\\Playnite\\library\\games.db)\n" +
        "  2) Ou aponte: PLAYNITE_LIB=\"C:\\Apps\\Playnite\" node scripts/playnite-backlog.mjs"
    );
    process.exit(1);
  }

  let gameList;
  if (lib.mode === "litedb") {
    gameList = loadLiteGames(lib.dir);
    console.log(`Playnite: ${gameList.length} jogos (LiteDB) em ${lib.dir}`);
  } else {
    const playnite = openPlaynite(lib.file);
    gameList = applyPlayniteSnapshot(playnite);
    playnite.close();
    console.log(`Playnite: ${gameList.length} jogos (sqlite) em ${lib.file}`);
  }

  const db = openDb();
  const items = db
    .prepare(
      `SELECT id, player_key, section, name, genre, added_at FROM backlog_items
       WHERE section IN ('backlog', 'catalog') ORDER BY player_key, section, pos`
    )
    .all();

  const { plans, unmatched, byTier } = matchBacklog(gameList, items);
  const bySection = {};
  for (const { item } of plans) {
    bySection[`${item.player_key}/${item.section}`] = (bySection[`${item.player_key}/${item.section}`] || 0) + 1;
  }

  console.log("\n--- Plano de enriquecimento (dry-run) ---");
  console.log(`Matched:  ${plans.length} itens (${byTier.exact} exato, ${byTier.prefix} por prefixo)`);
  for (const [sec, n] of Object.entries(bySection)) console.log(`   ${sec}: ${n}`);
  const preview = plans.slice(0, 15).map(({ item, game }) =>
    `${item.section.padEnd(8)} ${item.name.padEnd(30)} <- genre="${game.genres}" added=${game.added}`
  );
  if (preview.length) console.log(preview.join("\n"));
  if (LIST_UNMATCHED) {
    console.log(`\n--- Sem match no backlog (${unmatched.length}) ---`);
    console.log(unmatched.map((g, i) => `${String(i + 1).padStart(3)}  ${g.name}`).join("\n"));
  } else {
    console.log(`Sem match no backlog: ${unmatched.length} (ex. ${unmatched.slice(0, 8).map((g) => g.name).join(", ") || "—"})`);
  }

  let inserts = [];
  if (ADD_MISSING) {
    const existingCatalog = new Set(
      items.filter((i) => i.section === "catalog").map((i) => norm(i.name))
    );
    inserts = unmatched
      .filter((g) => norm(g.name) && !existingCatalog.has(norm(g.name)))
      .map((g) => ({
        name: g.name,
        platform: "PC",
        genre: g.genres || null,
        added_at: g.added || null,
      }));
    console.log(`\n--- Novos no catalog via --add-missing (${inserts.length}) ---`);
    for (const g of inserts.slice(0, 15)) {
      console.log(`add  ${g.name.padEnd(30)} platform=${g.platform} genre="${g.genre}" added=${g.added_at}`);
    }
    if (inserts.length > 15) console.log(`   ... mais ${inserts.length - 15}`);
  }

  if (APPLY) {
    const upd = db.prepare(
      "UPDATE backlog_items SET genre = ?, added_at = ? WHERE id = ?"
    );
    let touched = 0;
    for (const { item, game } of plans) {
      const genre = item.genre || game.genres;
      const added = OVERWRITE && game.added ? game.added : item.added_at || game.added;
      if (genre === item.genre && added === item.added_at) continue;
      upd.run(genre, added, item.id);
      touched++;
    }
    console.log(`\nAplicado: ${touched} itens atualizados no sqlite.`);

    if (ADD_MISSING && inserts.length) {
      const players = [...new Set(items.map((i) => i.player_key))];
      let inserted = 0;
      for (const p of players) {
        inserted += appendItems(db, p, "catalog", inserts);
      }
      console.log(`Inserido no catalog: ${inserted} itens novos.`);
    }
    console.log("Rode: node scripts/backlog-export.mjs para regenerar _data/backlog/*.yml");
  } else {
    console.log("\n[dry-run] Nada escrito. Use --apply para gravar.");
  }
}

main();