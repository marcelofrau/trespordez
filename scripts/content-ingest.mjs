#!/usr/bin/env node
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { openDb } from "./backlog-lib.mjs";

const ROOT = process.cwd();
const DB_PATH = join(ROOT, "data", "trespordez.sqlite");
const SITE = "trespordez.pages.dev";

function slurp(p) {
  return readdirSync(p, { withFileTypes: true }).map((d) => join(p, d.name));
}

function slugFromFile(f) {
  const base = f.split(/[\\/]/).pop();
  let n = base.replace(/\.md$/, "");
  n = n.replace(/^\d{4}-\d{2}-\d{2}-/, "");
  return n;
}

function parseFrontMatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return { fm: {}, body: text };
  return { fm: parseYamlFlat(m[1]), body: text.slice(m[0].length) };
}

function parseYamlFlat(block) {
  const out = {};
  const lines = block.split(/\r?\n/);
  let curKey = null;
  let square = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const m = /^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (m) {
      curKey = m[1];
      const rest = m[2].trim();
      if (rest === "") {
        out[curKey] = null;
      } else if (/^\[.*\]$/.test(rest)) {
        out[curKey] = rest
          .slice(1, -1)
          .split(",")
          .map((x) => x.trim().replace(/^['"]|['"]$/g, ""))
          .filter(Boolean);
      } else {
        out[curKey] = unquote(rest);
      }
      square = [];
    } else if (curKey && /^-\s+/.test(line)) {
      const item = line.replace(/^-\s*/, "").trim();
      if (typeof out[curKey] !== "object" || out[curKey] === null) {
        out[curKey] = [];
      }
      out[curKey].push(unquote(item));
    } else if (curKey && (/^  [A-Za-z_]/).test(line)) {
      square = out[curKey];
    }
  }
  return out;
}

function unquote(s) {
  s = s.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

const NUM2 = new Map([
  ["10", 10], ["9", 9], ["8", 8], ["7", 7], ["6", 6], ["5", 5],
  ["4", 4], ["3", 3], ["2", 2], ["1", 1], ["0", 0],
]);

function parseScore(value) {
  if (value == null) return null;
  const s = String(value).trim();
  const m = /^(\d+(?:\.\d+)?)\s*\/\s*\d+$/.exec(s);
  const num = m ? Number(m[1]) : Number(s);
  if (Number.isNaN(num)) return null;
  return num;
}

const SCORE_MAP = {
  graphics: "graf", "gráficos": "graf", graficos: "graf",
  sound: "som", "música": "graf_aux",
  gameplay: "gameplay", "jogabilidade": "gameplay",
  challenge: "desafio", "dificuldade": "desafio",
  overall: "geral", "geral": "geral",
};

function parseReviewScores(html, source) {
  const slots = { graf: null, som: null, gameplay: null, desafio: null, geral: null };
  const labelRe = /(Graphics|Sound|Gameplay|Challenge|Overall|Gráficos|Som|Jogabilidade|Dificuldade|Geral|Desafio)/i;
  const scoreRe = /\s*[-:—]?\s*(\d+(?:\.\d+)?(?:\s*\/\s*\d+)?)/;
  let idx = 0;
  while (idx < html.length) {
    const lm = html.slice(idx).match(labelRe);
    if (!lm) break;
    const label = lm[1].toLowerCase();
    const ci = idx + lm.index;
    const after = html.slice(ci + lm[0].length);
    const sm = after.match(scoreRe);
    const key = SCORE_MAP[label] === "graf_aux" ? "som" : SCORE_MAP[label];
    if (sm && key) {
      const v = parseScore(sm[1]);
      if (v != null) slots[key] = v;
      idx = ci + lm[0].length + (sm.index || 0) + sm[0].length;
    } else {
      idx = ci + lm[0].length;
    }
  }
  void source;
  return slots;
}

function contentKind(f) {
  const fs = f.toLowerCase();
  if (/\bplatforms\b/.test(fs)) return "platform";
  if (/\bports\b/.test(fs)) return "port";
  if (/\btag\b/.test(fs)) return "tag";
  if (/\bcategory\b/.test(fs)) return "category";
  if (/\bwordpress\b/.test(fs)) return "wordpress";
  if (/\bequipe\b/.test(fs)) return "equipe";
  return "page";
}

function safeNumber(name) {
  return statSync(name).size;
}

function collectMedia(featFiles) {
  const media = [];
  for (const f of featFiles) {
    const key = "assets/images/" + f.split("assets/images/")[1];
    try {
      const st = statSync(f);
      media.push({ path: key.replace(/\\/g, "/"), size: st.size });
    } catch { /* skip */ }
  }
  return media;
}

export async function ingest() {
  if (!existsSync(DB_PATH)) throw new Error(`DB not found: ${DB_PATH}`);
  const db = openDb(DB_PATH);
  db.exec(`DROP VIEW IF EXISTS v_score_consistency;`);
  db.exec(`DROP TABLE IF EXISTS content; DROP TABLE IF EXISTS media; DROP TABLE IF EXISTS links;`);
  db.exec(`
    CREATE TABLE content (
      slug TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      title TEXT,
      date TEXT,
      author TEXT,
      path TEXT,
      url TEXT,
      description TEXT,
      image TEXT,
      wordpress_id TEXT,
      categories TEXT,
      tags TEXT,
      graf REAL, som REAL, gameplay REAL, desafio REAL, geral REAL
    );
    CREATE TABLE media (
      path TEXT PRIMARY KEY,
      size INTEGER,
      used_by TEXT
    );
    CREATE TABLE links (
      url TEXT PRIMARY KEY,
      label TEXT,
      content_slug TEXT
    );
  `);

  let postsDir = join(ROOT, "_posts");
  const files = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const d of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, d.name);
      if (d.isDirectory()) walk(full);
      else if (/\.(md|markdown)$/.test(d.name)) files.push(full);
    }
  };
  if (existsSync(postsDir)) {
    for (const d of readdirSync(postsDir, { withFileTypes: true })) {
      if (d.isFile() && /\.md$/.test(d.name)) files.push(join(postsDir, d.name));
    }
  }
  walk(join(ROOT, "_pages"));

  const upsert = db.prepare(`
    INSERT OR REPLACE INTO content
      (slug,kind,title,date,author,path,url,description,image,wordpress_id,categories,tags,graf,som,gameplay,desafio,geral)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  const slugSeen = new Set();
  let count = 0;
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    const { fm, body } = parseFrontMatter(text);
    const slug = slugFromFile(f);
    let outSlug = slug;
    let n = 0;
    while (slugSeen.has(outSlug)) outSlug = `${slug}-${++n}`;
    slugSeen.add(outSlug);
    const kind = fm.layout === "post" || /_posts[\\/]/.test(f) ? "post" : fm.kind || contentKind(f);
    const scores = kind === "post" ? parseReviewScores(body, f) : { graf: null, som: null, gameplay: null, desafio: null, geral: null };
    const cats = fm.categories ? (Array.isArray(fm.categories) ? fm.categories : [fm.categories]) : [];
    const tags = fm.tags ? (Array.isArray(fm.tags) ? fm.tags : [fm.tags]) : [];
    upsert.run(
      outSlug, kind, fm.title ?? null, fm.date ? String(fm.date) : null,
      fm.author ?? null, "/" + f.split(ROOT)[1].replace(/\\/g, "/").replace(/^\//, "").replace(/\.md$/, ""),
      fm.permalink ?? null, fm.description ?? null, fm.image ?? null,
      fm.wordpress_id ? String(fm.wordpress_id) : null,
      JSON.stringify(cats), JSON.stringify(tags),
      scores.graf, scores.som, scores.gameplay, scores.desafio, scores.geral
    );
    count++;
  }

  const imgBase = "assets/images";
  const imgDir = join(ROOT, imgBase);
  const feats = [];
  const walkImg = (dir) => {
    if (!existsSync(dir)) return;
    for (const d of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, d.name);
      if (d.isDirectory()) walkImg(full);
      else if (/\.(png|jpe?g|gif|webp|svg|avif|ico)$/i.test(d.name)) feats.push(full);
    }
  };
  walkImg(imgDir);
  const mediaRows = collectMedia(feats);
  const rel = db.prepare(`INSERT OR REPLACE INTO media (path,size) VALUES (?,?)`);
  for (const r of mediaRows) rel.run(r.path, r.size);
  void safeNumber;

  const urlRe = /https?:\/\/[^\s<>"')\]]+/g;
  const linkIns = db.prepare(`INSERT OR IGNORE INTO links (url,label,content_slug) VALUES (?,?,?)`);
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    const { fm } = parseFrontMatter(text);
    const urls = text.match(urlRe) || [];
    const hostStrip = urls
      .map((u) => u.replace(/[.,;!?]+$/, ""))
      .filter((u) => !u.includes(SITE));
    const seenHost = new Set();
    for (const u of hostStrip) {
      if (seenHost.has(u)) continue;
      seenHost.add(u);
      linkIns.run(u, null, fm.title ?? null);
    }
  }

  db.exec(`
    CREATE VIEW v_score_consistency AS
      SELECT p.slug, p.title, p.graf, p.som, p.gameplay, p.desafio, p.geral,
             b.graf AS bg, b.som AS bs, b.gameplay AS bgp, b.desafio AS bd, b.geral AS bge
      FROM content p
      LEFT JOIN backlog_items b ON b.post_slug = p.slug
      WHERE p.kind = 'post';
  `);

  const meta = db.prepare(`INSERT OR REPLACE INTO meta (key, value) VALUES ('last_content_ingest', ?)`);
  meta.run(new Date().toISOString());

  db.close();
  console.log(`content: ${count} rows | media: ${mediaRows.length} | links indexed`);
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  ingest().catch((e) => { console.error(e); process.exitCode = 1; });
}