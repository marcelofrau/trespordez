import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const source = join(process.cwd(), "_library", "Pixel_Art_Emoji_v0_by_ReffPixels", "96x96 (Scaled-up)");
const destination = join(process.cwd(), "assets", "images", "ui", "review");
const icons = [
  ["1_grinning face.png", "grinning.png"],
  ["9_slightly smiling face.png", "slight-smile.png"],
  ["17_star-struck.png", "star-struck.png"],
  ["20_smiling face.png", "smiling.png"],
  ["24_face savoring food.png", "savoring.png"],
  ["47_grimacing face.png", "grimacing.png"],
  ["54_drooling face.png", "drooling.png"],
  ["67_exploding head.png", "exploding.png"],
  ["71_smiling face with sunglasses.png", "sunglasses.png"],
  ["84_face holding back tears.png", "tears.png"],
];

await mkdir(destination, { recursive: true });
await Promise.all(icons.map(([from, to]) => copyFile(join(source, from), join(destination, to))));
console.log(`Synchronized ${icons.length} licensed review icons.`);
