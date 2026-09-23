import { openDb } from "./backlog-lib.mjs";

const db = openDb();
for (const t of ["content", "media", "links"]) {
  const cols = db.prepare(`PRAGMA table_info(${t})`).all().map(c => `${c.name}:${c.type}`);
  console.log(t, "→", cols.join(", "));
}
console.log("media count:", db.prepare("SELECT COUNT(*) c FROM media").get().c);
console.log("content by kind:");
for (const r of db.prepare("SELECT kind, COUNT(*) c FROM content GROUP BY kind ORDER BY c DESC").all()) {
  console.log(" ", r.kind, r.c);
}
console.log("meta:");
for (const r of db.prepare("SELECT key, value FROM meta ORDER BY key").all()) {
  console.log(" ", r.key, "=", r.value);
}