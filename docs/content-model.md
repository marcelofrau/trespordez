# Content Model

## Post

```yaml
---
title: "Título"
date: 2026-09-18 10:00:00 -03:00
author: the-archivist
categories: [reviews, rpg]
tags: [rpg, review]
description: "Resumo único para busca e redes sociais."
image: /assets/images/posts/exemplo/capa.jpg
image_alt: "Descrição objetiva da imagem"
---
```

`layout: post` is inherited. Existing URLs render as `/:year/:month/:title/`; `slug` must remain stable after publication.

Use categories for primary editorial sections. Use tags for searchable subjects such as `indie`, `jrpg`, `platformer`, `nintendo`, `snes`, `racing`, studio, franchise, and hardware. Keep tags lowercase ASCII and only add tags supported by article content.

## Pages

Place static pages under `_pages/`. Directory path becomes page URL. Example: `_pages/equipe.md` with `permalink: /equipe/`.

## Emulator Platforms

Existing rich platform pages remain under `_pages/wordpress/`. Initial catalogs for systems without migrated editorial content belong in `_pages/platforms/`, use `layout: platform-draft`, and contain only a clear draft notice plus official emulator links. Every platform card on `/emuladores/` must point to its page.

## Data

- `_data/authors.yml`: author identity and profile URL.
- `_data/categories.yml`: category key, display name, canonical historical URL.
- `_data/navigation.yml`: header menu.
- `_data/socials.yml`: external channels.

## Review Scores

Imported and new reviews use `.review-score` with five `.score-item` entries. Every item needs a label, score, purpose-specific ReffPixels icon, and a score color. Use approved icon copies in `assets/images/ui/review/`; never publish raw `_library` assets.
