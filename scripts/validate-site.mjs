import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

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

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("Content validation passed.");
