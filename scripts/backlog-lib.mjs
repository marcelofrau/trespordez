import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";

export const DB_PATH = join(process.cwd(), "data", "trespordez.sqlite");

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function openDb() {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec(SCHEMA);
  migrateAddedAt(db);
  migrateGenre(db);
  migrateGlyph(db);
  migrateHidden(db);
  migrateStatus(db);
  migrateDropLegacy(db);
  return db;
}

function migrateGlyph(db) {}

function migrateHidden(db) {
  const cols = db.prepare("PRAGMA table_info(backlog_items)").all();
  if (!cols.some((c) => c.name === "hidden")) {
    db.exec("ALTER TABLE backlog_items ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0");
  }
}

export const STATUS_KEYS = ["jogando", "zerado", "na-fila", "pausado", "arquivado"];

const STATUS_LEGACY = {
  "▶️": "jogando",
  "👑": "zerado",
  "⏸️": "pausado",
  "💤": "pausado",
  "🟡": "pausado",
  "🗃️": "arquivado",
  "⏲️": "arquivado",
  "?": "arquivado",
  "⚪": "na-fila",
  "💾": "na-fila",
};

export function normalizeStatus(status) {
  if (status == null) return status;
  return STATUS_LEGACY[String(status)] ?? status;
}

function migrateStatus(db) {
  for (const [legacy, key] of Object.entries(STATUS_LEGACY)) {
    db.prepare("UPDATE backlog_items SET status = ? WHERE status = ?").run(key, legacy);
  }
}

function migrateGenre(db) {
  const cols = db.prepare("PRAGMA table_info(backlog_items)").all();
  if (!cols.some((c) => c.name === "genre")) {
    db.exec("ALTER TABLE backlog_items ADD COLUMN genre TEXT");
  }
}

function migrateAddedAt(db) {
  const cols = db.prepare("PRAGMA table_info(backlog_items)").all();
  if (!cols.some((c) => c.name === "added_at")) {
    db.exec("ALTER TABLE backlog_items ADD COLUMN added_at TEXT");
  }
  db.exec("UPDATE backlog_items SET added_at = date('now') WHERE added_at IS NULL");
}

const DROPPED_COLUMNS = ["mood", "humor", "description", "glyph"];

function migrateDropLegacy(db) {
  const cols = db.prepare("PRAGMA table_info(backlog_items)").all();
  for (const name of DROPPED_COLUMNS) {
    if (cols.some((c) => c.name === name)) {
      db.exec(`ALTER TABLE backlog_items DROP COLUMN ${name}`);
    }
  }
}

