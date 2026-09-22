---
title: Backlog
permalink: /backlog/
layout: page
---

<section class="backlog-hero">
  <div>
    <p class="eyebrow">Lista de desejos do time</p>
    <h2><i class="fa-solid fa-chess-king"></i> Cada um com a sua fila de espera.</h2>
    <p>O que cada jogador da casa ainda quer zerar, e o que já saiu da lista — organizado por plataforma e sempre sendo atualizado.</p>
  </div>
</section>

<section class="backlog-hero-list">
  {% for author_pair in site.data.authors %}
    {% assign key = author_pair[0] %}
    {% assign author = author_pair[1] %}
    {% assign data = site.data.backlog[key] %}
    {% unless data %}{% continue %}{% endunless %}
    <a class="backlog-player-card" href="{{ '/backlog/' | append: key | append: '/' | relative_url }}">
      <span class="team-avatar"><img src="{{ author.avatar | relative_url }}" alt="{{ author.name }}" loading="lazy"></span>
      <div>
        <h3>{{ author.name }}</h3>
        <ul class="backlog-stats">
          <li class="backlog-stat{% if data.backlog.size == 0 %} zero{% endif %}"><strong>{{ data.backlog.size }}</strong><span>na fila</span></li>
          <li class="backlog-stat{% if data.played.size == 0 %} zero{% endif %}"><strong>{{ data.played.size }}</strong><span>zerados</span></li>
          <li class="backlog-stat{% if data.dropped.size == 0 %} zero{% endif %}"><strong>{{ data.dropped.size }}</strong><span>abandonados</span></li>
          <li class="backlog-stat{% if data.catalog.size == 0 %} zero{% endif %}"><strong>{{ data.catalog.size }}</strong><span>catálogo</span></li>
        </ul>
        {% assign total = data.backlog.size | plus: data.played.size | plus: data.dropped.size | plus: data.catalog.size %}
        {% if total == 0 %}<p class="backlog-empty">Sem jogos registrados ainda — a fila desse jogador está vazia por enquanto.</p>{% endif %}
      </div>
    </a>
  {% endfor %}
</section>