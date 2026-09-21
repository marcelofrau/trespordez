# Platform Setup

## GitHub Pages QA

Repository Settings > Pages > Build and deployment > Source: **GitHub Actions**. First workflow run creates `https://marcelofrau.github.io/trespordez/`.

## Giscus

GitHub Discussions is enabled. Category `SiteComments` exists. Giscus is installed for this repository and site comments are active.

- Theme: `light`.
- Mapping: `specific`, using stable `post-<slug>` term.
- GitHub Actions Variables: `GISCUS_REPO_ID`, `GISCUS_CATEGORY_ID`.
- Build creates ignored `_data/giscus.yml`; do not commit that file.
- Add same variables to Cloudflare Pages before production cutover.

Visitors need a GitHub account to comment. One stable term per post (`post-<slug>`) means QA and production share same discussion.

## Cloudflare Pages Production

1. Log into personal Cloudflare account; do not use corporate account.
2. Workers & Pages > Create application > Pages > Connect to Git.
3. Select `marcelofrau/trespordez`, branch `main`.
4. Build command: `node scripts/prepare-giscus.mjs && bundle exec jekyll build`; output directory: `_site`.
5. Set production Giscus variables if comments are enabled.
6. Add custom domain `trespordez.com.br`; let Cloudflare provide DNS records.
7. Test Pages URL and all historical URLs before changing DNS.
8. Run `node scripts/validate-site.mjs`, verify GitHub Actions is green, test desktop/mobile QA, Giscus, RSS, sitemap, historical URLs, local images, and external links.
