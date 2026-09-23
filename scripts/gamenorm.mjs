// Helpers de normalização de nome para casar itens do backlog com bibliotecas
// externas (Playnite, EmulationStation...). Usados por playnite-backlog.mjs e
// es-gamelist-import.mjs.

export function norm(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Remove região/markers ([US], (U), (Rev 1), (v1.0) ...) de nomes de ROM.
export function stripNoise(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*\([^()]*\)/g, " ")
    .replace(/\s*\[[^[\]]*\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function addedDate(value) {
  if (value == null) return null;
  if (typeof value === "number") return ticksToDate(value);
  const s = String(value).trim();
  if (/^(\d{4})-(\d{2})-(\d{2})/.test(s)) return s.slice(0, 10);
  if (/^\d+$/.test(s)) return ticksToDate(Number(s));
  return null;
}

// .NET ticks (100ns desde 0001-01-01) -> YYYY-MM-DD
export function ticksToDate(ticks) {
  const days = ticks / 8.64e11;
  const ms = (days - 621355968.5) * 86400000;
  return new Date(ms).toISOString().slice(0, 10);
}