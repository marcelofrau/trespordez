# Import WordPress

Read `docs/handoff.md`. Use `scripts/import-wordpress.mjs` with saved API JSON or local `_library`/backup source. Preserve permalink, dates, taxonomy, external links and media. Run `scripts/repair-import.mjs` after import, inspect every generated diff, and remove WordPress runtime markup. Never commit raw source backup or `_library`.
