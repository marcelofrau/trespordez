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

## Pages

Place static pages under `_pages/`. Directory path becomes page URL. Example: `_pages/equipe.md` with `permalink: /equipe/`.

## Data

- `_data/authors.yml`: author identity and profile URL.
- `_data/categories.yml`: category key, display name, canonical historical URL.
- `_data/navigation.yml`: header menu.
- `_data/socials.yml`: external channels.
