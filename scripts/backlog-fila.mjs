/* Reduz a fila de espera a 4 jogos e aplica glyphs por jogo.
 * USO: node scripts/backlog-fila.mjs [--apply]
 * dry-run por padrão: imprime o que faria.
 *
 * Sempre faz backup (cópia) do sqlite em %TEMP% antes de aplicar.
 */
import { openDb, DB_PATH } from "./backlog-lib.mjs";
import { copyFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const FILA = [
  { name: "Pragmata", glyph: "fa-moon" },
  { name: "Cyberpunk 2077", glyph: "fa-city" },
  { name: "No Man's Sky", glyph: "fa-rocket" },
  { name: "Planet of Lana 2", glyph: "fa-cat" },
];
const PLAYER = "the-archivist";

const reindex = (db) => {
  const players = db.prepare("SELECT DISTINCT player_key FROM backlog_items").all();
  const sections = db.prepare(
    "UPDATE backlog_items SET pos = ? WHERE id = ?"
  );
  for (const { player_key } of players) {
    for (const section of ["backlog", "played", "dropped", "catalog"]) {
      const rows = db
        .prepare(
          "SELECT id FROM backlog_items WHERE player_key = ? AND section = ? ORDER BY pos ASC"
        )
        .all(player_key, section);
      rows.forEach((row, i) => sections.run(i, row.id));
    }
  }
};

export function main(db, apply) {
  const before = db
    .prepare(
      "SELECT section, name, platform, glyph FROM backlog_items WHERE player_key = ? AND name IN (?,?,?,?)"
    )
    .all(PLAYER, ...FILA.map((f) => f.name));
  console.log("antes:");
  for (const row of before) console.log(`  [${row.section}] ${row.name} (glyph=${row.glyph ?? "-"}, plat=${row.platform ?? "-"})`);

  const backlogCount = db
    .prepare("SELECT COUNT(*) n FROM backlog_items WHERE section = ? AND player_key = ?")
    .get("backlog", PLAYER).n;
  console.log(`\nfila atual: ${backlogCount} jogos → mover todos para catálogo (só os 4 voltam)`);

  const missing = FILA.map((f) => f.name).filter(
    (name) => !before.some((b) => b.name === name)
  );
  console.log(`não existem no banco (irão ser criados): ${missing.join(", ") || "nenhum"}`);

  if (!apply) {
    console.log("\n(dry-run — rode com --apply para gravar)");
    return;
  }

  copyFileSync(DB_PATH, join(tmpdir(), "trespordez.sqlite.bak-fila.sqlite"));

  db.prepare(
    "UPDATE backlog_items SET pos = 1000000 + id WHERE player_key = ?"
  ).run(PLAYER);
  db.prepare(
    "UPDATE backlog_items SET section = 'catalog' WHERE section = 'backlog' AND player_key = ?"
  ).run(PLAYER);

  const byName = db.prepare(
    "SELECT id, glyph FROM backlog_items WHERE player_key = ? AND name = ?"
  );
  FILA.forEach((game, i) => {
    const exist = byName.get(PLAYER, game.name);
    if (exist) {
      db.prepare(
        "UPDATE backlog_items SET section = 'backlog', glyph = ? WHERE id = ? AND player_key = ?"
      ).run(game.glyph, exist.id, PLAYER);
    } else {
      db.prepare(
        "INSERT INTO backlog_items (player_key, section, pos, name, glyph, status) VALUES (?, 'backlog', ?, ?, ?, '?')"
      ).run(PLAYER, i, game.name, game.glyph);
    }
  });

  const setPos = db.prepare(
    "UPDATE backlog_items SET pos = ? WHERE player_key = ? AND name = ? AND section = 'backlog'"
  );
  FILA.forEach((game, i) => setPos.run(i, PLAYER, game.name));

  reindex(db);

  const after = db
    .prepare(
      "SELECT section, name, glyph, pos FROM backlog_items WHERE player_key = ? AND name IN (?,?,?,?) ORDER BY pos ASC"
    )
    .all(PLAYER, ...FILA.map((f) => f.name));
  console.log("depois (ordem da fila):");
  for (const row of after) console.log(`  [${row.section}] pos=${row.pos} ${row.name} (glyph=${row.glyph})`);
}

const run = process.argv[1] && process.argv[1].endsWith("backlog-fila.mjs");
if (run) {
  const apply = process.argv.includes("--apply");
  main(openDb(), apply);
}