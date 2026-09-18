---
title: Emuladores
permalink: /emuladores/
---

<p class="page-intro">Catálogo de plataformas, emuladores e referências para manter cada máquina viva.</p>

<div class="platform-grid">
{% assign platforms = site.static_files | where_exp: "file", "file.path contains '/assets/images/pages/emuladores/'" %}
{% for platform in platforms %}
  {% assign name = platform.basename | remove_first: '001-' | remove_first: '002-' | remove_first: '003-' | remove_first: '004-' | remove_first: '005-' | remove_first: '006-' | remove_first: '007-' | remove_first: '008-' | remove_first: '009-' | remove_first: '010-' | remove_first: '011-' | remove_first: '012-' | remove_first: '013-' | remove_first: '014-' | remove_first: '015-' | remove_first: '016-' | remove_first: '017-' | remove_first: '018-' | remove_first: '019-' | remove_first: '020-' | remove_first: '021-' | remove_first: '022-' | remove_first: '023-' | remove_first: '024-' | remove_first: '025-' | remove_first: '026-' | remove_first: '027-' | remove_first: '028-' | remove_first: '029-' | remove_first: '030-' | remove_first: '031-' | remove_first: '032-' | remove_first: '033-' | remove_first: '034-' | remove_first: '035-' | remove_first: '036-' | remove_first: '037-' | remove_first: '038-' | remove_first: '039-' | remove_first: '040-' | remove_first: '041-' | remove_first: '042-' | remove_first: '043-' | remove_first: '044-' | remove_first: '045-' | replace: '-', ' ' %}
  <figure class="platform-card">
    <img src="{{ platform.path | relative_url }}" alt="{{ name }}">
    <figcaption>{{ name }}</figcaption>
  </figure>
{% endfor %}
</div>
