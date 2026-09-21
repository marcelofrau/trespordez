---
layout: category
title: Pérolas desconhecidas
category_key: hiddengems
permalink: /category/hiddengems/
---

<section class="gem-intro">
  <p>Jogos que mereciam muito mais conversa. Esta seleção começa com títulos que o Três por Dez já revisou e vai crescer com novas descobertas.</p>
  <div class="gem-links">
    {% for post in site.posts %}{% if post.tags contains 'indie' %}<a href="{{ post.url | relative_url }}">{{ post.title }}</a>{% endif %}{% endfor %}
  </div>
</section>
