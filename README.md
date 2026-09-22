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

## Publishing

`main` is direct publishing branch. CI validates content then Cloudflare Pages deploys straight to production. Read [docs/publishing.md](docs/publishing.md) before pushing.

## Setup

- [Architecture](docs/architecture.md)
- [Content model](docs/content-model.md)
- [Migration inventory](docs/migration-inventory.md)
- [Cloudflare and Giscus setup](docs/platform-setup.md)
- [Session handoff and current state](docs/handoff.md)
