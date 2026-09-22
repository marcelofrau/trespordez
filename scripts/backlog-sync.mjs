import { openDb, replaceSection, upsertPlayer, setMeta } from "./backlog-lib.mjs";
import { main as exportBacklog, parseAuthors } from "./backlog-export.mjs";

const PUB_BASE =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTPVf0fVS0TjLJb_-mBUSvI5FRMMxR6ipTci_75jmZLSwDNRMEFx_rZjViIG_JdZANPVyiVVGq6EAAz";

const PLAYERS = {
  "the-archivist": {
    backlog: 0,
    played: 1019421898,
    dropped: 1847006471,
    catalog: 375380382,
  },
};

function clean(value) {
  if (value == null) return null;
  const v = String(value).replace(/\s+/g, " ").trim();
  return v === "" ? null : v;
}

function normStatus(value) {
  const v = clean(value);
  if (v == null || v === "??" || v === "?" || v === "-") return null;
  return v;
}

function normScore(value) {
  const v = clean(value);
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseCsv(text) {
  const rows = [];
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    const cells = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];
      if (c === '"') {
        if (quoted && raw[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          quoted = !quoted;
        }
      } else if (c === "," && !quoted) {
        cells.push(cur);
        cur = "";
      } else {
        cur += c;
      }
    }
    cells.push(cur);
    rows.push(cells.map((c) => (quoted ? c : c)));
  }
  return rows;
}

function list(rows, mapping) {
  const out = [];
  for (const row of rows) {
    const item = {};
    for (const [key, index] of Object.entries(mapping)) {
      item[key] = clean(row[index]);
    }
    if (item.name == null) continue;
    out.push(item);
  }
  return out;
}

async function main() {
  const db = openDb();
  const authors = parseAuthors();
  const now = new Date().toISOString();

  for (const [player, sheets] of Object.entries(PLAYERS)) {
    const author = authors[player] || {};
    upsertPlayer(db, {
      key: player,
      name: author.name || player,
      slug: author.slug || player,
      url: author.url || null,
      avatar: author.avatar || null,
    });

    const sections = {};
    for (const [section, gid] of Object.entries(sheets)) {
      const url = `${PUB_BASE}/pub?output=csv&gid=${gid}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "trespordez-backlog-sync/1.0" },
      });
      if (!res.ok) throw new Error(`${player}/${section}: HTTP ${res.status} for ${url}`);
      const rows = parseCsv(await res.text());
      const header = rows.shift();
      switch (section) {
        case "backlog":
          sections.backlog = list(rows, { name: 0, platform: 1, status: 2, mood: 3 }).map((i) => ({
            ...i,
            status: normStatus(i.status),
            mood: normStatus(i.mood),
          }));
          break;
        case "played":
          sections.played = list(rows, {
            name: 0,
            platform: 1,
            status: 2,
            humor: 3,
            graf: 5,
            som: 6,
            gameplay: 7,
            desafio: 8,
            geral: 9,
          }).map((i) => ({
            name: i.name,
            platform: i.platform,
            status: normStatus(i.status),
            humor: normStatus(i.humor),
            graf: normScore(i.graf),
            som: normScore(i.som),
            gameplay: normScore(i.gameplay),
            desafio: normScore(i.desafio),
            geral: normScore(i.geral),
          }));
          break;
        case "dropped":
          sections.dropped = list(rows, { name: 0, platform: 1, reason: 2, humor: 3 }).map((i) => ({
            ...i,
            reason: clean(i.reason),
            humor: normStatus(i.humor),
          }));
          break;
        case "catalog":
          sections.catalog = list(rows, { name: 0, platform: 1, status: 2, humor: 3 }).map((i) => ({
            ...i,
            status: normStatus(i.status),
            humor: normStatus(i.humor),
          }));
          break;
      }
      replaceSection(db, player, section, sections[section] || []);
      console.log(`${player}/${section}: ${(sections[section] || []).length} itens`);
    }
  }

  setMeta(db, "last_sync_at", now);
  console.log("export file: sqlite atualizado — rodando export para regenerar _data/backlog/*.yml");
  exportBacklog();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});