# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md contains the full, authoritative rules for this repo (identity/git, content rules, images/links, validation, comments, backlog, current site state). Read it in full before substantial work — it is not optional background, it is the spec.

## Project

Static Jekyll site (Ruby) for `trespordez.com.br`, a Portuguese-language (pt-BR) retrogaming/review blog. No backend, no database. GitHub Pages serves QA (`marcelofrau.github.io/trespordez`, noindex); Cloudflare Pages will serve production after DNS cutover (see `docs/architecture.md`, `docs/platform-setup.md`).

## Commands

```powershell
bundle install
bundle exec jekyll serve      # local dev, http://localhost:4000
bundle exec jekyll build      # production build -> _site/
node scripts/validate-site.mjs   # required before publishing/pushing
```

Other one-off scripts (run with `node scripts/<name>.mjs`):
- `backlog-sync.mjs` — regenerates `_data/backlog/<player>.yml` from the published Google Sheets CSV (player→sheet gid map is the `PLAYERS` const inside the file). Overwrites YAML; don't hand-edit right before a sync.
- `generate-tag-pages.mjs` — rebuild after any post's tags change.
- `generate-platform-drafts.mjs` — scaffolds `_pages/platforms/` emulator draft pages.
- `generate-vge-port-pages.mjs` — generates `_pages/ports/` reference pages.
- `import-wordpress.mjs`, `repair-import.mjs` — one-time WordPress migration tooling.
- `sync-brand-assets.mjs`, `sync-review-assets.mjs` — copy curated assets (e.g. ReffPixels icons) into `assets/`.
- `prepare-giscus.mjs` — generates ignored `_data/giscus.yml` from GitHub Actions Variables.

There are no unit tests; `validate-site.mjs` + `jekyll build` are the correctness gate, and CI must be green before deploy. Never bypass checks.

## Git / identity

Personal GitHub account only (`marcelofrau`), local git identity `Marcelo Frau <marcelofrau@gmail.com>`, remote `git@github-personal:marcelofrau/trespordez.git`. Never use a corporate account/credentials/remote/email. `main` is the direct publishing branch — do not push without explicit user approval.

## Architecture notes

- **Content vs. code split**: `_posts/` (reviews/articles), `_pages/` (static pages incl. `wordpress/` migrated rich pages and `platforms/` draft emulator catalogs — these two subtrees have different editorial trust levels, see AGENTS.md), `_data/` (YAML: authors, categories, navigation, platforms, quotes, socials, backlog per-player files), `_layouts/` + `_includes/` (Liquid templates), `assets/` (images/js/css, media organized under `posts/<slug>/` or `pages/<slug>/`).
- **Backlog feature**: per-player pages driven by `_data/backlog/<player>.yml`, rendered via `backlog.html` layout with a client-side vendored Grid.js catalog (`assets/js/lib/gridjs.umd.js`). Sourced from Google Sheets via `backlog-sync.mjs`. Full schema and how to add a new player: see AGENTS.md "Backlog" section and `docs/backlog.md`.
- **`_library/`** is local source material, gitignored, never referenced from the built site — only approved copies land in `assets/`.
- **Comments**: Giscus over GitHub Discussions; IDs come from GitHub Actions Variables at build time into a gitignored `_data/giscus.yml` (not credentials, safe to regenerate, never hand-craft).
- **URLs**: always use Liquid `relative_url` for local links — root-absolute URLs break the GitHub Pages QA subpath deployment.
- Ruby version pinned via `.ruby-version`; `_config.qa.yml` is a QA-only config overlay excluded from the production build.

## Content authoring rules (summarized — see AGENTS.md for full detail)

- Posts: `_posts/YYYY-MM-DD-slug.md`, filename date must match front matter date; published URL (`/:year/:month/:title/`) is immutable once live.
- Reuse `_data/authors.yml` / `_data/categories.yml` keys; don't invent taxonomy without approval.
- Portuguese, informal editorial tone; preserve author meaning when converting migrated WordPress content.
- Markdown first; HTML only for responsive embeds/figures/tables Markdown can't express.
- Long screenshot sequences use `.post-gallery` + PhotoSwipe; review scores use `.review-score`/`.score-item` with approved ReffPixels icons.
