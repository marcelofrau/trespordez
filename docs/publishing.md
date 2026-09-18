# Publishing

1. Create article in `_drafts/` while unfinished.
2. Move it to `_posts/YYYY-MM-DD-slug.md` when ready.
3. Add optimized local images and verify all image paths.
4. Run `node scripts/validate-site.mjs` and `bundle exec jekyll build`.
5. Commit and push `main` after owner approval.

GitHub Pages QA deploys from `main`. Cloudflare production deploys same branch after project setup. To undo production, revert bad commit and push; never rewrite shared history.
