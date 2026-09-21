# Publishing

1. Create article in `_drafts/` while unfinished.
2. Move it to `_posts/YYYY-MM-DD-slug.md` when ready.
3. Add optimized local images and verify all image paths.
4. If tags changed, run `node scripts/generate-tag-pages.mjs`.
5. Run `node scripts/validate-site.mjs` and `bundle exec jekyll build`.
6. Commit and push `main` after owner approval.

GitHub Pages QA deploys from `main`. Confirm workflow is green and open generated QA URL before a production decision. Cloudflare production deploys same branch after project setup. To undo production, revert bad commit and push; never rewrite shared history.
