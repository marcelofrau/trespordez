import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { openDb, getMeta, setMeta, loadAuthors } from "./backlog-lib.mjs";

const BACKLOG_DIR = join(process.cwd(), "_data", "backlog");
const SECTIONS = ["backlog", "played", "dropped", "catalog"];

export function parseAuthors() {
  return loadAuthors();
}

function yamlString(value) {
  if (value == null) return value;
  if (value === true) return "true";
  if (value === false) return "false";
  return JSON.stringify(String(value));
}

function emitItems(items) {
  if (!items.length) return "[]";
  return items
    .map((item) => {
      const entries = Object.entries(item).filter(([key]) => key !== "notes");
      const first = entries.shift();
      const head = `  - ${first[0]}: ${yamlString(first[1])}`;
      const rest = entries
        .map(([key, value]) => `    ${key}: ${yamlString(value)}`)
        .join("\n");
      const notes = Array.isArray(item.notes) && item.notes.length
        ? "    notes:\n" +
          item.notes
            .map((n) => `      - date: ${yamlString(n.date)}\n        body: ${yamlString(n.body)}`)
            .join("\n")
        : "";
      const tail = [rest, notes].filter(Boolean).join("\n");
      return tail ? `${head}\n${tail}` : head;
    })
    .join("\n");
}

function toYaml(sections) {
  const yaml = [
    `# Fonte: banco de dados SQLite — regenerado por scripts/backlog-export.mjs.`,
    `# Rode \`node scripts/backlog-export.mjs\` para regenerar a partir do banco.`,
  ];
  for (const section of SECTIONS) {
    const items = emitItems(sections[section]);
    yaml.push(items === "[]" ? `${section}: []` : `${section}:\n${items}`);
  }
  yaml.push("");
  return yaml.join("\n");
}

export function playerSections(db, playerKey) {
  const sections = {};
  const notesByItem = new Map();
  for (const row of db
    .prepare("SELECT item_id, note_date, body FROM backlog_notes ORDER BY note_date DESC, id DESC")
    .all()) {
    if (!notesByItem.has(row.item_id)) notesByItem.set(row.item_id, []);
    notesByItem.get(row.item_id).push({ date: row.note_date, body: row.body });
  }
  const stmt = db.prepare(
    `SELECT * FROM backlog_items WHERE player_key = ? AND section = ?
     ORDER BY pos ASC`
  );
  for (const section of SECTIONS) {
    sections[section] = stmt
      .all(playerKey, section)
      .map((row) => {
        const item = {
          name: row.name,
          platform: row.platform,
        };
        for (const field of ["status"]) if (row[field] != null) item[field] = row[field];
        if (row.genre != null) item.genre = row.genre;
        for (const field of ["reason"]) if (row[field] != null) item[field] = row[field];
        for (const field of ["graf", "som", "gameplay", "desafio", "geral"])
          if (row[field] != null) item[field] = row[field];
        if (row.added_at != null) item.added_at = row.added_at;
        if (row.cover != null) item.cover = row.cover;
        if (row.hidden) item.hidden = true;
        if (row.post_slug != null) item.post_slug = row.post_slug;
        const notes = notesByItem.get(row.id);
        if (notes && notes.length) item.notes = notes;
        return item;
      });
  }
  return sections;
}

export function main() {
  const db = openDb();
  const players = parseAuthors();
  const now = new Date().toISOString();
  let total = 0;

  for (const [key] of Object.entries(players)) {
    const sections = playerSections(db, key);
    const file = join(BACKLOG_DIR, `${key}.yml`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, toYaml(sections), "utf8");
    const n = SECTIONS.reduce((acc, s) => acc + sections[s].length, 0);
    total += n;
    console.log(`${key}: ${SECTIONS.map((s) => `${s}=${sections[s].length}`).join(", ")}`);
  }

  setMeta(db, "last_export_at", now);
  console.log(`exportou ${total} itens em ${Object.keys(players).length} jogador(es)`);
  return total;
}

const run = process.argv[1] && process.argv[1].endsWith("backlog-export.mjs");
if (run) {
  main();
}