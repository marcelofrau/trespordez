import { mkdir, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";

const origin = "https://trespordez.com.br/wp-json/wp/v2";
const root = process.cwd();
const categories = { 1: "retrogaming", 2: "reviews", 3: "news", 4: "moddding", 5: "consoles", 7: "gameplay", 8: "emulators", 10: "hiddengems", 14: "rpg", 37: "racing", 43: "platform" };
const authors = { 1: "the-archivist", 2: "the-archivist", 5: "cezar-aug" };

async function get(endpoint) {
  const response = await fetch(`${origin}/${endpoint}?per_page=100&_embed=1`);
  if (!response.ok) throw new Error(`${endpoint}: ${response.status}`);
  return response.json();
}

function text(value = "") {
  return value.replace(/&nbsp;/g, " ").replace(/&#821[67];/g, "'").replace(/&#8220;/g, "“").replace(/&#8221;/g, "”").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function assetName(url, index) {
  const parsed = new URL(url);
  const source = parsed.pathname.split("/").pop().replace(/[^a-zA-Z0-9.-]/g, "-").toLowerCase();
  return `${String(index).padStart(3, "0")}-${source || "image"}`;
}

async function downloadMedia(html, directory, prefix) {
  const urls = [...new Set([...html.matchAll(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/gi)].map((match) => match[1].replace(/&amp;/g, "&").replace(/^\//, "https://trespordez.com.br/").replace(/^https:\/\/\//, "https://")))];
  await mkdir(directory, { recursive: true });
  const replacements = new Map();
  for (const [index, url] of urls.entries()) {
    try {
      const filename = assetName(url, index + 1);
      const destination = join(directory, filename);
      const response = await fetch(url);
      if (!response.ok) throw new Error(String(response.status));
      await writeFile(destination, Buffer.from(await response.arrayBuffer()));
      replacements.set(url, `/${prefix}/${filename}`);
    } catch (error) {
      console.warn(`Unable to download ${url}: ${error.message}`);
    }
  }
  let localHtml = html;
  for (const [url, local] of replacements) localHtml = localHtml.replaceAll(url, local);
  return localHtml;
}

function cleanHtml(html) {
  return text(html)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--\s*wp:[\s\S]*?-->/gi, "")
    .replace(/<\/?div[^>]*>/gi, "")
    .replace(/\s(?:class|style|data-[\w-]+|id)=("[^"]*"|'[^']*')/gi, "")
    .replace(/\[expressoes\.[^\]]+\]/gi, "")
    .replace(/\[VOD\]/gi, "")
    .trim();
}

function yaml(value) {
  return `"${text(value).replace(/"/g, '\\"').replace(/[\r\n]+/g, " ").trim()}"`;
}

async function exists(path) {
  try { await access(path, constants.F_OK); return true; } catch { return false; }
}

async function reset() {
  const { rm } = await import("node:fs/promises");
  await Promise.all([
    rm(join(root, "_posts"), { recursive: true, force: true }),
    rm(join(root, "_pages", "wordpress"), { recursive: true, force: true }),
    rm(join(root, "assets", "images", "posts"), { recursive: true, force: true }),
    rm(join(root, "assets", "images", "pages"), { recursive: true, force: true }),
  ]);
}

async function importPosts(posts) {
  await mkdir(join(root, "_posts"), { recursive: true });
  for (const post of posts) {
    const date = post.date.slice(0, 10);
    const filename = `${date}-${post.slug}.md`;
    const path = join(root, "_posts", filename);
    if (await exists(path)) continue;
    const categoryKeys = post.categories.map((id) => categories[id]).filter(Boolean);
    const tagNames = post._embedded?.["wp:term"]?.flat()?.filter((term) => term.taxonomy === "post_tag").map((term) => term.slug) ?? [];
    const featured = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
    const mediaPath = `assets/images/posts/${post.slug}`;
    const body = cleanHtml(await downloadMedia(post.content.rendered, join(root, mediaPath), mediaPath));
    const source = [
      "---",
      `title: ${yaml(post.title.rendered)}`,
      `date: ${post.date.replace("T", " ")} -03:00`,
      `author: ${authors[post.author] ?? "the-archivist"}`,
      `categories: [${categoryKeys.join(", ")}]`,
      `tags: [${tagNames.join(", ")}]`,
      `description: ${yaml(post.excerpt.rendered.replace(/<[^>]+>/g, " "))}`,
      `wordpress_id: ${post.id}`,
      `wordpress_url: ${post.link}`,
      ...(featured ? [`wordpress_featured_image: ${featured}`] : []),
      "---",
      "",
      body,
      "",
    ].join("\n");
    await writeFile(path, source, "utf8");
  }
}

async function importPages(pages) {
  await mkdir(join(root, "_pages", "wordpress"), { recursive: true });
  for (const page of pages) {
    const path = join(root, "_pages", "wordpress", `${page.slug}.md`);
    if (await exists(path)) continue;
    const mediaPath = `assets/images/pages/${page.slug}`;
    const body = cleanHtml(await downloadMedia(page.content.rendered, join(root, mediaPath), mediaPath));
    const source = ["---", `title: ${yaml(page.title.rendered)}`, `permalink: ${new URL(page.link).pathname}`, `wordpress_id: ${page.id}`, "---", "", body, ""].join("\n");
    await writeFile(path, source, "utf8");
  }
}

if (process.argv.includes("--reset")) await reset();
const [posts, pages] = await Promise.all([get("posts"), get("pages")]);
await importPosts(posts);
await importPages(pages);
console.log(`Imported ${posts.length} posts and ${pages.length} pages. Review generated Markdown before publishing.`);
