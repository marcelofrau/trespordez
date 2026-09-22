# SEO, Analytics e Verificação

## Analytics: Cloudflare Web Analytics

Escolha por causa de privacidade e custo: grátis, sem cookies, sem banner de consentimento, dados fora do Google. A página já usa embed `data-cf-beacon` em `_layouts/default.html` se `_data/analytics.yml` tiver token.

Ativação no Cloudflare:

1. Dashboard Cloudflare > Analytics & Logs > Web Analytics > Add a site.
2. Escolha o domínio `trespordez.pages.dev`; copie o token do beacon.
3. Crie `_data/analytics.yml` (arquivo é ignorado pelo git — token não vai pro repositório):

```yaml
cloudflare_beacon: "SEU_TOKEN"
```

4. Commit sem o arquivo; o deploy gera o beacon na página.

## SEO

Jekyll já roda as gemas `jekyll-seo-tag`, `jekyll-sitemap` e `jekyll-feed`. O `{% seo %}` em `_includes/head.html` gera title, description, canonical, Open Graph e Twitter Cards. `robots.txt` aponta pro `sitemap.xml`.

- Cada página/post deve ter front matter `description` — sem isso o meta cai pro texto genérico do site.
- `lib/image` de capa em posts alimenta `og:image` automaticamente; páginas com capa podem usar `image`.

## Google Search Console (indexação, não métricas)

1. Acesse Google Search Console > Verificar propriedade > *Domínio*.
2. Adicione registro TXT `google-site-verification=...` na zona DNS do Cloudflare.
3. Confirme a verificação no GSC.
4. Em *Sitemaps* (inspeção), envie `https://trespordez.pages.dev/sitemap.xml`.
5. Use a ferramenta *Inspecionar URL* pra pedir indexação da home e das páginas principais.