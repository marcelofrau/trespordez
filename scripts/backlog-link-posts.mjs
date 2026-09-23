import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { openDb } from "./backlog-lib.mjs";

const POSTS_DIR = join(process.cwd(), "_posts");

function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slugFromFilename(filename) {
  return filename.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

function readTitle(text) {
  const match = text.match(/^title:\s*["']?(.*?)["']?\s*$/m);
  return match ? match[1] : null;
}

export function collectPosts() {
  return readdirSync(POSTS_DIR)
    .filter((name) => name.endsWith(".md"))
    .map((name) => {
      const text = readFileSync(join(POSTS_DIR, name), "utf8");
      const title = readTitle(text);
      return title ? { slug: slugFromFilename(name), title, normalized: normalize(title) } : null;
    })
    .filter(Boolean);
}

function compact(value) {
  return normalize(value).replace(/\s+/g, "");
}

function editDistance(a, b) {
  if (a === b) return 0;
  const n = a.length;
  const m = b.length;
  if (!n) return m;
  if (!m) return n;
  const dp = Array.from({ length: n + 1 }, (_, i) => [i, ...Array(m).fill(0)]);
  for (let j = 1; j <= m; j += 1) dp[0][j] = j;
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[n][m];
}

export function main() {
  const db = openDb();
  const posts = collectPosts();
  const itemKey = (item) => compact(item.name);

  const items = db
    .prepare("SELECT id, player_key, section, name FROM backlog_items WHERE post_slug IS NULL")
    .all();

  const update = db.prepare("UPDATE backlog_items SET post_slug = ? WHERE id = ?");
  let linked = 0;
  let near = 0;
  const unmatched = [];
  const ambiguous = [];

  for (const item of items) {
    const key = itemKey(item);
    const scored = posts.map((post) => ({ post, distance: editDistance(key, compact(post.title)) }));
    const bestDistance = Math.min(...scored.map((candidate) => candidate.distance));
    const best = scored
      .filter((candidate) => candidate.distance === bestDistance)
      .map((candidate) => candidate.post);

    if (best.length === 1 && bestDistance <= 1) {
      update.run(best[0].slug, item.id);
      linked += 1;
      if (bestDistance > 0) near += 1;
    } else if (best.length > 1) {
      ambiguous.push(`${item.player_key}/${item.section}: "${item.name}" -> ${best.map((b) => b.slug).join(", ")}`);
    } else {
      unmatched.push(`${item.player_key}/${item.section}: "${item.name}"`);
    }
  }

  console.log(`linkou ${linked} item(ns) a posts${near ? ` (${near} por proximidade de título)` : ""}.`);
  if (ambiguous.length) {
    console.log(`\nambíguo (mais de um post com título igual) — não linkado:`);
    console.log(ambiguous.join("\n"));
  }
  if (unmatched.length) {
    console.log(`\nsem post correspondente — ${unmatched.length} item(ns) (normal pra itens ainda não revisados):`);
    console.log(unmatched.join("\n"));
  }
  return linked;
}

const run = process.argv[1] && process.argv[1].endsWith("backlog-link-posts.mjs");
if (run) {
  main();
}
