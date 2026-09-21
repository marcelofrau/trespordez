# Três por Dez

Static source for [trespordez.com.br](https://trespordez.com.br): Jekyll content, assets, and site design.

## Environments

| Environment | URL | Purpose |
| --- | --- | --- |
| QA | `https://marcelofrau.github.io/trespordez/` | Review migration before DNS cutover |
| Production | `https://trespordez.com.br` | Cloudflare Pages after launch |

## Local development

Install Ruby with Bundler, then run:

```powershell
bundle install
bundle exec jekyll serve
node scripts/validate-site.mjs
```

Open `http://localhost:4000`. Use `bundle exec jekyll build` for a production build.

## Publishing

`main` is direct publishing branch. CI validates content then deploys GitHub Pages QA. Cloudflare Pages builds the same commit for production after its Git integration is configured. Read [docs/publishing.md](docs/publishing.md) before pushing.

## Setup

- [Architecture](docs/architecture.md)
- [Content model](docs/content-model.md)
- [Migration inventory](docs/migration-inventory.md)
- [Cloudflare and Giscus setup](docs/platform-setup.md)
- [Session handoff and current state](docs/handoff.md)
