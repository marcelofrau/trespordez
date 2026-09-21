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
  const withoutRuntimeMarkup = content
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
  return normalizeReviewCards(createGalleries(convertScoreTables(withoutRuntimeMarkup)));
}

const scoreIcons = {
  "😀": "grinning.png", "🙂": "smiling.png", "🤩": "star-struck.png", "🤯": "exploding.png",
  "🥹": "tears.png", "😎": "sunglasses.png", "😋": "savoring.png", "😬": "grimacing.png",
  "🤤": "drooling.png", "🎮": "slight-smile.png",
};

function scoreColor(value) {
  const score = Number.parseInt(value, 10);
  if (score >= 10) return "#01ff91";
  if (score >= 9) return "#03c2c9";
  if (score >= 8) return "#972fff";
  if (score >= 7) return "#ff9719";
  return "#fa4946";
}

function normalizeReviewCards(content) {
  return content.replace(/<div class="score-item"(?: style="[^"]*")?>([\s\S]*?)<\/div>/gi, (_item, body) => {
    const face = body.match(/<span class="score-emoji"[^>]*>([^<]+)<\/span>/)?.[1]?.trim() ?? "🎮";
    const score = body.match(/<span class="score-value">([^<]+)<\/span>/)?.[1] ?? "0";
    const icon = scoreIcons[face] ?? "slight-smile.png";
    return `<div class="score-item" style="--score-color:${scoreColor(score)}">${body.replace(/<span class="score-emoji"[^>]*>[^<]+<\/span>/, `<img class="score-icon" src="{{ '/assets/images/ui/review/${icon}' | relative_url }}" alt="">`)}</div>`;
  });
}

function createGalleries(content) {
  return content.replace(/(?:(?:<figure>)?\s*<img\b[^>]*src="\{\{ '\/assets\/images\/(?:posts|pages)\/[^>]+>\s*(?:<\/figure>)?\s*){3,}/gi, (group) => {
    const images = [...group.matchAll(/<img\b[^>]*src="([^"]+)"[^>]*>/gi)];
    if (images.length < 3) return group;
    const items = images.map((match, index) => {
      const tag = match[0].replace(/\s+(?:width|height)="[^"]*"/gi, "");
      const alt = tag.match(/\salt="([^"]*)"/i)?.[1] || `Screenshot ${index + 1}`;
      return `<a href="${match[1]}" aria-label="Abrir ${alt}">${tag}</a>`;
    }).join("\n");
    return `<div class="post-gallery" aria-label="Galeria de screenshots">${items}</div>\n`;
  });
}

