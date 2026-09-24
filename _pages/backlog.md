---
title: Backlog
permalink: /backlog/
layout: page
---

<section class="backlog-hero">
  <div>
    <p class="eyebrow">Lista de desejos do time</p>
    <h2><i class="fa-solid fa-chess-king"></i> Cada um com a sua fila de espera.</h2>
    <p>O que cada jogador da casa ainda quer zerar e o que já saiu da lista — organizado por plataforma.</p>
  </div>
</section>

<section class="backlog-hero-list">
  {% for author_pair in site.data.authors %}
    {% assign key = author_pair[0] %}
    {% assign author = author_pair[1] %}
    {% assign data = site.data.backlog[key] %}
    {% unless data %}{% continue %}{% endunless %}
    {% assign visible_count_backlog = data.backlog | where_exp: "item", "item.hidden != true" | size %}
    {% assign visible_count_catalog = data.catalog | where_exp: "item", "item.hidden != true" | size %}
    <a class="backlog-player-card" href="{{ '/backlog/' | append: key | append: '/' | relative_url }}">
      <span class="team-avatar"><img src="{{ author.avatar | relative_url }}" alt="{{ author.name }}" loading="lazy"></span>
      <div>
        <h3>{{ author.name }}</h3>
        {% if author.slogan %}<p>{{ author.slogan }}</p>{% endif %}
        <ul class="backlog-stats">
          <li class="backlog-stat{% if visible_count_backlog == 0 %} zero{% endif %}"><strong>{% if visible_count_backlog == 0 %}-{% else %}{{ visible_count_backlog }}{% endif %}</strong><span>na fila</span></li>
          <li class="backlog-stat{% if visible_count_catalog == 0 %} zero{% endif %}"><strong>{% if visible_count_catalog == 0 %}-{% else %}{{ visible_count_catalog }}{% endif %}</strong><span>catálogo</span></li>
        </ul>
      </div>
    </a>
  {% endfor %}
</section>

<section class="quote-card" data-quotes-card>
  <i class="fa-solid fa-quote-left" aria-hidden="true"></i>
  <blockquote></blockquote>
  <figcaption></figcaption>
</section>

{% capture lucky_data_json %}
{
  "players": [
{% for author_pair in site.data.authors %}{% assign key = author_pair[0] %}{% assign author = author_pair[1] %}{% assign data = site.data.backlog[key] %}{% unless data %}{% continue %}{% endunless %}
{% assign candidates = "" %}{% assign genre_bits = "" %}{% assign aff_json = "" %}
{% for item in data.backlog %}{% if item.hidden %}{% continue %}{% endif %}{% capture c %}{"name":{{ item.name | jsonify }},"platform":{{ item.platform | jsonify }},"genre":{{ item.genre | jsonify }},"hot":true{% if item.post_slug %}{% assign rp = site.posts | where: "slug", item.post_slug | first %}{% if rp %},"reviewed":true,"url":{{ rp.url | relative_url | jsonify }}{% endif %}{% endif %}}{% endcapture %}{% assign candidates = candidates | append: c | append: "," %}{% if item.genre %}{% assign genre_bits = genre_bits | append: item.genre | append: "," %}{% endif %}{% endfor %}
{% for item in data.catalog %}{% if item.hidden %}{% continue %}{% endif %}{% assign mod = forloop.index0 | modulo: 25 %}{% if mod == 0 or item.post_slug %}{% capture c %}{"name":{{ item.name | jsonify }},"platform":{{ item.platform | jsonify }},"genre":{{ item.genre | jsonify }},"hot":false{% if item.post_slug %}{% assign rp = site.posts | where: "slug", item.post_slug | first %}{% if rp %},"reviewed":true,"url":{{ rp.url | relative_url | jsonify }}{% endif %}{% endif %}}{% endcapture %}{% assign candidates = candidates | append: c | append: "," %}{% if item.genre %}{% assign genre_bits = genre_bits | append: item.genre | append: "," %}{% endif %}{% endif %}{% endfor %}
{% assign genre_list = genre_bits | split: "," %}{% assign sentinels = "" %}
{% for g in genre_list %}{% assign gg = g | strip | downcase %}{% if gg == "" %}{% continue %}{% endif %}{% if sentinels contains gg %}{% continue %}{% endif %}{% assign sentinels = sentinels | append: gg | append: "~" %}{% assign aff_json = aff_json | append: '"' | append: gg | append: '":1,' %}{% endfor %}
{% assign aff_len = aff_json | size %}{% if aff_len > 0 %}{% assign aff_len = aff_len | minus: 1 %}{% assign aff_json = aff_json | slice: 0, aff_len %}{% endif %}
{% assign cand_len = candidates | size %}{% if cand_len > 0 %}{% assign cand_len = cand_len | minus: 1 %}{% assign candidates = candidates | slice: 0, cand_len %}{% endif %}
{
  "key": {{ key | jsonify }},
  "name": {{ author.name | jsonify }},
  "affinity": { {{ aff_json }} },
  "candidates": [ {{ candidates }} ]
}{% unless forloop.last %},{% endunless %}
{% endfor %}
  ]
}
{% endcapture %}

<section class="backlog-lucky" data-backlog-lucky>
  <header class="backlog-lucky-head">
    <p class="eyebrow"><i class="fa-solid fa-dice" aria-hidden="true"></i> Sorteio guiado</p>
    <h2>To sem ideia do que jogar</h2>
    <p>To sem ideia, o que eu posso jogar agora de acordo com o backlog desses caras?</p>
  </header>
  <div class="backlog-lucky-card" data-backlog-lucky-card aria-live="polite">
    <p class="backlog-lucky-placeholder">Clique no botão pra <strong>sugerir o próximo jogo</strong>.</p>
  </div>
  <button type="button" class="backlog-lucky-btn" data-backlog-lucky-btn>
    <i class="fa-solid fa-dice" aria-hidden="true"></i> To sem ideia
  </button>
  <script type="application/json" id="backlog-lucky-data">{{ lucky_data_json }}</script>
  <script src="{{ '/assets/js/backlog-lucky.js' | relative_url }}?v={{ site.time | date: '%s' }}"></script>
</section>
