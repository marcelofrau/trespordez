---
title: Ports e Recomps
permalink: /emuladores/ports/
---

<section class="software-hero"><p class="eyebrow">Catálogo inicial</p><h2>Ports, recomps e preservação</h2><p>Projetos recentes destacados pelo Video Game Esoterica. Cada entrada preserva o vídeo-fonte e links relevantes; não equivale a review pessoal.</p></section>

<div class="ports-grid">
{% assign ports = site.pages | where_exp: "item", "item.url contains '/emuladores/ports/'" %}
{% for port in ports %}{% unless port.url == page.url %}<a class="port-card" href="{{ port.url | relative_url }}"><span>{{ port.platform }}</span><strong>{{ port.title }}</strong><small>{{ port.summary }}</small></a>{% endunless %}{% endfor %}
</div>
