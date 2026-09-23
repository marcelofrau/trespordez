# Três por Dez

Static source for [trespordez.pages.dev](https://trespordez.pages.dev): Jekyll content, assets, and site design.

## Environments

| Environment | URL | Purpose |
| --- | --- | --- |
| Production | `https://trespordez.pages.dev` | Cloudflare Pages, live |

## Local development

Install Ruby with Bundler, then run:

```powershell
bundle install
bundle exec jekyll serve
node scripts/validate-site.mjs
```

Open `http://localhost:4000`. Use `bundle exec jekyll build` for a production build.

### No Ruby install (Docker)

If installing Ruby locally isn't practical (e.g. locked-down corporate machine), use Docker instead — no Ruby needed on the host:

```bash
./scripts/docker-serve.sh   # bundle install + jekyll serve --livereload on http://localhost:4000
./scripts/docker-build.sh   # bundle install + jekyll build into _site/
node scripts/validate-site.mjs
```

PowerShell equivalents: `scripts/docker-serve.ps1` and `scripts/docker-build.ps1`.

Both wrap `docker compose` (see `docker-compose.yml`) using the official `jekyll/jekyll` image; gems are cached in a named Docker volume so repeat runs are fast.

## Publishing

`main` is direct publishing branch. CI validates content then Cloudflare Pages deploys straight to production. Read [docs/publishing.md](docs/publishing.md) before pushing.

## Setup

- [Architecture](docs/architecture.md)
- [Content model](docs/content-model.md)
- [Migration inventory](docs/migration-inventory.md)
- [Cloudflare and Giscus setup](docs/platform-setup.md)
- [SEO, analytics and verification](docs/seo.md)
- [Session handoff and current state](docs/handoff.md)
