# Backlog — manutenção

> Referência completa para manter os backlogs do Três por Dez. Leia junto com a
> seção **Backlog** do `AGENTS.md`.

## Visão geral

Cada jogador tem uma página em `/backlog/<player>/`, renderizada por
`_layouts/backlog.html` e alimentada por `_data/backlog/<player>.yml`
(exposta no Jekyll como `site.data.backlog.<player>`).

| Player | Página | Dados |
| --- | --- | --- |
| The Archivist | `/backlog/the-archivist/` | `_data/backlog/the-archivist.yml` |

## Fonte dos dados

A fonte original é um Google Sheets público do The Archivist (aba principal
`Backlog pessoal`). O script `scripts/backlog-sync.mjs` baixa as 4 abas pelo
endpoint de CSV público (`/pub?output=csv&gid=<gid>`), normaliza e escreve o
YAML de cada player. **Nenhuma credencial é usada** — a planilha está publicada
como "para quem tiver o link".

O mapeamento player → abas (gid) fica em `PLAYERS` no topo do script. Para
trocar a planilha de um player, atualize `PUB_BASE` e os gids.

## Schema

Todos os valores são strings ou `null`. Emojis de status (`▶️ ✅ ❌ ⏳ …`)
vêm da planilha e **não devem ser traduzidos nem mapeados**.

```yaml
backlog:          # fila de espera
  - name: "Grandia"
    platform: "Saturn"
    status: "▶️"
    mood: null
played:           # zerados / avaliados
  - name: "Expedition 33"
    platform: "PC"
    status: null
    humor: null
    graf: 10       # números ou null
    som: 10
    gameplay: 10
    desafio: 10
    geral: 10
dropped:          # abandonados
  - name: "Grim Fandango"
    platform: "PC"
    reason: "Não valeu"
    humor: null
catalog:          # catálogo de desejos (grande; Grid.js no front)
  - name: "Captain Tomaday"
    platform: "NeoGeo"
    status: null
    humor: null
```

Normalização feita pelo sync: `??`, `?` e `-` viram `null`; notas ficam como
número quando numéricas; linhas sem `name` são descartadas.

## Como atualizar

### 1. Via sync (fonte: Google Sheets)

```bash
node scripts/backlog-sync.mjs
```

- Reescreve `_data/backlog/*.yml` a partir das abas publicadas.
- Mostra contagem por seção; confira se os números batem com o esperado.
- **Cuidado:** qualquer edição manual do YAML é perdida no próximo sync. Use
  um caminho ou o outro, não os dois misturados.

### 2. Via edição direta do YAML

Válido e melhor quando a mudança é pontual (ex.: marcar um jogo como zerado).
Respeite o schema acima e rode a validação depois:

```bash
node scripts/validate-site.mjs
```

### 3. Via Playnite (enriquecer genre e data de adição)

