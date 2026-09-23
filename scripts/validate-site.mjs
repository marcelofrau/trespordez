import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { openDb } from "./backlog-lib.mjs";

const root = process.cwd();
const errors = [];

function files(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

for (const file of files(join(root, "_posts")).filter((path) => path.endsWith(".md"))) {
  const content = readFileSync(file, "utf8");
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    errors.push(`${file}: missing front matter`);
    continue;
  }
  for (const field of ["title", "date", "author", "categories", "tags", "description"]) {
    if (!new RegExp(`^${field}:`, "m").test(match[1])) errors.push(`${file}: missing ${field}`);
  }
  for (const image of content.matchAll(/!\[[^\]]*\]\((\/assets\/[^)\s]+)/g)) {
    if (!existsSync(join(root, image[1]))) errors.push(`${file}: missing image ${image[1]}`);
  }
}

const db = openDb();
const played = db
  .prepare(
    `SELECT b.player_key, b.name, b.post_slug, b.geral
     FROM backlog_items b
     WHERE b.section = 'played' AND b.post_slug IS NOT NULL AND b.geral IS NOT NULL`
  )
  .all();
for (const item of played) {
  const score = db.prepare("SELECT geral FROM scores WHERE content_slug = ?").get(item.post_slug);
  if (score && score.geral != null && Math.abs(score.geral - item.geral) > 0.01) {
    console.warn(
      `aviso: ${item.player_key}/${item.name} — nota sheet ${item.geral} vs nota post ${score.geral} (${item.post_slug})`
    );
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("Content validation passed.");
