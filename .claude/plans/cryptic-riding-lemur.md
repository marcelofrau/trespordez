# Plano: ligar backlog↔posts de verdade + estruturar notas de review no sqlite

## Context

Sqlite (`data/trespordez.sqlite`) hoje só serve o backlog (tabelas `meta`,
`players`, `backlog_items`). O usuário perguntou o que mais o banco poderia
fazer pelo site; brainstorm (ver histórico) levantou 5 direções, e o usuário
escolheu duas pra detalhar agora:

- **A.** `_layouts/backlog.html:38-51,71-81` decide se um item do backlog "já
  tem review" comparando `downcase`+`contains` (substring) entre o nome do
  item e o título de cada post — frágil (falso positivo/negativo em nomes
  parecidos) e caro (loop duplo em Liquid, todo build). A coluna
  `backlog_items.post_slug` já existe no schema mas está sempre `NULL`.
- **B.** 14 de 22 posts têm nota de review só como HTML solto dentro do
  markdown (bloco `.review-score`/`.score-item`, ex.
  `_posts/2023-11-06-somerville.md:42-46`: 5 itens fixos, sempre na ordem
  Gráficos/Som/Gameplay/Desafio/Geral, valor `"N/10"`, sem forma estruturada
  em nenhum lugar). Isso é sabido divergir às vezes da nota `geral` do sheet
  de backlog (`docs/sqlite-architecture.md` já cita o caso "Art of Rally 10
  no sheet vs 9 no card").

Resolver A primeiro dá a peça que falta (`post_slug` confiável) pra B virar
uma checagem de consistência de verdade (nota do sheet vs nota do post pelo
mesmo slug) — as duas tarefas se encaixam.

## Escopo

1. Popular `backlog_items.post_slug` com matching correto (substituindo o
   substring frágil por igualdade normalizada, com miss ficando `NULL` em
   vez de chute).
2. Exportar `post_slug` pro YAML e simplificar `_layouts/backlog.html` pra
   usar `site.posts | where: "slug", item.post_slug` em vez do loop de
   substring.
3. Criar tabela `scores` no sqlite e um script que extrai as 5 notas de cada
   post com bloco `.review-score` (regex sobre o markdown).
4. Adicionar checagem de consistência sheet-vs-post em `scripts/validate-site.mjs`
   (falha o build/validação se a nota `geral` do backlog e a nota `Geral` do
   post divergirem, quando ambas existirem pro mesmo `post_slug`).

Fora de escopo (não pedido ainda): páginas novas ("melhores notas",
estatísticas), busca global, consolidar geradores de página — ficam como
ideias futuras já registradas no histórico da conversa.

## Arquivos e mudanças

### `scripts/backlog-lib.mjs`
- Adicionar `CREATE TABLE IF NOT EXISTS scores (...)` no `SCHEMA` (colunas:
  `content_slug TEXT PRIMARY KEY, graf REAL, som REAL, gameplay REAL,
  desafio REAL, geral REAL, raw TEXT`), mesmo desenho já proposto em
  `docs/sqlite-architecture.md`.
- Adicionar helper `upsertScore(db, slug, values, raw)`.

### `scripts/backlog-link-posts.mjs` (novo)
- Lê `_posts/*.md`, monta `{ slug (nome do arquivo sem data/ext), title }`
  pra cada post (front matter `title`).
- Pra cada `backlog_items` linha com `post_slug IS NULL`: normaliza (trim,
  lowercase, remove acentos) `item.name` e `post.title`; casa só em
  **igualdade exata normalizada** (não substring) — se bater com exatamente
  um post, `UPDATE ... SET post_slug = ?`. Ambíguo ou sem match: fica `NULL`,
  reportado no output pra revisão manual (sem chute silencioso).
- Roda manualmente (ou pode ser chamado no fim de `backlog-sync.mjs` depois
  de sincronizar do Sheets, pra novos itens linkarem sozinhos).

### `scripts/backlog-export.mjs`
- Em `playerSections`: emitir `item.post_slug = row.post_slug` quando não for
  `null` (mesmo padrão dos outros campos opcionais já existentes ali).

### `_layouts/backlog.html`
- Remover os dois blocos de loop duplo com `downcase`/`contains`/`break`
  (linhas ~28-91, o `{% capture featured_cards %}`).
- Substituir por: pra cada item, `{% assign matched = site.posts | where: "slug", item.post_slug | first %}`;
  se existir, renderiza o card `has-review` linkando pro post; senão, card
  comum (mesmo HTML de card que já existe hoje, só sem o cálculo custoso).
- Resultado: mesma UI, lógica muito mais simples e sem falso-positivo.

### `scripts/scores-ingest.mjs` (novo)
- Lê `_posts/*.md`, procura `<section class="review-score" ...>...</section>`.
- Extrai cada `.score-item`: `score-label` (texto) → mapeia pt/en pro slot
  fixo (Gráficos/Graphics→graf, Som/Sound→som, Gameplay→gameplay,
  Desafio/Challenge→desafio, Geral/Overall→geral); `score-value` → número
  antes do `/` (tolera `"8/10"`, `"8.5/10"`, `"8"`).
- `upsertScore(db, slug, {graf,som,gameplay,desafio,geral}, rawBlockHtml)`.
- Roda manualmente quando posts com review mudam (não precisa ser todo
  build — conteúdo de post é estável); pode entrar no CI depois se quiser
  automatizar.

### `scripts/validate-site.mjs`
- Depois das checagens atuais: abrir o sqlite (`openDb` de
  `backlog-lib.mjs`), pra cada `backlog_items` com `section='played'`,
  `post_slug IS NOT NULL` e `geral IS NOT NULL`: buscar `scores.geral` pelo
  mesmo slug; se ambos existirem e divergirem, `console.warn(...)` com os
  dois valores (mensagem clara: "nota sheet X vs nota post Y").
- **Só avisa, não bloqueia** — não entra em `errors`/`process.exit(1)`;
  divergência de nota não é conteúdo quebrado, então não trava build/CI.

## Verificação

1. `node scripts/backlog-link-posts.mjs` — checar output: quantos itens
   linkaram, quantos ficaram `NULL` (esperado: a maioria dos itens `catalog`/
   `backlog`/`dropped` não tem post ainda; `played` deve linkar bem).
2. `node scripts/scores-ingest.mjs` — checar output: 14 posts processados,
   valores extraídos batem com o markdown original (spot-check 2-3 posts).
3. `node scripts/backlog-export.mjs` — abrir `_data/backlog/the-archivist.yml`
   gerado e confirmar `post_slug` aparece nos itens certos.
4. `./scripts/docker-build.sh` (ou `.ps1`) — build completo, abrir a página
   do backlog no `_site/` gerado e confirmar que os cards com review linkam
   pro post certo (visual, mesmo comportamento de antes).
5. `node scripts/validate-site.mjs` — roda limpo, e forçar uma divergência
   proposital (editar um valor) pra confirmar que o erro aparece.

