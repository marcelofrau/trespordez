---
title: Backlog
permalink: /backlog/
layout: page
---

<section class="backlog-hero">
  <div>
    <p class="eyebrow">Lista de desejos do time</p>
    <h2>Cada um com a sua fila de espera.</h2>
    <p>O que cada jogador da casa ainda quer zerar, e o que já saiu da lista — organizado por plataforma e sempre sendo atualizado.</p>
  </div>
</section>

<section class="backlog-hero-list">
  {% for player_key in site.data.backlog %}
    {% assign key = player_key[0] %}
    {% assign data = player_key[1] %}
    {% assign author = site.data.authors[key] %}
    <a class="backlog-player-card" href="{{ '/backlog/' | append: key | append: '/' | relative_url }}">
      <span class="team-avatar"><img src="{{ author.avatar | relative_url }}" alt="{{ author.name }}"></span>
      <div>
        <h3>{{ author.name }}</h3>
        <ul class="backlog-stats">
          <li class="backlog-stat"><strong>{{ data.backlog.size }}</strong><span>na fila</span></li>
          <li class="backlog-stat"><strong>{{ data.played.size }}</strong><span>zerados</span></li>
          <li class="backlog-stat"><strong>{{ data.dropped.size }}</strong><span>abandonados</span></li>
          <li class="backlog-stat"><strong>{{ data.catalog.size }}</strong><span>no catálogo</span></li>
        </ul>
      </div>
    </a>
  {% endfor %}
</section>