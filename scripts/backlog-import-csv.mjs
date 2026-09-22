import { readFileSync } from "node:fs";
import { openDb, setMeta, appendItems } from "./backlog-lib.mjs";

const db = openDb();

function parseCSV(text, delim = ",") {
  const rows = [];
  let field = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      field.push(cell); cell = "";
    } else if (ch === "\r") {
      // skip
    } else if (ch === "\n") {
      field.push(cell); rows.push(field); field = []; cell = "";
    } else {
      cell += ch;
    }
  }
  field.push(cell); rows.push(field);
  return rows.filter((r) => r.length > 1);
}

const PLATFORM_MAP = {
  "Sega Master System": "MasterSystem",
  "Super Nintendo Entertainment System": "SNES",
  "Sega Genesis": "MegaDrive",
  "Nintendo 64": "N64",
  "Nintendo DS": "DS",
  "Nintendo GameCube": "GC",
  "Game Boy Advance": "GBA",
  "Nintendo Entertainment System": "NES",
  "PlayStation": "PS1",
  "PlayStation 2": "PS2",
  "PlayStation 3": "PS3",
  "Sega Saturn": "Saturn",
  "Sega CD": "SegaCD",
  "Wii": "Wii",
  "PC": "PC",
  "Game Boy Color": "GameBoyColor",
};

function norm(s) {
  return (s || "").trim().toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .trim();
}

const statusSection = (s) =>
  s === "Completed" || s === "Beaten" ? "played"
  : s === "None" ? "catalog"
  : "backlog";

const statusEmoji = (s) =>
  s === "Completed" || s === "Beaten" ? "👑"
  : s === "Unplayed" ? "💤"
  : s === "None" ? "⚪"
  : "💾";

const raw = readFileSync(process.argv[2], "utf8");
const rows = parseCSV(raw);
const headerIdx = rows.findIndex((r) => r[0].includes("Unique Game ID"));
const header = rows[headerIdx];
const data = rows.slice(headerIdx + 1);

const PLAYER = "the-archivist";
const inDb = db.prepare(`SELECT name, platform FROM backlog_items WHERE player_key=?`).all(PLAYER);
const keyed = new Set();
for (const row of inDb) keyed.add(`${norm(row.name)}|${(row.platform || "").trim().toLowerCase()}`);

const bySection = { backlog: [], played: [], catalog: [], dropped: [] };
let added = 0, dup = 0;
const seen = new Set();
for (const r of data) {
  const o = {};
  header.forEach((h, i) => { o[h.trim()] = (r[i] || "").trim(); });
  if (!o.Title) continue;
  const platform = PLATFORM_MAP[o.Platform] || o.Platform;
  const k = `${norm(o.Title)}|${(platform || "").toLowerCase()}`;
  if (keyed.has(k) || seen.has(k)) { dup++; continue; }
  seen.add(k);
  const section = statusSection(o.Status);
  bySection[section].push({ name: o.Title, platform, status: statusEmoji(o.Status) });
  added++;
}

for (const section of Object.keys(bySection)) {
  if (bySection[section].length) appendItems(db, PLAYER, section, bySection[section]);
}

setMeta(db, "last_csv_import", new Date().toISOString());
console.log(`imported: ${added} | dup/skip: ${dup}`);
for (const section of Object.keys(bySection)) {
  if (bySection[section].length) console.log(`${section}: +${bySection[section].length}`);
}