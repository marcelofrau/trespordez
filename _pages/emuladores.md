---
title: Emuladores
permalink: /emuladores/
---

<p class="page-intro">Catálogo de plataformas, emuladores e referências para manter cada máquina viva.</p>

<div class="platform-grid">
{% for platform in site.data.platforms %}
  <figure class="platform-card">
    {% if platform.url %}<a href="{{ platform.url | relative_url }}">{% endif %}
    <img src="{{ platform.image | relative_url }}" alt="{{ platform.name }}">
    <figcaption>{{ platform.name }}</figcaption>
    {% if platform.url %}</a>{% endif %}
  </figure>
{% endfor %}
</div>