A library local do Playnite (Playnite 10+: `C:\Apps\Playnite\library\`) pode
preencher `genre` e `added_at` nos itens de `backlog` e `catalog`. O script
`scripts/playnite-backlog.mjs` detecta os dois formatos de library (sqlite
antiga `library.db` ou LiteDB nova `games.db` + `genres.db` + `platforms.db`),
extrai um snapshot dos jogos e casa por nome (exato → sem ruído de ROM `[US]`/
`(U)` → prefixo). A extração LiteDB usa `scripts/playnite-extract` (C#,
referencia a `LiteDB.dll` que o próprio Playnite carrega; compila sozinho na
primeira execução via `dotnet`).

```bash
node scripts/playnite-backlog.mjs                                  # dry-run
node scripts/playnite-backlog.mjs --apply                           # preenche genre/added onde vazio
node scripts/playnite-backlog.mjs --apply --overwrite-added         # também sobrescreve added_at
node scripts/playnite-backlog.mjs --unmatched                       # lista jogos sem correspondência
node scripts/playnite-backlog.mjs --apply --add-missing             # adiciona sem-match no catalog (platform "PC")
node scripts/backlog-export.mjs                                    # regenera _data/backlog/*.yml depois
```

Regras: `genre` só é preenchido quando **vazio** (não sobrescreve slugs curados
como `jrpg`/`metroidvania`). `added_at` vira data real do Playnite apenas com
`--overwrite-added` (sem ele a migração deixa a data de hoje como default).
`--add-missing` insere no `catalog` os jogos do Playnite sem match (platform
fixa `"PC"` — coleção atual é toda PC; dry-run lista antes). Itens sem match
aparecem na seção "Sem match" do dry-run e ficam intactos.
Primeira passada (2026-09): 803 itens enriquecidos (664 exatos, 139 por
prefixo) + 244 inseridos no catalog.

### 4. Via EmulationStation (favoritos das coleções)

As coleções do Machine (root `E:\`) têm `gamelist.xml` por sistema; o script
`scripts/es-gamelist-import.mjs` varre o root, ignora arcade/mame e pastas
`_*`, e injeta no `catalog` só os jogos com `<favorite>true</favorite>`.

```bash
node scripts/es-gamelist-import.mjs                                  # dry-run
node scripts/es-gamelist-import.mjs --apply                           # insere no sqlite
node scripts/es-gamelist-import.mjs --apply --json out.json           # grava lista p/ revisão
node scripts/backlog-export.mjs                                      # regenera _data/backlog/*.yml
```

- `platform`: mapeada da pasta de sistema → vocabulário do site (ex. "Sega
  Genesis" → `MegaDrive`); plataformas novas (3DO, Jaguar, X68000…) entram com
  o nome próprio.
- `genre`: copiado cru do `<genre>` do gamelist (ScreenScraper, ex.
  "Shoot'em Up / Vertical-Shoot'em Up") — dá para limpar depois via edição.
- `added_at`: **creation time (Windows) do arquivo de ROM** — o gamelist.xml
  não carrega "date added" e o sort por data do ES-DE usa a criação do arquivo.
- Dedupe por nome normalizado (sem ruído `[US]`/`(U)`/`[!]`) contra `backlog` +
  `catalog`; nada de duplicata.
- Primeira passada (2026-09): 2.116 itens novos (5.079 favoritos em 62
  gamelists; ~2.963 já constavam no backlog).

## Adicionar um jogador

1. `scripts/backlog-sync.mjs` → adicione a chave do player e os gids em `PLAYERS`.
2. `_pages/backlog/<player>.md`:

   ```yaml
   ---
   title: "Backlog — Nome do Player"
   permalink: /backlog/<player>/
   layout: backlog
   player: <player>
   ---
   ```

3. `_data/authors.yml` → chave do player (avatar, nome, slug).
4. `_data/navigation.yml` → filho em `Backlog` apontando para `/backlog/<player>/`.

O index `/backlog/` lista os players automaticamente (loop sobre
`site.data.backlog`).

## Páginas e layout

- `_pages/backlog.md` — índice (`layout: page`, iterando `site.data.backlog`).
- `_pages/backlog/<player>.md` — página por jogador (`layout: backlog`).
- `_layouts/backlog.html` — renderiza seções condicionalmente: fila (agrupada
  por plataforma), zerados (com notas), abandonados e catálogo. Se a seção não
  existir nos dados, ela não aparece.
- O catálogo usa **Grid.js** (busca, ordenação, paginação e filtro por
  plataforma). Arquivos vendored:
  - `assets/js/lib/gridjs.umd.js`
  - `assets/css/lib/mermaid.min.css`
  - **Não** mova para diretórios `vendor/` (ignorados pelo git).
  - Atribuição: `docs/asset-credits.md`.

## Troubleshooting

- **Contagens erradas / itens faltando:** confira se a planilha está com "Publicar
  planilha" ativo (Arquivo → Compartilhar → Publicar na web). O CSV público
  reflete **o que está publicado**, não o estado do editor.
- **Emoji estranho no terminal:** o console do Windows às vezes decodifica
  UTF-8 errado; o arquivo costuma estar correto. Confira com um editor ou
  `node -e "console.log(require('fs').readFileSync('_data/backlog/<p>.yml','utf8'))"`.
- **YAML gigante:** o catálogo do The Archivist tem ~2.400 itens (~250 KB).
  Normal para Jekyll; o Grid.js pagina em cliente.
- **CI/QA verde:** rode `node scripts/validate-site.mjs` e garanta build Jekyll
  limpo antes do push.