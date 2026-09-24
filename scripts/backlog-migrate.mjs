import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { openDb, upsertPlayer, replaceSection, setMeta, loadAuthors } from "./backlog-lib.mjs";

const BACKLOG_DIR = join(process.cwd(), "_data", "backlog");
const SECTIONS = ["backlog", "played", "dropped", "catalog"];

function parseAuthors() {
  return loadAuthors();
}

function parseSections(file) {
  const text = readFileSync(file, "utf8");
  const sections = {};
  let currentSection = null;
  let current = null;
  const pushItem = () => {
    if (currentSection && current) {
      (sections[currentSection] ||= []).push(current);
      current = null;
    }
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\t/g, "  ");
    const headerMatch = line.match(/^(\w+):\s*$/);
    if (headerMatch) {
      pushItem();
      currentSection = headerMatch[1];
      sections[currentSection] = sections[currentSection] || [];
      continue;
    }
    if (currentSection == null) continue;
    const itemMatch = line.match(/^  - (\w+):\s*(.*)$/);
    if (itemMatch) {
      pushItem();
      current = { [itemMatch[1]]: parseValue(itemMatch[2]) };
      continue;
    }
    if (current) {
      const fieldMatch = line.match(/^    (\w+):\s*(.*)$/);
      if (fieldMatch) {
        current[fieldMatch[1]] = parseValue(fieldMatch[2]);
        continue;
      }
      if (/^\s*$/.test(line)) continue;
    }
  }
  pushItem();
  return sections;
}

function parseValue(raw) {
  const v = raw.trim();
  if (v === "[]" || v === "" || v === "null") return null;
  if (v.startsWith('"')) {
    try {
      return JSON.parse(v);
    } catch {
      return v.slice(1, -1);
    }
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}

function main() {
  const db = openDb();
  const PLAYERS = parseAuthors();
  for (const [key, player] of Object.entries(PLAYERS)) {
    upsertPlayer(db, { key, ...player });
    const file = join(BACKLOG_DIR, `${key}.yml`);
    if (!readdirSync(BACKLOG_DIR).includes(`${key}.yml`)) {
      console.log(`${key}: arquivo ausente, section vazia`);
      for (const s of SECTIONS) replaceSection(db, key, s, []);
      continue;
    }
    const sections = parseSections(file);
    for (const s of SECTIONS) {
      const items = sections[s] || [];
      const n = replaceSection(db, key, s, items);
      console.log(`${key}/${s}: ${n} itens`);
    }
  }
  const now = new Date().toISOString();
  setMeta(db, "schema_version", "1");
  setMeta(db, "last_sync_at", now);
  console.log("migração completa");
}

main();