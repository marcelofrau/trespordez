# Platform Setup

## GitHub Pages QA

Repository Settings > Pages > Build and deployment > Source: **GitHub Actions**. First workflow run creates `https://marcelofrau.github.io/trespordez/`.

## Giscus

1. Repository Settings > General > Features: enable **Discussions**.
2. Create Discussion category named `Comentários do site`.
3. Install [Giscus GitHub App](https://github.com/apps/giscus) only for `marcelofrau/trespordez`.
4. Open [giscus.app](https://giscus.app/), choose repository and category, then copy repository/category IDs.
5. Add IDs as GitHub Actions variables: `GISCUS_REPO_ID` and `GISCUS_CATEGORY_ID`. Build creates ignored `_data/giscus.yml`; do not commit IDs.
6. Set `GISCUS_REPO_ID` and `GISCUS_CATEGORY_ID` as Cloudflare build variables. Build runs `node scripts/prepare-giscus.mjs` before Jekyll. Do not commit generated `_data/giscus.yml`.

Visitors need a GitHub account to comment. One stable term per post (`post-<slug>`) means QA and production share same discussion.

## Cloudflare Pages Production

1. Log into personal Cloudflare account; do not use corporate account.
2. Workers & Pages > Create application > Pages > Connect to Git.
3. Select `marcelofrau/trespordez`, branch `main`.
4. Build command: `node scripts/prepare-giscus.mjs && bundle exec jekyll build`; output directory: `_site`.
5. Set production Giscus variables if comments are enabled.
6. Add custom domain `trespordez.com.br`; let Cloudflare provide DNS records.
7. Test Pages URL and all historical URLs before changing DNS.
