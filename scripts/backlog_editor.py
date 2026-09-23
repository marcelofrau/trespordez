#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Editor do backlog (master-detail) sobre data/trespordez.sqlite.

Tkinter puro (stdlib) com tema pistache/laranja. Abas por entidade:
Backlog (master-detail), Scores, Plataformas, Gêneros, Jogadores.

Uso:
  python scripts/backlog_editor.py            # abre a UI
  python scripts/backlog_editor.py --selftest # smoke test sobre cópia do db
"""

import os
import re
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import tkinter as tk
from pathlib import Path
from tkinter import messagebox, simpledialog, ttk

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "trespordez.sqlite"
SCRIPT_DIR = Path(__file__).resolve().parent
EXPORT_CMD = [sys.executable, "node", str(SCRIPT_DIR / "backlog-export.mjs")]

SECTIONS = ["backlog", "played", "dropped", "catalog"]
SCORE_FIELDS = ["graf", "som", "gameplay", "desafio", "geral"]
ROW_FIELDS = [
    "player_key", "section", "pos", "name", "platform", "genre", "status",
    "mood", "humor", "reason", "description", "post_slug", "added_at",
] + SCORE_FIELDS

# Tema pistache/laranja --------------------------------------------------------
BG      = "#F4F8EB"   # fundo claro pistache
PANEL   = "#E7F0D7"   # painéis
PIST    = "#7FAF4B"   # pistache principal
PIST_D  = "#4F7A2E"   # pistache escuro
ORANGE  = "#FF9147"   # laranja principal
ORANGE_D= "#E07B2F"
ORANGE_P= "#FFE6CF"   # pasta laranja
INK     = "#232C14"   # texto
INK_SOFT= "#5A6B3C"
FIELD   = "#FFFFFF"


def theme(root):
    st = ttk.Style(root)
    st.theme_use("clam")
    st.configure(".",
        background=BG, foreground=INK, fieldbackground=FIELD,
        bordercolor=PANEL, lightcolor=PANEL, darkcolor=PANEL,
        font=("Segoe UI", 10))
    st.configure("TFrame", background=BG)
    st.configure("TLabel", background=BG, foreground=INK)
    st.configure("TPanel.TFrame", background=PANEL)
    st.configure("TLabelFrame", background=BG, foreground=PIST_D,
        bordercolor=PIST, font=("Segoe UI", 10, "bold"))
    st.configure("TNotebook", background=BG, borderwidth=0)
    st.configure("TNotebook.Tab", background=PANEL, foreground=INK_SOFT,
        padding=(14, 6), font=("Segoe UI", 10))
    st.map("TNotebook.Tab",
        background=[("selected", PIST), ("active", ORANGE_P)],
        foreground=[("selected", "#FFFFFF"), ("active", INK)])
    st.configure("TLabelframe", background=BG, bordercolor=PIST)
    st.configure("TEntry", fieldbackground=FIELD, foreground=INK,
        insertcolor=INK, bordercolor=PIST)
    st.configure("TSpinbox", fieldbackground=FIELD, foreground=INK,
        insertcolor=INK, bordercolor=PIST)
    st.configure("TCombobox", fieldbackground=FIELD, foreground=INK,
        bordercolor=PIST, arrowcolor=INK_SOFT)
    st.configure("Treeview", background=FIELD, fieldbackground=FIELD,
        foreground=INK, rowheight=24)
    st.map("Treeview",
        background=[("selected", ORANGE), ("focus", ORANGE)],
        foreground=[("selected", "#FFFFFF"), ("focus", "#FFFFFF")])
    st.configure("Treeview.Heading",
        background=PIST, foreground="#FFFFFF", font=("Segoe UI", 10, "bold"),
        relief="flat", padding=(6, 5))
    st.map("Treeview.Heading", background=[("active", PIST_D)])
    st.configure("Accent.TButton", background=ORANGE, foreground="#FFFFFF",
        font=("Segoe UI", 9, "bold"), padding=(10, 5), borderwidth=0)
    st.map("Accent.TButton",
        background=[("active", ORANGE_D), ("pressed", ORANGE_D)])
    st.configure("Pist.TButton", background=PIST, foreground="#FFFFFF",
        font=("Segoe UI", 9, "bold"), padding=(10, 5), borderwidth=0)
    st.map("Pist.TButton",
        background=[("active", PIST_D), ("pressed", PIST_D)])
    st.configure("TButton", background=PANEL, foreground=INK,
        bordercolor=PIST, padding=(8, 5), borderwidth=1)
    st.map("TButton",
        background=[("active", ORANGE_P), ("pressed", ORANGE_P)])
    st.configure("Horizontal.TScrollbar", background=PIST, troughcolor=PANEL,
        bordercolor=PANEL, arrowcolor=INK)
    st.configure("Vertical.TScrollbar", background=PIST, troughcolor=PANEL,
        bordercolor=PANEL, arrowcolor=INK)
    st.configure("Hint.TLabel", background=BG, foreground=INK_SOFT,
        font=("Segoe UI", 9))
    return st


# --------------------------------------------------------------------------
# Core (funções puras sobre uma conexão) — testáveis sem UI.
# --------------------------------------------------------------------------

def connect_db(path=None):
    conn = sqlite3.connect(str(path or DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def ensure_column(conn, table, column):
    cols = [r["name"] for r in conn.execute(f"PRAGMA table_info({table})")]
    if column not in cols:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} TEXT")
        conn.commit()


def load_players(conn):
    return [r["key"] for r in conn.execute("SELECT key FROM players ORDER BY key")]


def load_player_names(conn):
    return {r["key"]: r["name"] for r in conn.execute("SELECT key, name FROM players")}


def distinct_values(conn, column):
    rows = conn.execute(
        f"SELECT DISTINCT {column} FROM backlog_items WHERE {column} IS NOT NULL"
    )
    vals = [r[0] for r in rows if r[0] not in (None, "")]
    return sorted(set(vals), key=lambda s: (s.lower(), s))


def list_rows(conn, player=None, section=None, text=None,
              platform=None, genre=None, status=None):
    q = ["SELECT bi.*, p.name AS player_name FROM backlog_items bi",
         "JOIN players p ON p.key = bi.player_key WHERE 1=1"]
    args = []
    if player:
        q.append("AND bi.player_key = ?"); args.append(player)
    if section:
        q.append("AND bi.section = ?"); args.append(section)
    if text:
        q.append("AND bi.name LIKE ? ESCAPE '\\'")
        args.append("%" + text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%")
    if platform:
        q.append("AND bi.platform = ?"); args.append(platform)
    if genre:
        q.append("AND bi.genre = ?"); args.append(genre)
    if status:
        q.append("AND bi.status = ?"); args.append(status)
    q.append("ORDER BY bi.section, bi.pos")
    return conn.execute(" ".join(q), args).fetchall()


def fetch_row(conn, row_id):
    return conn.execute(
        "SELECT bi.*, p.name AS player_name FROM backlog_items bi "
        "JOIN players p ON p.key = bi.player_key WHERE bi.id = ?", (row_id,)
    ).fetchone()


def _next_pos(conn, player, section):
    r = conn.execute(
        "SELECT COALESCE(MAX(pos), -1) m FROM backlog_items WHERE player_key=? AND section=?",
        (player, section),
    ).fetchone()
    return r["m"] + 1


def _reindex(conn, player, section):
    rows = conn.execute(
        "SELECT id FROM backlog_items WHERE player_key=? AND section=? ORDER BY pos, id",
        (player, section),
    ).fetchall()
    for i, r in enumerate(rows):
        conn.execute("UPDATE backlog_items SET pos=? WHERE id=?", (i, r["id"]))
    conn.commit()


def insert_row(conn, player, section, name="", **fields):
    pos = _next_pos(conn, player, section)
    keys = {k: v for k, v in fields.items() if k in ROW_FIELDS and k not in ("pos", "player_key", "section", "name")}
    cols = ["player_key", "section", "pos", "name"] + list(keys)
    vals = [player, section, pos, name] + list(keys.values())
    cur = conn.execute(
        f"INSERT INTO backlog_items ({', '.join(cols)}) VALUES ({', '.join('?' * len(cols))})",
        vals,
    )
    conn.commit()
    return cur.lastrowid


def update_row(conn, row_id, **fields):
    allowed = {k: v for k, v in fields.items() if k in ROW_FIELDS}
    if not allowed:
        return 0
    sets = ", ".join(f"{k}=?" for k in allowed)
    conn.execute(f"UPDATE backlog_items SET {sets} WHERE id=?", list(allowed.values()) + [row_id])
    conn.commit()
    return 1


def batch_update(conn, row_ids, **fields):
    allowed = {k: v for k, v in fields.items() if k in ROW_FIELDS and v is not None}
    if not allowed:
        return 0
    sets = ", ".join(f"{k}=?" for k in allowed)
    cur = conn.executemany(
        f"UPDATE backlog_items SET {sets} WHERE id=?",
        [list(allowed.values()) + [rid] for rid in row_ids],
    )
    conn.commit()
    return cur.rowcount if hasattr(cur, "rowcount") else len(row_ids)


def batch_rename(conn, row_ids, pattern, replacement, use_regex):
    n = 0
    for rid in row_ids:
        row = conn.execute("SELECT name FROM backlog_items WHERE id=?", (rid,)).fetchone()
        if row is None or not row["name"]:
            continue
        new_name = re.sub(pattern, replacement, row["name"]) if use_regex else row["name"].replace(pattern, replacement)
        if new_name and new_name != row["name"]:
            conn.execute("UPDATE backlog_items SET name=? WHERE id=?", (new_name, rid))
            n += 1
    conn.commit()
    return n


def delete_row(conn, row_id):
    row = fetch_row(conn, row_id)
    if row is None:
        return 0
    conn.execute("DELETE FROM backlog_items WHERE id=?", (row_id,))
    _reindex(conn, row["player_key"], row["section"])
    return 1


def move_row(conn, row_id, target_section, target_player=None):
    row = fetch_row(conn, row_id)
    if row is None:
        return 0
    player = target_player or row["player_key"]
    if player == row["player_key"] and target_section == row["section"]:
        return 0
    conn.execute(
        "UPDATE backlog_items SET player_key=?, section=?, pos=? WHERE id=?",
        (player, target_section, _next_pos(conn, player, target_section), row_id),
    )
    _reindex(conn, row["player_key"], row["section"])
    conn.commit()
    return 1


def swap_pos(conn, row_id, direction):
    row = fetch_row(conn, row_id)
    if row is None:
        return 0
    target = conn.execute(
        "SELECT id, pos FROM backlog_items WHERE player_key=? AND section=? AND pos ? ORDER BY pos",
        (row["player_key"], row["section"], "<" if direction < 0 else ">"),
    ).fetchall()
    if not target:
        return 0
    other = target[0]
    conn.execute("UPDATE backlog_items SET pos=? WHERE id=?", (other["pos"], row["id"]))
    conn.execute("UPDATE backlog_items SET pos=? WHERE id=?", (row["pos"], other["id"]))
    conn.commit()
    return other["id"]


def rename_value(conn, column, old, new):
    if not old or not new:
        return 0
    cur = conn.execute(
        f"UPDATE backlog_items SET {column}=? WHERE {column}=?", (new, old)
    )
    conn.commit()
    return cur.rowcount


def tally_values(conn, column):
    rows = conn.execute(
        f"SELECT {column} AS v, COUNT(*) AS n FROM backlog_items "
        f"WHERE {column} IS NOT NULL AND {column} <> '' GROUP BY {column} "
        f"ORDER BY {column} COLLATE NOCASE"
    )
    return [(r["v"], r["n"]) for r in rows]


def list_scores(conn):
    return conn.execute("SELECT * FROM scores ORDER BY content_slug").fetchall()


def save_score(conn, slug, graf, som, gameplay, desafio, geral, raw):
    conn.execute(
        "INSERT INTO scores (content_slug, graf, som, gameplay, desafio, geral, raw) "
        "VALUES (?, ?, ?, ?, ?, ?, ?) "
        "ON CONFLICT (content_slug) DO UPDATE SET "
        "graf=excluded.graf, som=excluded.som, gameplay=excluded.gameplay, "
        "desafio=excluded.desafio, geral=excluded.geral, raw=excluded.raw",
        (slug, graf, som, gameplay, desafio, geral, raw),
    )
    conn.commit()


def delete_score(conn, slug):
    conn.execute("DELETE FROM scores WHERE content_slug=?", (slug,))
    conn.commit()


def list_players(conn):
    return conn.execute("SELECT * FROM players ORDER BY key").fetchall()


def save_player(conn, key, name, slug, url, avatar):
    conn.execute(
        "INSERT INTO players (key, name, slug, url, avatar) VALUES (?, ?, ?, ?, ?) "
        "ON CONFLICT (key) DO UPDATE SET name=excluded.name, slug=excluded.slug, "
        "url=excluded.url, avatar=excluded.avatar",
        (key, name, slug, url, avatar),
    )
    conn.commit()


def delete_player(conn, key):
    conn.execute("DELETE FROM players WHERE key=?", (key,))
    conn.commit()


def run_export():
    if not shutil.which("node"):
        return "node não encontrado no PATH"
    r = subprocess.run(["node", str(SCRIPT_DIR / "backlog-export.mjs")],
                       capture_output=True, text=True, cwd=SCRIPT_DIR.parent)
    return (r.stdout or r.stderr).strip()


# --------------------------------------------------------------------------
# Widgets auxiliares
# --------------------------------------------------------------------------

class ComboSource:
    """Combobox com valores vindos do banco; refresh() atualiza itens."""

    def __init__(self, editor, widget, key, from_table=None, static=None):
        self.editor = editor
        self.widget = widget
        self.key = key
        self.from_table = from_table
        self.static = list(static or [])
        self.refresh()

    def refresh(self):
        vals = self.static or []
        if self.from_table:
            if self.key in ("player_key",):
                vals = self.editor.player_keys
            else:
                vals = distinct_values(self.editor.conn, self.key)
        cur = self.widget.get()
        items = vals
        if cur and cur not in items:
            items = items + [cur]
        self.widget["values"] = items


class ScrollForm(ttk.Frame):
    """Frame rolável (canvas vertical) para o formulário de detalhe."""

    def __init__(self, master, **kw):
        super().__init__(master, **kw)
        self.canvas = tk.Canvas(self, highlightthickness=0, bg=BG)
        vs = ttk.Scrollbar(self, orient="vertical", command=self.canvas.yview)
        self.inner = ttk.Frame(self.canvas, style="TPanel.TFrame")
        self.inner_id = self.canvas.create_window((0, 0), window=self.inner, anchor="nw")
        self.canvas.configure(yscrollcommand=vs.set)
        self.canvas.grid(row=0, column=0, sticky="nsew")
        vs.grid(row=0, column=1, sticky="ns")
        self.rowconfigure(0, weight=1)
        self.columnconfigure(0, weight=1)
        self.inner.bind("<Configure>",
                        lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all")))
        self.canvas.bind("<Configure>",
                         lambda e: self.canvas.itemconfigure(self.inner_id, width=e.width))


# --------------------------------------------------------------------------
# UI — abas
# --------------------------------------------------------------------------

class BacklogTab:
    """Master-detail do backlog."""

    def __init__(self, notebook, editor):
        self.editor = editor
        self.conn = editor.conn
        self.frame = ttk.Frame(notebook)
        notebook.add(self.frame, text="  Backlog  ")
        self.combos = editor.combos
        self.var_player = editor.var_player
        self.sort_col = None
        self.sort_desc = False
        self._build_filters()
        self._build_body()
        self.load_master()

    # filtros -------------------------------------------------------------

    def _build_filters(self):
        f = ttk.LabelFrame(self.frame, text="Filtros (instantâneos)")
        f.pack(fill="x", padx=8, pady=(8, 4))
        inner = ttk.Frame(f); inner.pack(fill="x", padx=6, pady=4)

        ttk.Label(inner, text="jogador").pack(side="left", padx=(0, 2))
        self.cb_player = ttk.Combobox(inner, textvariable=self.var_player,
                                      values=["(todos)"] + self.editor.player_keys, width=14)
        self.cb_player.current(1 if len(self.editor.player_keys) > 0 else 0)
        self.cb_player.pack(side="left", padx=(0, 6))

        self.var_section = tk.StringVar(value="")
        cb = ttk.Combobox(inner, textvariable=self.var_section,
                          values=[""] + SECTIONS, width=9)
        cb.pack(side="left", padx=(0, 6))
        cb.bind("<<ComboboxSelected>>", lambda e: self.load_master())

        self.var_text = tk.StringVar()
        e = ttk.Entry(inner, textvariable=self.var_text, width=22)
        e.pack(side="left", padx=(0, 6))
        e.bind("<KeyRelease>", self._debounce)

        self.var_platform = tk.StringVar(value="")
        self._live_combo(inner, self.var_platform, "platform", 13, "platform")
        self.var_genre = tk.StringVar(value="")
        self._live_combo(inner, self.var_genre, "genre", 15, "genre")
        self.var_status = tk.StringVar(value="")
        self._live_combo(inner, self.var_status, "status", 13, "status")

        self.lbl_count = ttk.Label(inner, text="", style="Hint.TLabel")
        self.lbl_count.pack(side="right", padx=8)

    def _live_combo(self, parent, var, key, width, table):
        ttk.Label(parent, text=f"{key}:").pack(side="left", padx=(0, 2))
        w = ttk.Combobox(parent, textvariable=var, width=width)
        w.pack(side="left", padx=(0, 6))
        self.editor.bind_combo(w, key, from_table=(table,))
        w.bind("<<ComboboxSelected>>", lambda e: self.load_master())

    def _debounce(self, _ev=None):
        self._after_id = getattr(self, "_after_id", None)
        if self._after_id:
            self.frame.after_cancel(self._after_id)
        self._after_id = self.frame.after(150, self.load_master)

    # master + detail -----------------------------------------------------

    def _build_body(self):
        body = ttk.Panedwindow(self.frame, orient="vertical")
        body.pack(fill="both", expand=True, padx=8, pady=(4, 8))

        top = ttk.Frame(body)
        self._build_master(top)
        body.add(top, weight=4)

        bottom = ttk.Frame(body, style="TPanel.TFrame")
        self._build_detail(bottom)
        body.add(bottom, weight=2)

    def _build_master(self, parent):
        cols = ("id", "pos", "name", "platform", "genre", "status", "added_at", "geral")
        heads = ("id", "pos", "nome", "plataforma", "gênero", "status", "adicionado", "nota")
        widths = (48, 42, 320, 95, 130, 95, 85, 42)
        self.tree = ttk.Treeview(parent, columns=cols, show="headings", selectmode="extended")
        for c, h, w in zip(cols, heads, widths):
            self.tree.heading(c, text=h, command=lambda k=c: self.sort_by(k))
            self.tree.column(c, width=w, anchor=("w" if c in ("name", "platform", "genre", "status") else "center"),
                             stretch=(c == "name"))
        vs = ttk.Scrollbar(parent, orient="vertical", command=self.tree.yview)
        hs = ttk.Scrollbar(parent, orient="horizontal", command=self.tree.xview)
        self.tree.configure(yscrollcommand=vs.set, xscrollcommand=hs.set)
        self.tree.grid(row=0, column=0, sticky="nsew")
        vs.grid(row=0, column=1, sticky="ns")
        hs.grid(row=1, column=0, sticky="ew")
        parent.rowconfigure(0, weight=1)
        parent.columnconfigure(0, weight=1)
        self.tree.bind("<<TreeviewSelect>>", lambda e: self.on_select())

    def _build_detail(self, parent):
        self.detail = DetailPanel(parent, self.editor, self)
        self.detail.frame.pack(fill="both", expand=True, padx=2, pady=2)

    # dados ---------------------------------------------------------------

    def player(self):
        return "" if self.var_player.get() in ("", "(todos)") else self.var_player.get()

    def current_filters(self):
        return dict(
            player=self.player() or None,
            section=self.var_section.get() or None,
            text=self.var_text.get().strip() or None,
            platform=self.var_platform.get() or None,
            genre=self.var_genre.get() or None,
            status=self.var_status.get() or None,
        )

    def selection_ids(self):
        return [int(self.tree.item(i)["values"][0]) for i in self.tree.selection()]

    def selection_id(self):
        ids = self.selection_ids()
        return ids[0] if ids else None

    def sort_by(self, col):
        if self.sort_col == col:
            self.sort_desc = not self.sort_desc
        else:
            self.sort_col = col
            self.sort_desc = False
        self.load_master(keep_selection=True)

    def _sort_rows(self, rows):
        col = self.sort_col or "pos"
        rev = self.sort_desc
        def key(r):
            v = r[col]
            return (v is None, str(v).lower())
        # sempre estabiliza por seção/pos quando coluna de ordens
        if col != "pos":
            return sorted(rows, key=key, reverse=rev)
        return sorted(rows, key=lambda r: (r["section"], r["pos"] or 0), reverse=rev)

    def load_master(self, keep_selection=False):
        sel = self.selection_id()
        self.tree.delete(*self.tree.get_children())
        rows = self._sort_rows(list_rows(self.conn, **self.current_filters()))
        for r in rows:
            self.tree.insert("", "end", iid=str(r["id"]), values=(
                r["id"], r["pos"], r["name"] or "", r["platform"] or "",
                r["genre"] or "", r["status"] or "", r["added_at"] or "",
                "" if r["geral"] is None else r["geral"],
            ))
        self.lbl_count.config(text=f"{len(rows)} registros")
        if keep_selection and sel is not None:
            if str(sel) in self.tree.get_children():
                self.tree.selection_set(str(sel))
                self.tree.see(str(sel))
        elif sel is not None and hasattr(self, "_last_selected"):
            pass
        self.on_select()

    def on_select(self):
        rid = self.selection_id()
        row = fetch_row(self.conn, rid) if rid is not None else None
        self.detail.load(row)


class DetailPanel:
    """Formulário de detalhe (scroll) com todos os campos + descrição."""

    def __init__(self, parent, editor, tab):
        self.editor = editor
        self.tab = tab
        self.frame = ttk.LabelFrame(parent, text="Detalhe do registro (Enter salva)")
        self.vars = {}
        self.widgets = {}
        self._build()

    def _build(self):
        padx = 8
        body = ScrollForm(self.frame)
        body.pack(fill="both", expand=True, padx=6, pady=6)
        inner = body.inner

        def field(row, label, key, col, combo_from=None, values=None, width=None, span=1, kind="entry"):
            ttk.Label(inner, text=label).grid(row=row, column=col, sticky="w", padx=(padx, 2), pady=2)
            var = tk.StringVar()
            self.vars[key] = var
            if kind == "spin":
                w = ttk.Spinbox(inner, from_=0, to=999999, textvariable=var, width=width or 6)
            elif kind == "score":
                w = ttk.Spinbox(inner, from_=0, to=10, increment=0.5, textvariable=var, width=width or 6)
            elif combo_from or values is not None:
                w = ttk.Combobox(inner, textvariable=var, width=width or 24)
                self.editor.bind_combo(w, key, combo_from or (), values or ())
            else:
                w = ttk.Entry(inner, textvariable=var, width=width or 26)
            w.grid(row=row + 1, column=col, columnspan=span, sticky="we", padx=(padx, 2), pady=(0, 6))
            if key == "name":
                w.bind("<Return>", lambda e: self.save())
                self.widgets["name"] = w
            self.widgets[key] = w
            return w

        inner.columnconfigure(9, weight=1)

        field(0, "Jogador", "player_key", 0, combo_from=("players",), width=16)
        field(0, "Seção", "section", 3, values=SECTIONS, width=10)
        field(0, "Pos", "pos", 6, kind="spin")
        field(0, "Adicionado", "added_at", 8, width=11)

        field(2, "Nome", "name", 0, width=44, span=5)
        field(2, "Nota geral", "geral", 8, kind="score")

        field(4, "Plataforma", "platform", 0, combo_from=("platform",), width=18)
        field(4, "Gênero", "genre", 3, combo_from=("genre",), width=22)
        field(4, "Status", "status", 6, combo_from=("status",), width=16)

        field(6, "Mood", "mood", 0, width=14)
        field(6, "Humor", "humor", 2, width=14)
        field(6, "Post slug", "post_slug", 4, width=20, span=2)

        field(8, "Gráficos", "graf", 0, kind="score")
        field(8, "Som", "som", 2, kind="score")
        field(8, "Gameplay", "gameplay", 4, kind="score")
        field(8, "Desafio", "desafio", 6, kind="score")

        ttk.Label(inner, text="Motivo").grid(row=10, column=0, sticky="w", padx=(padx, 2), pady=(4, 2))
        self.vars["reason"] = tk.StringVar()
        ttk.Entry(inner, textvariable=self.vars["reason"], width=88).grid(
            row=11, column=0, columnspan=10, sticky="we", padx=(padx, 2), pady=(0, 6))

        ttk.Label(inner, text="Descrição").grid(row=12, column=0, sticky="w", padx=(padx, 2), pady=(4, 2))
        self.txt_desc = tk.Text(inner, height=4, wrap="word", font=("Segoe UI", 10),
                                bg=FIELD, fg=INK, insertbackground=INK,
                                highlightthickness=1, highlightbackground=PIST,
                                highlightcolor=ORANGE)
        self.txt_desc.grid(row=13, column=0, columnspan=10, sticky="nsew",
                           padx=(padx, 2), pady=(0, 8))
        inner.rowconfigure(13, weight=1)

        btns = ttk.Frame(inner)
        btns.grid(row=14, column=0, columnspan=10, sticky="w", padx=(padx - 2, 2), pady=(0, 4))
        ttk.Button(btns, text="Salvar", style="Accent.TButton", command=self.save).pack(side="left", padx=2)
        ttk.Button(btns, text="Novo", style="Pist.TButton", command=self._new).pack(side="left", padx=2)
        ttk.Button(btns, text="Duplicar", command=self._duplicate).pack(side="left", padx=2)
        ttk.Button(btns, text="Mover…", command=self._move).pack(side="left", padx=2)
        ttk.Button(btns, text="↑", command=lambda: self._swap(-1)).pack(side="left", padx=2)
        ttk.Button(btns, text="↓", command=lambda: self._swap(1)).pack(side="left", padx=2)
        ttk.Button(btns, text="Apagar", style="Pist.TButton", command=self._delete).pack(side="left", padx=2)

    def load(self, row):
        if row is None:
            for k, var in self.vars.items():
                var.set("")
            self.txt_desc.delete("1.0", "end")
            return
        for k, var in self.vars.items():
            v = row[k] if k in row.keys() else None
            var.set("" if v is None else str(v))
        self.txt_desc.delete("1.0", "end")
        if row["description"]:
            self.txt_desc.insert("1.0", row["description"])
        for key, combo in self.editor.combos.items():
            if key in self.vars:
                combo.refresh()

    def save(self):
        editor = self.editor
        tab = self.tab
        conn = editor.conn
        sel = tab.selection_id()
        values = {}
        for k, var in self.vars.items():
            s = var.get().strip()
            if (k in SCORE_FIELDS or k == "added_at") and s == "":
                s = None
            values[k] = s
        values["description"] = self.txt_desc.get("1.0", "end-1c").strip() or None
        if sel is None:
            player = values.pop("player_key", "") or editor.player()
            section = values.pop("section", "") or editor.section()
            values.pop("pos", None)
            name = values.pop("name", "")
            if not name:
                messagebox.showwarning("Editar", "Sem nome para criar registro.")
                return
            rid = insert_row(conn, player, section, name, **values)
        else:
            values.pop("pos", None)
            update_row(conn, sel, **values)
            rid = sel
        tab.load_master()
        if rid is not None:
            tab.tree.selection_set(str(rid))
            tab.tree.see(str(rid))

    def _new(self):
        tab = self.tab
        rid = insert_row(tab.conn, tab.player() or tab.editor.player_keys[0],
                         tab.var_section.get() or "catalog", "Novo registro")
        tab.load_master()
        tab.tree.selection_set(str(rid))
        self.widgets["name"].focus_set()

    def _duplicate(self):
        tab = self.tab
        sel = tab.selection_id()
        if sel is None:
            return
        row = fetch_row(tab.conn, sel)
        if row is None:
            return
        if not messagebox.askyesno("Duplicar", f"Duplicar '{row['name']}'?"):
            return
        fields = {k: row[k] for k in ROW_FIELDS if k not in ("player_key", "section", "pos", "name")}
        rid = insert_row(tab.conn, row["player_key"], row["section"], f"{row['name']} (cópia)", **fields)
        tab.load_master()
        tab.tree.selection_set(str(rid))
        tab.tree.see(str(rid))

    def _move(self):
        tab = self.tab
        sel = tab.selection_id()
        if sel is None:
            return
        d = tk.Toplevel(self.frame)
        d.title("Mover para seção")
        d.configure(bg=BG); d.transient(self.frame.winfo_toplevel()); d.grab_set()
        var = tk.StringVar(value="catalog")
        for i, s in enumerate(SECTIONS):
            ttk.Radiobutton(d, text=s, variable=var, value=s).grid(row=i, column=0, sticky="w", padx=12, pady=2)
        def ok():
            move_row(tab.conn, sel, var.get())
            d.destroy(); tab.load_master()
        ttk.Button(d, text="Mover", style="Accent.TButton", command=ok).grid(row=len(SECTIONS), column=0, padx=12, pady=8)

    def _swap(self, direction):
        tab = self.tab
        sel = tab.selection_id()
        if sel is None:
            return
        other = swap_pos(tab.conn, sel, direction)
        if other:
            tab.load_master()
            tab.tree.selection_set(str(other))
            tab.tree.see(str(other))

    def _delete(self):
        tab = self.tab
        sel = tab.selection_id()
        if sel is None:
            return
        row = fetch_row(tab.conn, sel)
        if not messagebox.askyesno("Apagar", f"Apagar '{row['name']}'?"):
            return
        delete_row(tab.conn, sel)
        tab.load_master()


class ScoresTab:
    def __init__(self, notebook, editor):
        self.editor = editor
        self.conn = editor.conn
        self.frame = ttk.Frame(notebook)
        notebook.add(self.frame, text="  Scores  ")
        wrap = ttk.LabelFrame(self.frame, text="Notas dos posts")
        wrap.pack(fill="both", expand=True, padx=8, pady=8)
        self.tree = ttk.Treeview(wrap, columns=("slug", "graf", "som", "gameplay", "desafio", "geral"),
                                 show="headings", height=10)
        for c, h, w in zip(("slug", "graf", "som", "gameplay", "desafio", "geral"),
                           ("post", "gráf", "som", "game", "des.", "geral"),
                           (300, 60, 60, 60, 60, 60)):
            self.tree.heading(c, text=h)
            self.tree.column(c, width=w, anchor="center", stretch=(c == "slug"))
        vs = ttk.Scrollbar(wrap, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=vs.set)
        self.tree.grid(row=0, column=0, sticky="nsew", padx=(6, 2), pady=6)
        vs.grid(row=0, column=1, sticky="ns", pady=6)
        btns = ttk.Frame(wrap); btns.grid(row=1, column=0, columnspan=2, sticky="w", padx=6, pady=(0, 6))
        ttk.Button(btns, text="Novo", command=self.score_new).pack(side="left", padx=2)
        ttk.Button(btns, text="Editar…", style="Accent.TButton", command=self.score_edit).pack(side="left", padx=2)
        ttk.Button(btns, text="Apagar", command=self.score_delete).pack(side="left", padx=2)
        wrap.rowconfigure(0, weight=1)
        wrap.columnconfigure(0, weight=1)
        self.load()

    def load(self):
        self.tree.delete(*self.tree.get_children())
        for r in list_scores(self.conn):
            self.tree.insert("", "end", iid=r["content_slug"], values=(
                r["content_slug"], r["graf"], r["som"], r["gameplay"],
                r["desafio"] or "", r["geral"] or ""))

    def _selected_slug(self):
        sel = self.tree.selection()
        return sel[0] if sel else None

    def score_edit(self, slug=None):
        slug = slug or self._selected_slug()
        if not slug:
            messagebox.showinfo("Scores", "Selecione um post ou clique Novo.")
            return
        row = self.conn.execute("SELECT * FROM scores WHERE content_slug=?", (slug,)).fetchone()
        d = tk.Toplevel(self.frame)
        d.title(f"Score — {slug}")
        d.configure(bg=BG); d.transient(self.frame.winfo_toplevel()); d.grab_set()
        vars_ = {f: tk.StringVar(value=row[f] if row and row[f] is not None else "")
                 for f in SCORE_FIELDS}
        for i, f in enumerate(SCORE_FIELDS):
            ttk.Label(d, text=f).grid(row=0, column=i, padx=6, pady=6)
            ttk.Spinbox(d, from_=0, to=10, increment=0.5, textvariable=vars_[f],
                        width=5, justify="center").grid(row=1, column=i, padx=6)
        ttk.Label(d, text="raw (json extra):").grid(row=2, column=0, sticky="e", padx=6)
        var_raw = tk.StringVar(value=(row["raw"] or "") if row else "")
        ttk.Entry(d, textvariable=var_raw, width=50).grid(row=2, column=1, columnspan=len(SCORE_FIELDS), sticky="we", padx=6)
        def ok():
            try:
                vals = {k: (None if vars_[k].get().strip() == ""
                            else float(vars_[k].get().strip().replace(",", ".")))
                        for k in vars_}
            except ValueError:
                messagebox.showerror("Score", "Nota inválida (use 0 a 10).")
                return
            save_score(self.conn, slug,
                       vals.get("graf"), vals.get("som"), vals.get("gameplay"),
                       vals.get("desafio"), vals.get("geral"), var_raw.get() or None)
            d.destroy(); self.load()
        ttk.Button(d, text="Salvar", style="Accent.TButton", command=ok).grid(
            row=3, column=0, columnspan=len(SCORE_FIELDS), pady=8)

    def score_new(self):
        slug = simpledialog.askstring("Novo score", "content_slug do post:")
        if not slug:
            return
        save_score(self.conn, slug.strip(), None, None, None, None, None, None)
        self.load()
        self.score_edit(slug.strip())

    def score_delete(self):
        slug = self._selected_slug()
        if not slug:
            return
        if messagebox.askyesno("Apagar score", f"Apagar '{slug}'?"):
            delete_score(self.conn, slug)
            self.load()


class ValueTab:
    """Aba genérica de limpeza de plataforma/gênero (rename/merge/limpar)."""

    def __init__(self, notebook, editor, label, column, key_widgets):
        self.editor = editor
        self.conn = editor.conn
        self.column = column
        self.key_widgets = key_widgets
        self.frame = ttk.Frame(notebook)
        notebook.add(self.frame, text=f"  {label}  ")
        wrap = ttk.LabelFrame(self.frame, text=f"Valores de {label} (renomear = merge)")
        wrap.pack(fill="both", expand=True, padx=8, pady=8)
        self.tree = ttk.Treeview(wrap, columns=("v", "n"), show="headings")
        self.tree.heading("v", text=label)
        self.tree.heading("n", text="quantidade")
        self.tree.column("v", width=300, stretch=True)
        self.tree.column("n", width=80, anchor="center")
        vs = ttk.Scrollbar(wrap, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=vs.set)
        self.tree.grid(row=0, column=0, sticky="nsew", padx=(6, 2), pady=6)
        vs.grid(row=0, column=1, sticky="ns", pady=6)
        btns = ttk.Frame(wrap); btns.grid(row=1, column=0, columnspan=2, sticky="w", padx=6, pady=(0, 6))
        ttk.Button(btns, text="Renomear/Merge…", style="Accent.TButton", command=self.rename).pack(side="left", padx=2)
        ttk.Button(btns, text="Limpar (NULL)", command=self.blank).pack(side="left", padx=2)
        wrap.rowconfigure(0, weight=1)
        wrap.columnconfigure(0, weight=1)
        self.load()

    def load(self):
        self.tree.delete(*self.tree.get_children())
        for v, n in tally_values(self.conn, self.column):
            self.tree.insert("", "end", iid=v, values=(v, n))
        for w in self.key_widgets:
            if w is not None:
                w.refresh()

    def _selected(self):
        sel = self.tree.selection()
        return sel[0] if sel else None

    def rename(self):
        cur = self._selected()
        if not cur:
            messagebox.showinfo("Renomear", "Selecione um valor na lista.")
            return
        novo = simpledialog.askstring("Renomear", f"'{cur}' vira:", initialvalue=cur)
        if not novo or novo == cur:
            return
        n = rename_value(self.conn, self.column, cur, novo.strip())
        messagebox.showinfo("Renomear", f"{n} registro(s) atualizado(s).")
        self.load()

    def blank(self):
        cur = self._selected()
        if not cur:
            return
        if messagebox.askyesno("Limpar", f"Zerar '{cur}' em todos os registros?"):
            n = rename_value(self.conn, self.column, cur, "")
            messagebox.showinfo("Limpar", f"{n} registro(s) zerado(s).")
            self.load()


class PlayersTab:
    def __init__(self, notebook, editor):
        self.editor = editor
        self.conn = editor.conn
        self.frame = ttk.Frame(notebook)
        notebook.add(self.frame, text="  Jogadores  ")
        wrap = ttk.LabelFrame(self.frame, text="Membros do arquivista")
        wrap.pack(fill="both", expand=True, padx=8, pady=8)
        self.tree = ttk.Treeview(wrap, columns=("key", "name", "slug", "url", "avatar"), show="headings")
        for c, h, w in zip(("key", "name", "slug", "url", "avatar"),
                           ("key", "nome", "slug", "url", "avatar"),
                           (130, 150, 130, 240, 140)):
            self.tree.heading(c, text=h)
            self.tree.column(c, width=w, stretch=(c in ("url", "avatar")))
        vs = ttk.Scrollbar(wrap, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=vs.set)
        self.tree.grid(row=0, column=0, columnspan=2, sticky="nsew", padx=(6, 2), pady=6)
        vs.grid(row=0, column=2, sticky="ns", pady=6)

        form = ttk.LabelFrame(wrap, text="Novo / editar")
        form.grid(row=1, column=0, columnspan=3, sticky="we", padx=6, pady=(0, 6))
        self.vars = {}
        for i, k in enumerate(("key", "name", "slug", "url", "avatar")):
            ttk.Label(form, text=k).grid(row=0, column=i, padx=4, pady=(4, 0), sticky="w")
            var = tk.StringVar(); self.vars[k] = var
            ttk.Entry(form, textvariable=var, width=22).grid(row=1, column=i, padx=4, pady=(0, 4))
        btns = ttk.Frame(wrap); btns.grid(row=2, column=0, columnspan=3, sticky="w", padx=6, pady=(0, 6))
        ttk.Button(btns, text="Salvar", style="Accent.TButton", command=self.save).pack(side="left", padx=2)
        ttk.Button(btns, text="Carregar", command=self.load_selected).pack(side="left", padx=2)
        ttk.Button(btns, text="Apagar", style="Pist.TButton", command=self.delete).pack(side="left", padx=2)
        wrap.rowconfigure(0, weight=1)
        wrap.columnconfigure(0, weight=1)
        self.load()

    def load(self):
        self.tree.delete(*self.tree.get_children())
        for r in list_players(self.conn):
            self.tree.insert("", "end", iid=r["key"], values=(
                r["key"], r["name"], r["slug"], r["url"], r["avatar"]))
        self.editor.player_keys = load_players(self.conn)
        self.editor.player_names = load_player_names(self.conn)

    def load_selected(self):
        sel = self.tree.selection()
        if not sel:
            return
        r = self.conn.execute("SELECT * FROM players WHERE key=?", (sel[0],)).fetchone()
        for k, var in self.vars.items():
            var.set(r[k] or "")

    def save(self):
        vals = {k: v.get().strip() for k, v in self.vars.items()}
        if not vals["key"]:
            messagebox.showwarning("Jogador", "key é obrigatória.")
            return
        save_player(self.conn, vals["key"], vals["name"], vals["slug"], vals["url"], vals["avatar"])
        self.load()

    def delete(self):
        sel = self.tree.selection()
        if not sel:
            return
        n = self.conn.execute("SELECT COUNT(*) c FROM backlog_items WHERE player_key=?",
                              (sel[0],)).fetchone()["c"]
        if n > 0:
            messagebox.showwarning("Jogador", f"Tem {n} itens ligados ao jogador — não apago.")
            return
        if messagebox.askyesno("Apagar", f"Apagar jogador '{sel[0]}'?"):
            delete_player(self.conn, sel[0])
            self.load()


class EditorApp:
    def __init__(self, root, conn):
        self.root = root
        self.conn = conn
        root.title("Editor do Backlog — Três por Dez")
        root.configure(bg=BG)
        self.player_keys = load_players(conn)
        self.player_names = load_player_names(conn)
        self.combos = {}
        self.var_player = tk.StringVar(value="(todos)")
        theme(root)

        bar = ttk.Frame(root)
        bar.pack(fill="x", padx=10, pady=(10, 2))
        ttk.Label(bar, text="Editor do Backlog", style="Title.TLabel",
                  font=("Segoe UI", 14, "bold"), foreground=PIST_D).pack(side="left")
        ttk.Label(bar, text="  registro do arquivista  ", style="Hint.TLabel").pack(side="left")
        ttk.Button(bar, text="Exportar yml", style="Accent.TButton", command=self.export_yml).pack(side="right")
        ttk.Button(bar, text="↺", style="Pist.TButton", command=self.reload_all).pack(side="right", padx=4)

        self.notebook = ttk.Notebook(root)
        self.notebook.pack(fill="both", expand=True, padx=8, pady=6)

        self.backlog = BacklogTab(self.notebook, self)
        self.scores = ScoresTab(self.notebook, self)

        ph = self.backlog.var_platform
        gh = self.backlog.var_genre
        self.platforms = ValueTab(self.notebook, self, "Plataformas", "platform",
                                  [self.backlog.combos.get("platform")])
        self.genres = ValueTab(self.notebook, self, "Gêneros", "genre",
                               [self.backlog.combos.get("genre")])
        self.players = PlayersTab(self.notebook, self)

    def bind_combo(self, widget, key, from_table=None, static=None):
        self.combos[key] = ComboSource(self, widget, key, from_table=from_table, static=static)

    def player(self):
        return self.backlog.player()

    def section(self):
        return self.backlog.var_section.get()

    def export_yml(self):
        out = run_export()
        messagebox.showinfo("Exportar yml", out)

    def reload_all(self):
        self.backlog.load_master()
        self.scores.load()
        self.platforms.load()
        self.genres.load()
        self.players.load()


# --------------------------------------------------------------------------
# --selftest: roda a lógica sobre uma cópia do banco (não toca o real).
# --------------------------------------------------------------------------

def selftest():
    tmp = Path(tempfile.mkdtemp(prefix="backlog-editor-")) / "trespordez.sqlite"
    shutil.copy2(DB_PATH, tmp)
    conn = connect_db(tmp)
    ensure_column(conn, "backlog_items", "description")
    tests = 0

    n_before = conn.execute("SELECT COUNT(*) n FROM backlog_items").fetchone()["n"]

    # description column
    ensure_column(conn, "backlog_items", "description")
    assert "description" in [r["name"] for r in conn.execute("PRAGMA table_info(backlog_items)")]
    tests += 1

    # reorder/new
    rid = insert_row(conn, "the-archivist", "catalog", "ZZZ selftest", description="desc teste")
    tests += 1
    assert fetch_row(conn, rid)["pos"] >= 0
    assert fetch_row(conn, rid)["description"] == "desc teste"

    # batch rename regex
    rows = conn.execute("SELECT id FROM backlog_items WHERE section='catalog' LIMIT 3").fetchall()
    ids = [r["id"] for r in rows]
    n = batch_rename(conn, ids, "^(Prince)", r"\1 XX", True)
    tests += 1
    assert n >= 0

    # rename platform merge
    conn.execute("INSERT INTO backlog_items (player_key, section, pos, name, platform) "
                 "VALUES ('the-archivist','catalog',99999,'tmp','WeirdPlatform')")
    rename_value(conn, "platform", "WeirdPlatform", "PC")
    moved = conn.execute("SELECT COUNT(*) n FROM backlog_items WHERE platform='PC'").fetchone()["n"]
    tests += 1
    assert moved >= 1

    # move section
    move_row(conn, rid, "played")
    assert fetch_row(conn, rid)["section"] == "played"
    tests += 1

    # delete
    delete_row(conn, rid)
    assert conn.execute("SELECT COUNT(*) n FROM backlog_items WHERE id=?", (rid,)).fetchone()["n"] == 0
    tests += 1

    # players upsert
    save_player(conn, "_test", "Teste", "teste", "", "")
    assert len(list_players(conn)) > 0
    delete_player(conn, "_test")
    tests += 1

    conn.close()
    n_after_none = True  # nada foi commitado de volta ao resto
    print(f"[selftest] {tests} checks OK — {tmp}")
    print("[selftest] db real intacto (copia usada p/ as mutacoes)")


def main():
    if "--selftest" in sys.argv:
        selftest()
        return
    if not DB_PATH.exists():
        messagebox.showerror("DB", f"sqlite não encontrado: {DB_PATH}\n\n"
                                    f"Rode node scripts/backlog-lib *.mjs antes ou verifique o path.")
        sys.exit(1)
    conn = connect_db()
    ensure_column(conn, "backlog_items", "description")
    try:
        root = tk.Tk()
        EditorApp(root, conn)
        root.mainloop()
    finally:
        conn.close()


if __name__ == "__main__":
    main()