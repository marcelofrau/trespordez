# Platform Setup

## Cloudflare Pages Production

1. Log into personal Cloudflare account; do not use corporate account.
2. Workers & Pages > Create application > Pages > Connect to Git.
3. Select `marcelofrau/trespordez`, branch `main`.
4. Build command: `node scripts/backlog-export.mjs && node scripts/prepare-giscus.mjs && bundle exec jekyll build`; output directory: `_site`. Needs `NODE_VERSION=24` (env var) so `node:sqlite` (used by the backlog export) is available.
5. Production Giscus variables are set on Cloudflare.
6. Default Cloudflare Pages domain is `trespordez.pages.dev`; legacy `trespordez.com.br` is being decommissioned (no custom domain).
7. Test historical URLs, Giscus, RSS, sitemap, media assets and external links before deploying.

## Giscus

GitHub Discussions is enabled. Category `SiteComments` exists. Giscus is installed for this repository and site comments are active.

- Theme: `light`.
- Mapping: `specific`, using stable `post-<slug>` term.
- GitHub Actions Variables: `GISCUS_REPO_ID`, `GISCUS_CATEGORY_ID`.
- Build creates ignored `_data/giscus.yml`; do not commit that file.
- Add same variables to Cloudflare Pages (already set in production).

Visitors need a GitHub account to comment. One stable term per post (`post-<slug>`).
