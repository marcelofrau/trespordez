# Três por Dez Agent Guide

## Scope

Static Jekyll blog. Source repo: `marcelofrau/trespordez`. Production URL: `https://trespordez.com.br`. GitHub Pages QA URL: `https://marcelofrau.github.io/trespordez/`.

## Identity and Git

- Use only personal GitHub account `marcelofrau`.
- Local Git identity must be `Marcelo Frau <marcelofrau@gmail.com>`.
- Remote must use `git@github-personal:marcelofrau/trespordez.git`.
- Never use corporate account, credentials, remote, or email.
- `main` deploys after validation. Do not push without explicit user approval.

## Content Rules

- Posts belong in `_posts/YYYY-MM-DD-slug.md`; date in filename and front matter must match.
- Published post URL is immutable. Preserve WordPress format: `/:year/:month/:title/`.
- Required front matter: `title`, `date`, `author`, `categories`, `tags`, `description`.
- Add `image` and `image_alt` for a cover when source material exists.
- Set `image_position` when needed to keep game logo/title visible in card crops; default is `center 24%`.
- Use `image_fit: contain` for covers where `cover` would cut the title/logo; prefer legible title art over filling the card.
- Reuse keys from `_data/authors.yml` and `_data/categories.yml`; do not invent taxonomy without user approval.
- Tags describe subjects: genre, platform, franchise, studio, hardware, or format. Use lowercase ASCII slugs. Add `indie` only when title, review metadata, or article content establishes independent development.
- Write Portuguese matching existing informal editorial tone. Do not alter author meaning while converting migrated content.
- Markdown first. Use HTML only for responsive video embeds, figures, or tables that Markdown cannot express.
- Platform emulator drafts belong in `_pages/platforms/`. Mark them as initial catalogs until tested editorial recommendations exist; do not present a draft as a personal review.
- Use `relative_url` in layouts/includes for every local URL. Root-absolute URLs break GitHub Pages QA.

## Images and Links

- Keep post media under `assets/images/posts/<slug>/`; page media under `assets/images/pages/<slug>/`.
- Use lowercase ASCII names with hyphens. Keep source attribution in post front matter or nearby Markdown when required.
- Do not hotlink `wp-content` assets. Import local copy before production cutover.
- Preserve existing external links. Never use copyrighted game art beyond assets already owned or published by Três por Dez without approval.
- `_library/` is local source material and must remain ignored. Copy only assets approved for website use into `assets/`.
- ReffPixels Pixel Art Emoji is approved by author for this website. Use only curated copies under `assets/images/ui/review/`; retain attribution in `docs/asset-credits.md`.

## Validation

- Run `bundle exec jekyll build` when Ruby is available.
- Run `node scripts/validate-site.mjs` before publishing.
- CI is required green before deployment. Fix failures; do not bypass checks.

## Comments

- Giscus configuration is disabled until repository Discussions, category, and GitHub App are configured.
- Do not expose Giscus IDs, access tokens, or Cloudflare secrets in repository files.
