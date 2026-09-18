import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => entry.isDirectory() ? markdownFiles(join(directory, entry.name)) : entry.name.endsWith(".md") ? [join(directory, entry.name)] : []));
  return nested.flat();
}

async function firstImage(directory) {
  try {
    return (await readdir(directory)).find((file) => /\.(jpe?g|png|webp|gif)$/i.test(file));
  } catch {
    return null;
  }
}

async function downloadCover(content, slug) {
  const source = content.match(/^wordpress_featured_image:\s*(.+)$/m)?.[1];
  if (!source) return null;
  const extension = new URL(source).pathname.match(/\.(jpe?g|png|webp|gif)$/i)?.[1] ?? "jpg";
  const relative = `/assets/images/posts/${slug}/cover.${extension}`;
  try {
    const response = await fetch(source);
    if (!response.ok) throw new Error(String(response.status));
    await mkdir(join(root, "assets", "images", "posts", slug), { recursive: true });
    await writeFile(join(root, relative), Buffer.from(await response.arrayBuffer()));
    return relative;
  } catch (error) {
    console.warn(`Unable to recover cover for ${slug}: ${error.message}`);
    return null;
  }
}

function clean(content) {
  return content
    .replace(/\n\s*Sorry, your browser[\s\S]*?(?=\n\s*<(?:p|h[1-6]|ul|ol|table|figure|iframe|img)|\n\s*$)/gi, "\n")
    .replace(/\n\s*\{&quot;[\s\S]*?(?=\n\s*<(?:p|h[1-6]|ul|ol|table|figure|iframe|img)|\n\s*$)/gi, "\n")
    .replace(/^\s{4,}.*(?:Sorry, your browser|&quot;|modula|modula_gallery|creative-gallery).*$(\r?\n)?/gmi, "")
    .replace(/^\s{4,}(?=<(?:a|img|iframe|p|h[1-6]|ul|ol|li|table|thead|tbody|tr|td|th|figure|figcaption|blockquote|hr))/gm, "")
    .replace(/\s+(?:srcset|sizes)=("[^"]*"|'[^']*')/gi, "")
    .replace(/\ssrc="\/assets\/([^"']+)"/gi, " src=\"{{ '/assets/$1' | relative_url }}\"")
    .replace(/\shref="https?:\/\/trespordez\.com\.br\/(?!wp-content)([^"']*)"/gi, " href=\"{{ '/$1' | relative_url }}\"")
    .replace(/\shref="\/(?!\/)([^"']*)"/gi, " href=\"{{ '/$1' | relative_url }}\"")
    .replace(/<img([^>]*?)\s(?:loading|decoding|fetchpriority|width|height|title|crop|aria-describedby)=("[^"]*"|'[^']*')/gi, "<img$1")
    .replace(/<p>\s*<\/p>/g, "")
    .replace(/\n\s*<span>\s*<\/span>\s*/gi, "\n")
    .replace(/<iframe\s+([\s\S]*?)>\s*<\/iframe>/gi, (_match, attributes) => `<iframe ${attributes.replace(/\s+/g, " ").trim()}></iframe>`)
    .replace(/\n{3,}/g, "\n\n");
}

for (const file of await markdownFiles(join(root, "_posts"))) {
  let content = clean(await readFile(file, "utf8"));
  const slug = file.split(/[\\/]/).pop().replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
  if (!/^image:/m.test(content)) {
    const image = await downloadCover(content, slug) ?? await firstImage(join(root, "assets", "images", "posts", slug));
    if (image) {
      const path = image.startsWith("/") ? image : `/assets/images/posts/${slug}/${image}`;
      content = content.replace(/^(---\r?\n)/, `$1image: ${path}\nimage_alt: ${slug.replace(/-/g, " ")}\n`);
    }
  }
  await writeFile(file, content, "utf8");
}

for (const file of await markdownFiles(join(root, "_pages", "wordpress"))) {
  await writeFile(file, clean(await readFile(file, "utf8")), "utf8");
}

console.log("Imported content repaired.");
