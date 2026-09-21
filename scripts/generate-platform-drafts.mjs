import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const systems = [
  ["master-system", "Master System", "Multi-system", "Genesis Plus GX", "https://github.com/ekeeke/Genesis-Plus-GX"],
  ["mega-drive", "Mega Drive", "Multi-system", "BlastEm", "https://www.retrodev.com/blastem/"],
  ["sega-cd", "Sega CD", "Multi-system", "Genesis Plus GX", "https://github.com/ekeeke/Genesis-Plus-GX"],
  ["sega-32x", "Sega 32X", "Multi-system", "PicoDrive", "https://github.com/notaz/picodrive"],
  ["saturn", "Saturn", "Precisão e compatibilidade", "Mednafen", "https://mednafen.github.io/"],
  ["dreamcast", "Dreamcast", "Multi-platform", "Flycast", "https://flycast.dojo.ooo/"],
  ["game-gear", "Game Gear", "Multi-system", "Genesis Plus GX", "https://github.com/ekeeke/Genesis-Plus-GX"],
  ["turbografx-16", "TurboGrafx-16", "Multi-system", "Beetle PCE", "https://docs.libretro.com/library/beetle_pce_fast/"],
  ["pc-engine", "PC Engine", "Multi-system", "Beetle PCE", "https://docs.libretro.com/library/beetle_pce_fast/"],
  ["pc-engine-cd", "PC Engine CD", "Multi-system", "Beetle PCE", "https://docs.libretro.com/library/beetle_pce_fast/"],
  ["nintendo-nes", "Nintendo NES", "Precisão e recursos", "Mesen", "https://www.mesen.ca/"],
  ["nintendo-64", "Nintendo 64", "Multi-platform", "simple64", "https://simple64.github.io/"],
  ["gamecube", "GameCube", "Wii e GameCube", "Dolphin", "https://dolphin-emu.org/"],
  ["wii", "Wii", "Wii e GameCube", "Dolphin", "https://dolphin-emu.org/"],
  ["wii-u", "Wii U", "Wii U", "Cemu", "https://cemu.info/"],
  ["nintendo-switch", "Nintendo Switch", "Em desenvolvimento", "Ryujinx", "https://ryujinx.org/"],
  ["game-boy", "Game Boy", "Game Boy e Game Boy Color", "SameBoy", "https://sameboy.github.io/"],
  ["virtual-boy", "Virtual Boy", "Especializado", "Red Viper", "https://github.com/skyfloogle/red-viper"],
  ["game-boy-color", "Game Boy Color", "Game Boy e Game Boy Color", "SameBoy", "https://sameboy.github.io/"],
  ["nintendo-ds", "Nintendo DS", "DS e DSi", "melonDS", "https://melonds.kuribo64.net/"],
  ["game-boy-advance", "Game Boy Advance", "GBA", "mGBA", "https://mgba.io/"],
  ["arcade", "Arcade", "Preservação arcade", "MAME", "https://www.mamedev.org/"],
  ["vectrex", "Vectrex", "Multi-system", "RetroArch", "https://www.retroarch.com/"],
  ["amiga", "Amiga", "Commodore Amiga", "WinUAE", "https://www.winuae.net/"],
  ["playstation", "PlayStation", "PlayStation original", "DuckStation", "https://www.duckstation.org/"],
  ["playstation-2", "PlayStation 2", "PlayStation 2", "PCSX2", "https://pcsx2.net/"],
  ["psp", "PSP", "PlayStation Portable", "PPSSPP", "https://www.ppsspp.org/"],
  ["playstation-3", "PlayStation 3", "PlayStation 3", "RPCS3", "https://rpcs3.net/"],
  ["playstation-4", "PlayStation 4", "Em desenvolvimento", "shadPS4", "https://shadps4.net/"],
  ["neo-geo-pocket", "Neo Geo Pocket", "Portátil Neo Geo", "Mednafen", "https://mednafen.github.io/"],
  ["neo-geo", "Neo Geo", "Arcade e AES", "FinalBurn Neo", "https://github.com/finalburnneo/FBNeo"],
  ["intellivision", "Intellivision", "Sistema clássico", "jzIntv", "https://spatula-city.org/~im14u2c/intv/"],
  ["zx-spectrum", "ZX Spectrum", "Computador 8-bit", "Fuse", "https://fuse-emulator.sourceforge.net/"],
  ["ports", "Ports", "Jogos portados", "RetroArch", "https://www.retroarch.com/"],
  ["msx", "MSX", "Computador 8-bit", "openMSX", "https://openmsx.org/"],
  ["pc", "PC", "DOS e PCs antigos", "DOSBox-X", "https://dosbox-x.com/"],
  ["windows-95", "Windows 95", "Windows clássico", "PCem", "https://pcem-emulator.co.uk/"],
  ["xbox", "Xbox", "Xbox original", "xemu", "https://xemu.app/"],
  ["xbox-360", "Xbox 360", "Xbox 360", "Xenia", "https://xenia.jp/"],
];

await mkdir(join(root, "_pages", "platforms"), { recursive: true });
for (const [slug, title, profile, emulator, url] of systems) {
  const content = `---\nlayout: platform-draft\ntitle: "${title}"\npermalink: /emuladores/${slug}/\nemulator: true\nsummary: "Rascunho inicial para organizar emuladores, links oficiais e futuros testes desta plataforma."\nemulators:\n  - name: "${emulator}"\n    description: "${profile}"\n    url: "${url}"\n---\n\n`;
  await writeFile(join(root, "_pages", "platforms", `${slug}.md`), content, "utf8");
}
console.log(`Generated ${systems.length} platform drafts.`);
