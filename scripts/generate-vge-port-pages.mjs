import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const videos = [
  ["arcade-duckstation", "Arcade Duck: emulação PS1 em arcade", "Arcade · PlayStation", "Um novo emulador de PS1 voltado a placas arcade.", "ygR5mcpPuFg"],
  ["xemu-fork", "Atualizações do fork Xemu", "Xbox", "Fork de Xemu buscando compatibilidade próxima do hardware original.", "Hu75AmZC2ok"],
  ["paperboat", "PaperBoat: port de Paper Mario", "Nintendo 64", "Port para PC pelo Harbour Masters, em acompanhamento.", "j7NktjRf3lc"],
  ["dreamcast-fpga", "Core FPGA de Dreamcast", "Dreamcast", "Core FPGA em desenvolvimento para acompanhar de perto.", "d5KAbmk98ro"],
  ["fighting-bujutsu", "Fighting Bujutsu jogável", "Arcade", "Jogo de luta raro que ganhou forma jogável por preservação.", "1ZiqpnPkCow"],
  ["satellaview-mario-2", "Satellaview Mario 2 MSU1", "Super Nintendo", "Projeto MSU1 para uma versão Satellaview de Mario.", "wdTd-bULmfQ"],
  ["outrun-2006-port", "OutRun 2006 PC Port", "PC", "Port de OutRun 2006 Coast 2 Coast com melhorias.", "ALxqzmJdYQk"],
  ["bloody-roar-2-recomp", "Bloody Roar 2 Recomp", "PlayStation", "Recomp aprimorado de Bloody Roar 2 em acompanhamento.", "3E4qTCGin1U"],
  ["teknoparrot-updates", "TeknoParrot: atualizações", "Arcade", "Atualizações de compatibilidade em jogos de arcade modernos.", "HZubbPwFx4I"],
  ["ninja-gaiden-2-recomp", "Ninja Gaiden II Recomp", "Arcade", "Recomp em progresso de Ninja Gaiden II.", "DqBH8ddtCUs"],
];

await mkdir(join(root, "_pages", "ports"), { recursive: true });
for (const [slug, title, platform, summary, videoId] of videos) {
  const content = `---\nlayout: port\ntitle: "${title}"\npermalink: /emuladores/ports/${slug}/\nplatform: "${platform}"\nsummary: "${summary}"\nvideo_id: ${videoId}\nsource_url: https://www.youtube.com/watch?v=${videoId}\n---\n`;
  await writeFile(join(root, "_pages", "ports", `${slug}.md`), content, "utf8");
}
console.log(`Generated ${videos.length} Video Game Esoterica port pages.`);