function textContent(value) {
  return value.replace(/<[^>]+>/g, "").replace(/&(?:#\d+|#x[\da-f]+|amp|quot);/gi, "").replace(/\s+/g, " ").trim();
}

function emoji(value) {
  const source = value.toLowerCase();
  if (source.includes("star-struck")) return "🤩";
  if (source.includes("exploding-head")) return "🤯";
  if (source.includes("holding-back-tears")) return "🥹";
  if (source.includes("grinning")) return "😀";
  if (source.includes("smiling")) return "🙂";
  if (source.includes("savoring")) return "😋";
  if (source.includes("grimacing")) return "😬";
  if (source.includes("drooling")) return "🤤";
  return "🎮";
}

function legacyEmoji(value) {
  const source = value.toLowerCase();
  if (source.includes("curtindo")) return "😎";
  if (source.includes("feliz")) return "😀";
  if (source.includes("anjo")) return "😇";
  if (source.includes("morto")) return "💀";
  if (source.includes("caveira")) return "☠️";
  if (source.includes("oculos")) return "😎";
  if (source.includes("louco")) return "🤪";
  if (source.includes("dificil")) return "😤";
  return "🎮";
}

function cells(row) {
  return [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((match) => match[1]);
}

function convertScoreTables(content) {
  return content.replace(/<table>\s*<thead>([\s\S]*?)<\/thead>\s*<tbody>([\s\S]*?)<\/tbody>\s*<tfoot>([\s\S]*?)<\/tfoot>\s*<\/table>/gi, (table, header, body, footer) => {
    const headerRows = [...header.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => cells(match[1]));
    const bodyRows = [...body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => cells(match[1]));
    const footerRows = [...footer.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => cells(match[1]));
    const labels = bodyRows[0]?.map(textContent);
    const faces = bodyRows[1];
    const values = footerRows[0]?.map(textContent);
    if (!labels || !faces || !values || labels.length !== values.length || labels.length < 3) return table;
    const title = textContent(headerRows[0]?.[0] ?? "Avaliação");
    const subtitle = textContent(headerRows[1]?.[0] ?? "");
    const items = labels.map((label, index) => `<div class="score-item"><span class="score-label">${label}</span><span class="score-emoji" aria-hidden="true">${emoji(faces[index])}</span><span class="score-value">${values[index]}</span></div>`).join("\n");
    return `<section class="review-score" aria-label="Avaliação de ${title}"><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ""}${items}</section>`;
  });
}

async function restoreLegacyScore(content) {
  const invalidScore = /<section class="review-score" aria-label="Avaliação de ">[\s\S]*?<\/section>/i;
  if (!invalidScore.test(content)) return content;
  const id = content.match(/^wordpress_id:\s*(\d+)$/m)?.[1];
  if (!id) return content.replace(invalidScore, "");
  const response = await fetch(`https://trespordez.com.br/wp-json/wp/v2/posts/${id}`);
  if (!response.ok) return content.replace(invalidScore, "");
  const source = (await response.json()).content.rendered;
  const title = source.match(/'name':\s*"([^"]+)"/)?.[1];
  const subtitle = source.match(/'description':\s*"([^"]+)"/)?.[1];
  const keys = [["graphics", "Gráficos"], ["sound", "Som"], ["gameplay", "Gameplay"], ["challenge", "Desafio"], ["general", "Geral"]];
  const values = keys.map(([key, label]) => {
    const match = source.match(new RegExp(`'${key}':\\s*\\[expressoes\\.([\\w-]+),\\s*cores\\.[\\w-]+,\\s*(\\d+)`, "i"));
    return match ? { label, face: legacyEmoji(match[1]), score: `${match[2]}/10` } : null;
  });
  if (!title || !subtitle || values.some((value) => !value)) return content.replace(invalidScore, "");
  const items = values.map((value) => `<div class="score-item"><span class="score-label">${value.label}</span><span class="score-emoji" aria-hidden="true">${value.face}</span><span class="score-value">${value.score}</span></div>`).join("\n");
  const score = `<section class="review-score" aria-label="Avaliação de ${title}"><h2>${title}</h2><p>${subtitle}</p>${items}</section>`;
  return content.replace(invalidScore, score);
}

for (const file of await markdownFiles(join(root, "_posts"))) {
  let content = await restoreLegacyScore(clean(await readFile(file, "utf8")));
  const slug = file.split(/[\\/]/).pop().replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
  const image = await downloadCover(content, slug) ?? (!/^image:/m.test(content) ? await firstImage(join(root, "assets", "images", "posts", slug)) : null);
  if (image) {
    const path = image.startsWith("/") ? image : `/assets/images/posts/${slug}/${image}`;
    if (/^image:/m.test(content)) {
      content = content.replace(/^image:.*$/m, `image: ${path}`);
    } else {
      content = content.replace(/^(---\r?\n)/, `$1image: ${path}\nimage_alt: ${slug.replace(/-/g, " ")}\n`);
    }
  }
  await writeFile(file, content, "utf8");
}

for (const file of await markdownFiles(join(root, "_pages", "wordpress"))) {
  await writeFile(file, clean(await readFile(file, "utf8")), "utf8");
}

console.log("Imported content repaired.");
