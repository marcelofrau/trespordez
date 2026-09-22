# Publishing

1. Create article in `_drafts/` while unfinished.
2. Move it to `_posts/YYYY-MM-DD-slug.md` when ready.
3. Add optimized local images and verify all image paths.
4. If tags changed, run `node scripts/generate-tag-pages.mjs`.
5. Run `node scripts/validate-site.mjs` and `bundle exec jekyll build`.
6. Commit and push `main` after owner approval — pushes to `main` deploy straight to production.

Cloudflare Pages deploys `main` straight to `https://trespordez.pages.dev`. GitHub Actions validates before deploy. To undo a bad publish, revert the commit and push; never rewrite shared history.