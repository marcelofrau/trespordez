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

export function main() {
  const db = openDb();
  const posts = collectPosts();
  const byNormalizedTitle = new Map();
  for (const post of posts) {
    byNormalizedTitle.set(post.normalized, (byNormalizedTitle.get(post.normalized) || []).concat(post));
  }

  const items = db
    .prepare("SELECT id, player_key, section, name FROM backlog_items WHERE post_slug IS NULL")
    .all();

  const update = db.prepare("UPDATE backlog_items SET post_slug = ? WHERE id = ?");
  let linked = 0;
  const unmatched = [];
  const ambiguous = [];

  for (const item of items) {
    const key = normalize(item.name);
    const matches = byNormalizedTitle.get(key) || [];
    if (matches.length === 1) {
      update.run(matches[0].slug, item.id);
      linked += 1;
    } else if (matches.length > 1) {
      ambiguous.push(`${item.player_key}/${item.section}: "${item.name}" -> ${matches.map((m) => m.slug).join(", ")}`);
    } else {
      unmatched.push(`${item.player_key}/${item.section}: "${item.name}"`);
    }
  }

  console.log(`linkou ${linked} item(ns) a posts.`);
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