export function readYaml(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function loadAuthors() {
  const dir = join(process.cwd(), "_data", "authors");
  if (existsSync(dir)) {
    const players = {};
    for (const file of readdirSync(dir)) {
      if (!/\.ya?ml$/i.test(file)) continue;
      const key = file.replace(/\.[^.]+$/, "");
      players[key] = parseAuthorFile(readFileSync(join(dir, file), "utf8"));
    }
    if (Object.keys(players).length) return players;
  }
  const single = join(process.cwd(), "_data", "authors.yml");
  if (existsSync(single)) {
    const players = {};
    let key = null;
    for (const raw of readFileSync(single, "utf8").split(/\r?\n/)) {
      const keyMatch = raw.match(/^(\S+):\s*$/);
      if (keyMatch) {
        key = keyMatch[1];
        players[key] = {};
        continue;
      }
      if (key) {
        const f = raw.match(/^\s{2}(\w+):\s*(.*)$/);
        if (f) players[key][f[1]] = cleanValue(f[2]);
      }
    }
    if (Object.keys(players).length) return players;
  }
  throw new Error("Nenhum autor em _data/authors/ nem _data/authors.yml");
}

function parseAuthorFile(text) {
  const fields = {};
  for (const raw of text.split(/\r?\n/)) {
    const m = raw.match(/^\s*([A-Za-z_]\w*):\s*(.*)$/);
    if (m) fields[m[1]] = cleanValue(m[2]);
  }
  return fields;
}

function cleanValue(raw) {
  return (raw || "").replace(/^["']|["']$/g, "") || null;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS players (
  key    TEXT PRIMARY KEY,
  name   TEXT NOT NULL,
  slug   TEXT NOT NULL,
  url    TEXT,
  avatar TEXT
);

CREATE TABLE IF NOT EXISTS backlog_items (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  player_key TEXT NOT NULL REFERENCES players(key),
  section    TEXT NOT NULL CHECK (section IN ('backlog','played','dropped','catalog')),
  pos        INTEGER NOT NULL,
  name       TEXT NOT NULL,
  platform   TEXT,
  genre      TEXT,
  status     TEXT,
  reason     TEXT,
  graf       REAL, som REAL, gameplay REAL, desafio REAL, geral REAL,
  post_slug  TEXT,
  added_at   TEXT,
  hidden     INTEGER NOT NULL DEFAULT 0,
  UNIQUE (player_key, section, pos)
);

CREATE TABLE IF NOT EXISTS scores (
  content_slug TEXT PRIMARY KEY,
  graf         REAL,
  som          REAL,
  gameplay     REAL,
  desafio      REAL,
  geral        REAL,
  raw          TEXT
);
`;

export function upsertPlayer(db, player) {
  db.prepare(
    `INSERT INTO players (key, name, slug, url, avatar)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET
       name=excluded.name, slug=excluded.slug,
       url=excluded.url, avatar=excluded.avatar`
  ).run(player.key, player.name, player.slug, player.url, player.avatar);
}

export function replaceSection(db, playerKey, section, items) {
  const preserved = new Map();
  const prior = db
    .prepare(
      "SELECT name, added_at, genre, hidden FROM backlog_items WHERE player_key = ? AND section = ?"
    )
    .all(playerKey, section);
  for (const row of prior) preserved.set(row.name, row);

  db.prepare("DELETE FROM backlog_items WHERE player_key = ? AND section = ?").run(playerKey, section);
  const ins = db.prepare(
    `INSERT INTO backlog_items
       (player_key, section, pos, name, platform, genre, status, reason,
        graf, som, gameplay, desafio, geral, post_slug, added_at, hidden)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  items.forEach((item, pos) => {
    const priorRow = preserved.get(item.name);
    ins.run(
      playerKey, section, pos,
      item.name ?? null,
      item.platform ?? null,
      item.genre ?? (priorRow ? priorRow.genre : null),
      normalizeStatus(item.status ?? null),
      item.reason ?? null,
      item.graf ?? null, item.som ?? null, item.gameplay ?? null,
      item.desafio ?? null, item.geral ?? null,
      item.post_slug ?? null,
      item.added_at ?? (priorRow ? priorRow.added_at : null) ?? today(),
      item.hidden ?? (priorRow ? priorRow.hidden : 0)
    );
  });
  return items.length;
}

export function appendItems(db, playerKey, section, items) {
  const { m } = db
    .prepare("SELECT COALESCE(MAX(pos), -1) AS m FROM backlog_items WHERE player_key=? AND section=?")
    .get(playerKey, section);
  const ins = db.prepare(
    `INSERT INTO backlog_items
       (player_key, section, pos, name, platform, genre, status, reason,
        graf, som, gameplay, desafio, geral, post_slug, added_at, hidden)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  items.forEach((item, i) => {
    ins.run(
      playerKey, section, m + 1 + i,
      item.name ?? null, item.platform ?? null, item.genre ?? null,
      normalizeStatus(item.status ?? null),
      item.reason ?? null,
      item.graf ?? null, item.som ?? null, item.gameplay ?? null,
      item.desafio ?? null, item.geral ?? null, item.post_slug ?? null,
      item.added_at ?? today(),
      item.hidden ?? 0
    );
  });
  return items.length;
}

export function countItems(db, playerKey, section) {
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM backlog_items WHERE player_key=? AND section=?")
    .get(playerKey, section);
  return row.n;
}

export function upsertScore(db, slug, values, raw) {
  db.prepare(
    `INSERT INTO scores (content_slug, graf, som, gameplay, desafio, geral, raw)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (content_slug) DO UPDATE SET
       graf=excluded.graf, som=excluded.som, gameplay=excluded.gameplay,
       desafio=excluded.desafio, geral=excluded.geral, raw=excluded.raw`
  ).run(
    slug,
    values.graf ?? null,
    values.som ?? null,
    values.gameplay ?? null,
    values.desafio ?? null,
    values.geral ?? null,
    raw
  );
}

export function setMeta(db, key, value) {
  db.prepare(
    `INSERT INTO meta (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value=excluded.value`
  ).run(key, value);
}

export function getMeta(db, key) {
  const row = db.prepare("SELECT value FROM meta WHERE key=?").get(key);
  return row ? row.value : null;
}