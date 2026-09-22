# SEO, Analytics e Verificação

## Analytics: Cloudflare Web Analytics

Escolha por causa de privacidade e custo: grátis, sem cookies, sem banner de consentimento, dados fora do Google. A página já usa embed `data-cf-beacon` em `_layouts/default.html` se `_data/analytics.yml` tiver token.

O token do beacon é configuração pública por design — todo visitante enxerga o valor no HTML, então ele pode ir pro repositório sem risco (não é credencial, igual ao ID do giscus). O arquivo `_data/analytics.yml` já está versionado com o token ativo.

## SEO base

Jekyll já roda as gemas `jekyll-seo-tag`, `jekyll-sitemap` e `jekyll-feed`. O `{% seo %}` em `_includes/head.html` gera title, description, canonical, Open Graph e Twitter Cards. `robots.txt` aponta pro `sitemap.xml`.

- Cada página/post deve ter front matter `description` — sem isso o meta cai pro texto genérico do site.
- `image` de capa em posts alimenta `og:image` automaticamente; páginas com capa podem usar `image`.

## Google Search Console (indexação, não métricas)

1. Acesse [Google Search Console](https://search.google.com/search-console) > Verificar propriedade > *Domínio*.
2. A propriedade de domínio pede uma verificação DNS, não só meta tag. No Cloudflare, adicione o registro TXT `google-site-verification=...` copiado do GSC:
   - Cloudflare DNS > Add record: tipo `TXT`, nome `@`, conteúdo `google-site-verification=XXXX`.
3. Confira com `nslookup -qt=TXT trespordez.pages.dev` até o TXT aparecer.
4. Clique em verificar no GSC; a verificação de domínio cobre todas as URLs (com/sem `www`, http/https, subdomínios).
5. Na seção *Sitemaps*, envie `https://trespordez.pages.dev/sitemap.xml` e confirme status "Sucesso".
6. Use *Inspecionar URL* na home pra pedir indexação. A indexação em massa de posts novos demora dias; normal.

## Bing Webmaster Tools (cobre DuckDuckGo)

DuckDuckGo não recebe sitemap manualmente — ele indexa resultados do Bing. Verificar no Bing cobre DDG.

1. Acesse [Bing Webmaster Tools](https://www.bing.com/webmasters) e entre com conta da Microsoft (ou Google).
2. Opção rápida: *Import from GSC* — importa sites que já estão verificados no Google, sem reverificar. Se preferir manual: verificação via meta tag ou TXT DNS.
3. Após verificar, envie `https://trespordez.pages.dev/sitemap.xml` em *Sitemaps*.
4. Use a ferramenta *URL Submission* pra pedir indexação da home.

## Ordem prática

1. Google Search Console (TXT no Cloudflare).
2. Bing Webmaster Tools (importar do GSC).
3. Pedir indexação da home nos dois.
4. Continuar publicando conteúdo com `description` e capa; os crawlers voltam sozinhos no ritmo do sitemap.