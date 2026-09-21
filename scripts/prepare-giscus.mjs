import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const repoId = process.env.GISCUS_REPO_ID;
const categoryId = process.env.GISCUS_CATEGORY_ID;

if (!repoId || !categoryId) {
  console.log("Giscus IDs unavailable; comments remain disabled for this build.");
  process.exit(0);
}

await mkdir(join(process.cwd(), "_data"), { recursive: true });
await writeFile(join(process.cwd(), "_data", "giscus.yml"), `repo_id: ${repoId}\ncategory_id: ${categoryId}\n`, "utf8");
console.log("Prepared Giscus build data.");
