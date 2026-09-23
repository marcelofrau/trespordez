import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { openDb, upsertScore } from "./backlog-lib.mjs";

const POSTS_DIR = join(process.cwd(), "_posts");

const LABEL_TO_FIELD = {
  "graficos": "graf",
  "graphics": "graf",
  "som": "som",
  "sound": "som",
  "gameplay": "gameplay",
  "desafio": "desafio",
  "challenge": "desafio",
  "geral": "geral",
  "overall": "geral",
};

function normalizeLabel(label) {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function slugFromFilename(filename) {
  return filename.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

export function extractScores(html) {
  const values = {};
  const itemRegex = /<div class="score-item"[^>]*>[\s\S]*?<span class="score-label">([^<]+)<\/span>[\s\S]*?<span class="score-value">([^<]+)<\/span>[\s\S]*?<\/div>/g;
  for (const match of html.matchAll(itemRegex)) {
    const field = LABEL_TO_FIELD[normalizeLabel(match[1])];
    if (!field) continue;
    const n = Number(String(match[2]).split("/")[0].trim());
    if (Number.isFinite(n)) values[field] = n;
  }
  return values;
}

export function main() {
  const db = openDb();
  const files = readdirSync(POSTS_DIR).filter((name) => name.endsWith(".md"));
  let ingested = 0;

  for (const name of files) {
    const text = readFileSync(join(POSTS_DIR, name), "utf8");
    const block = text.match(/<section class="review-score"[^>]*>[\s\S]*?<\/section>/);
    if (!block) continue;
    const values = extractScores(block[0]);
    if (!Object.keys(values).length) continue;
    const slug = slugFromFilename(name);
    upsertScore(db, slug, values, block[0]);
    ingested += 1;
    console.log(`${slug}: ${Object.entries(values).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  }

  console.log(`ingeriu notas de ${ingested} post(s).`);
  return ingested;
}

const run = process.argv[1] && process.argv[1].endsWith("scores-ingest.mjs");
if (run) {
  main();
}
