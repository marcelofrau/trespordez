// Importa as notas dos reviews (tabela scores) para os itens do backlog que têm
// post_slug mas colunas de nota vazias. Idempotente: só preenche NULL.
//
//   node scripts/backlog-import-scores.mjs            # aplica (só preenche vazios)
//   node scripts/backlog-import-scores.mjs --dry-run  # só relatório
//   node scripts/backlog-import-scores.mjs --align    # também corrige notas divergentes
//
// Origem das notas: scripts/.../backlog-sync.mjs popula a tabela scores a partir
// da planilha. O post é a fonte editorial, então o script também confere se as
// notas da planilha batem com o bloco .review-score do _posts (só reporta).
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { openDb } from "./backlog-lib.mjs";

const FIELDS = ["graf", "som", "gameplay", "desafio", "geral"];
// posts antigos usam rótulos em português, os de 2026+ em inglês
const LABELS = {
  gr: "graf", "gráficos": "graf", graphics: "graf",
  som: "som", sound: "som",
  gameplay: "gameplay",
  desafio: "desafio", challenge: "desafio",
  geral: "geral", overall: "geral",
};
const dryRun = process.argv.includes("--dry-run");
const align = process.argv.includes("--align");

function postSlug(file) {
  const text = readFileSync(join("_posts", file), "utf8");
  const fm = text.split(/^---\s*$/m)[1] || "";
  const explicit = fm.match(/^slug:\s*(\S+)\s*$/m);
  if (explicit) return explicit[1];
  return file.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
}

function scoreFromPost(file) {
  const text = readFileSync(join("_posts", file), "utf8");
  const block = text.match(/<section class="review-score"[\s\S]*?<\/section>/);
  if (!block) return null;
  const out = {};
  // o valor no HTML é "9/10": captura o texto e corta no "/"
  for (const [, label, value] of block[0].matchAll(
    /class="score-label">([^<]+)<\/span>[\s\S]*?class="score-value">([^<]+)<\/span>/g
  )) {
    const key = LABELS[label.trim().toLowerCase().replace(/\s+/g, "")];
    const num = Number.parseFloat(String(value).trim().split("/")[0].replace(",", "."));
    if (key && Number.isFinite(num)) out[key] = num;
  }
  return FIELDS.every((f) => out[f] != null) ? out : null;
}

const db = openDb();
const posts = new Map();
for (const file of readdirSync("_posts").filter((f) => f.endsWith(".md"))) {
  const slug = postSlug(file);
  const scores = scoreFromPost(file);
  if (scores) posts.set(slug, scores);
}

const scoreRows = db.prepare("SELECT * FROM scores").all();
const bySlug = new Map(scoreRows.map((r) => [r.content_slug, r]));

let filled = 0;
let missing = 0;
for (const item of db
  .prepare(
    `SELECT id, player_key, section, name, post_slug, ${FIELDS.join(", ")}
       FROM backlog_items
      WHERE post_slug IS NOT NULL AND post_slug <> ''
      ORDER BY player_key, section, pos`
  )
  .all()) {
  const source = bySlug.get(item.post_slug);
  if (!source) {
    missing += 1;
    console.log(`  sem nota na planilha: ${item.post_slug} (${item.player_key}/${item.section} "${item.name}")`);
    continue;
  }
  const empty = FIELDS.filter((f) => item[f] == null && source[f] != null);
  const diverging = align ? FIELDS.filter((f) => item[f] != null && source[f] != null && Number(item[f]) !== Number(source[f])) : [];
  if (!empty.length && !diverging.length) continue;
  const fields = [...empty, ...diverging];
  const values = fields.map((f) => source[f]);
  if (!dryRun) {
    db.prepare(
      `UPDATE backlog_items SET ${fields.map((f) => `${f}=?`).join(", ")} WHERE id=?`
    ).run(...values, item.id);
  }
  filled += 1;
  console.log(
    `  ${dryRun ? "preencher" : diverging.length ? "corrigido" : "preenchido"}: ` +
      `${item.player_key}/${item.section} "${item.name}" (${item.post_slug}) ` +
      fields.map((f, i) => `${f}=${values[i]}${diverging.includes(f) ? `(era ${item[f]})` : ""}`).join(" ")
  );
}

// planilha x post: o post é a fonte editorial, divergência aqui é sheet desatualizada
const drift = [];
for (const [slug, fromPost] of posts) {
  const sheet = bySlug.get(slug);
  if (!sheet) {
    drift.push(`${slug}: só no post (${FIELDS.map((f) => `${f}=${fromPost[f]}`).join(" ")})`);
    continue;
  }
  const diff = FIELDS.filter((f) => sheet[f] != null && fromPost[f] != null && Number(sheet[f]) !== fromPost[f]);
  if (diff.length) {
    drift.push(
      `${slug}: ${diff.map((f) => `${f} planilha=${sheet[f]} post=${fromPost[f]}`).join(", ")}`
    );
  }
}

console.log(`\n${dryRun ? "dry-run: " : ""}${filled} item(ns) com nota preenchida, ${missing} sem nota na planilha`);
if (drift.length) {
  console.log("\ndivergencia planilha x post (nao altera nada):");
  for (const line of drift) console.log(`  ${line}`);
} else {
  console.log("planilha e posts batem em todas as notas");
}
console.log(`posts com .review-score: ${posts.size} | slugs na scores: ${scoreRows.length}`);
