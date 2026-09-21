# Validate Site

Read `docs/handoff.md`. Run `node scripts/validate-site.mjs`; run `bundle exec jekyll build` when Ruby exists. Verify new tags have `/tag/<slug>/` archives, local assets use `relative_url`, and gallery/image references resolve. Report exact failures. Never bypass a failed check.
