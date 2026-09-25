# Backloggery ↔ SQLite

O script `scripts/backloggery-sync.py` sincroniza a seleção pessoal do SQLite
para a conta Backloggery. A direção é unidirecional: SQLite → Backloggery. O
script não apaga entradas remotas sem uma operação explícita e não altera o
SQLite.

## Fonte e credenciais

- Fonte local: `data/trespordez.sqlite`, tabela `backlog_items`, player
  `the-archivist`.
- API: endpoints internos JSON do Backloggery.
- Credenciais: `BACKLOGGERY_USERNAME` e `BACKLOGGERY_PASSWORD` no ambiente ou
  no `.env` ignorado pelo Git.
- Evite passar senha em `--password`; prefira `.env`/variáveis de ambiente e nunca
  faça commit de `.env` ou log.

## Matriz de estados

`status` no SQLite usa as chaves canônicas `jogando`, `zerado`, `na-fila`,
`pausado` e `arquivado`. O site já reconhece `jogando`; não há migration nova
para Now Playing.

| Seção | Estado local | Status Backloggery | Prioridade |
| --- | --- | --- | --- |
| `backlog` | `jogando` | Unfinished | Now Playing |
| `backlog` | `zerado` | Beaten | Normal |
| `backlog` | `na-fila` | Unplayed | High |
| `backlog` | `pausado` | Unfinished | Paused |
| `backlog` | `arquivado` | Unplayed | Shelved |
| `backlog` | nulo | Unplayed | Normal |
| `played` | `zerado` ou nulo | Beaten | Normal |
| `played` | `jogando` | Unfinished | Now Playing |
| `played` | `na-fila` | Unplayed | High |
| `played` | `pausado` | Unfinished | Paused |
| `played` | `arquivado` | Unplayed | Shelved |
| `dropped` | qualquer estado reconhecido/nulo | Unfinished | Shelved |
| `catalog` | qualquer estado reconhecido/nulo | Unplayed | Normal |

`dropped` preserva o motivo em `Dropped: ...`. `catalog` fica fora das seções
padrão e só entra com `--sections backlog,played,dropped,catalog`, após aviso
de quantidade.

## Matching e segurança

- Plataformas conhecidas são resolvidas pelos aliases e pelo catálogo da API.
- Item sem plataforma só casa quando existe um único título remoto; ambiguidade vai
  para `unresolved`.
- Item sem plataforma que não encontra correspondência única também fica em
  `unresolved`; não é enviado sem `platform_id`.
- `add_game.php` nunca repete uma resposta 5xx; o sync reconcilia o resultado por
  título/plataforma e aborta se o estado for incerto.
- `delete_game.php` só é considerado sucesso após confirmar que o `game_inst_id`
  sumiu da biblioteca.
- Plataforma desconhecida, título ambíguo e status local inválido nunca são
  silenciosamente convertidos.
- `--apply` cria snapshot JSON da biblioteca antes da primeira escrita.
- Ownership, região e formato físico de itens existentes são preservados; defaults
  só são enviados em itens novos.
- Auditoria de mutações fica em `logs/trespordez-backloggery-audit.jsonl`.
- Prune/delete permanece desativado.

## Uso

Dry-run com preview completo:

```bash
python scripts/backloggery-sync.py --no-interactive
```

Plano JSON:

```bash
python scripts/backloggery-sync.py --no-interactive --json
```

Apply interativo, após revisar o plano:

```bash
python scripts/backloggery-sync.py --apply
```

Apply não interativo exige confirmação explícita:

```bash
python scripts/backloggery-sync.py --apply --no-interactive --yes
```

Um snapshot pode ser fornecido explicitamente com `--snapshot CAMINHO.json`.
Logs e snapshots são ignorados pelo Git.

## Testes

```bash
python -m unittest discover -s tests -p "test_backloggery_sync.py"
```
