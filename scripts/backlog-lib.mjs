import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";

export const DB_PATH = join(process.cwd(), "data", "trespordez.sqlite");

export function openDb() {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec(SCHEMA);
  return db;
}

export function readYaml(file) {
  return JSON.parse(readFileSync(file, "utf8"));
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
  status     TEXT,
  mood       TEXT,
  humor      TEXT,
  reason     TEXT,
  graf       REAL, som REAL, gameplay REAL, desafio REAL, geral REAL,
  post_slug  TEXT,
  UNIQUE (player_key, section, pos)
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
  db.prepare("DELETE FROM backlog_items WHERE player_key = ? AND section = ?").run(playerKey, section);
  const ins = db.prepare(
    `INSERT INTO backlog_items
       (player_key, section, pos, name, platform, status, mood, humor, reason,
        graf, som, gameplay, desafio, geral, post_slug)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  items.forEach((item, pos) => {
    ins.run(
      playerKey, section, pos,
      item.name ?? null,
      item.platform ?? null,
      item.status ?? null,
      item.mood ?? null,
      item.humor ?? null,
      item.reason ?? null,
      item.graf ?? null, item.som ?? null, item.gameplay ?? null,
      item.desafio ?? null, item.geral ?? null,
      item.post_slug ?? null
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
       (player_key, section, pos, name, platform, status, mood, humor, reason,
        graf, som, gameplay, desafio, geral, post_slug)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  items.forEach((item, i) => {
    ins.run(
      playerKey, section, m + 1 + i,
      item.name ?? null, item.platform ?? null, item.status ?? null,
      item.mood ?? null, item.humor ?? null, item.reason ?? null,
      item.graf ?? null, item.som ?? null, item.gameplay ?? null,
      item.desafio ?? null, item.geral ?? null, item.post_slug ?? null
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