import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const assets = [
  ["https://trespordez.com.br/wp-content/uploads/2025/07/cropped-logo-full-1.png", "logo.png"],
  ["https://trespordez.com.br/wp-content/uploads/2025/01/hbc-banner.jpg", "header-backdrop.jpg"],
];

await mkdir(join(root, "assets", "images", "site"), { recursive: true });
for (const [url, name] of assets) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to download ${url}: ${response.status}`);
  await writeFile(join(root, "assets", "images", "site", name), Buffer.from(await response.arrayBuffer()));
}
console.log("Brand assets synchronized.");
