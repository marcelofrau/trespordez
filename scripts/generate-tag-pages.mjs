import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const posts = await readdir(join(root, "_posts"));
const tags = new Set();
for (const post of posts.filter((file) => file.endsWith(".md"))) {
  const content = await readFile(join(root, "_posts", post), "utf8");
  const match = content.match(/^tags:\s*\[(.*?)\]$/m);
  if (!match) continue;
  match[1].split(",").map((tag) => tag.trim()).filter(Boolean).forEach((tag) => tags.add(tag));
}

await mkdir(join(root, "_pages", "tag"), { recursive: true });
for (const tag of tags) {
  const path = join(root, "_pages", "tag", `${tag}.md`);
  const content = `---\nlayout: tag\ntitle: "Tag: ${tag}"\ntag_key: ${tag}\npermalink: /tag/${tag}/\n---\n`;
  await writeFile(path, content, "utf8");
}
console.log(`Generated ${tags.size} tag pages.`);
