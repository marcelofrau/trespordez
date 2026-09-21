# WordPress Migration Inventory

Source: public WordPress REST API, captured 2026-09-18.

Local recovery source: `C:\Users\fraumar\Downloads\trespordez\07-09-2026`. Contains WordPress SQL database, theme, plugins, and original uploads. It is excluded from Git; use it only to recover missing source media or verify migration.

- 20 posts and 12 pages published.
- 9 categories and 45 tags.
- Historical post URL format is `/:year/:month/:slug/`; retain it.
- About 966 body-media URLs, with WordPress-generated size variants. Import script deduplicates source URL downloads.
- Content requires semantic cleanup: Elementor markup, Modula galleries, inline style/script fragments, 16 YouTube embeds, one Google Sheets iframe, score tables, and a few custom bracket tokens.
- Comments intentionally excluded. Giscus starts new comment history.
- Taxonomy normalization adds missing tags to older reviews, including genre, platform, franchise, and `indie` where source content explicitly supports it.
- Titles with encoding damage need manual review: FXPAK Pro - SNES, Sonic 2006: De perto é ainda pior, Nintendo Switch 2 é Anunciado Oficialmente!, Atari 2600, Política de privacidade, Nintendo - Super Nintendo.
