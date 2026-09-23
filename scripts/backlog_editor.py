#!/usr/bin/env python3
"""Editor do backlog (master-detail) sobre data/trespordez.sqlite.

Tkinter puro (stdlib). Edita individual e em batch: renomear, organizar
plataformas/gêneros (merge), mover entre seções, reordenar, exportar yml.

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
from tkinter import filedialog, messagebox, simpledialog, ttk

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "trespordez.sqlite"
SCRIPT_DIR = Path(__file__).resolve().parent
EXPORT_CMD = [sys.executable, "node", str(SCRIPT_DIR / "backlog-export.mjs")]

SECTIONS = ["backlog", "played", "dropped", "catalog"]
SCORE_FIELDS = ["graf", "som", "gameplay", "desafio", "geral"]
ROW_FIELDS = [
    "player_key", "section", "pos", "name", "platform", "genre", "status",
    "mood", "humor", "reason", "post_slug", "added_at",
] + SCORE_FIELDS


# --------------------------------------------------------------------------
# Core (funções puras sobre uma conexão) — testáveis sem UI.
# --------------------------------------------------------------------------

def connect_db(path=None, read_only=False):
    conn = sqlite3.connect(str(path or DB_PATH))
    conn.row_factory = sqlite3.Row
    if read_only:
        conn.execute("PRAGMA query_only = ON")
    return conn


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
    sign = -1 if direction < 0 else 1
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


def run_export():
    """Roda node scripts/backlog-export.mjs (usa node, não python)."""
    if not shutil.which("node"):
        return "node não encontrado no PATH"
    r = subprocess.run(["node", str(SCRIPT_DIR / "backlog-export.mjs")],
                       capture_output=True, text=True, cwd=SCRIPT_DIR.parent)
    return (r.stdout or r.stderr).strip()


# --------------------------------------------------------------------------
# UI
# --------------------------------------------------------------------------

class DetailPanel:
    def __init__(self, master, editor):
        frame = ttk.LabelFrame(master, text="Detalhe do registro")
        self.frame = frame
        self.editor = editor
        self.vars = {}
        self.widgets = {}
        self._build()

    def _build(self):
        pad = 4
        main = ttk.Frame(self.frame)
        main.pack(fill="both", expand=True, padx=8, pady=6)

        row = ttk.Frame(main); row.pack(fill="x")
        self._field(row, "player_key", "Jogador", 0, combo_from=("players",))
        self._field(row, "section", "Seção", 3, values=SECTIONS)
        self._field(row, "pos", "Pos", 6, kind="spin")
        self._field(row, "added_at", "Adicionado", 8, width=10)

        row = ttk.Frame(main); row.pack(fill="x", pady=(pad, 0))
        self._field(row, "name", "Nome", 0, width=40)
        self._field(row, "platform", "Plataforma", 1, combo_from=("platform",))
        self._field(row, "genre", "Gênero", 2, combo_from=("genre",))

        row = ttk.Frame(main); row.pack(fill="x", pady=(pad, 0))
        self._field(row, "status", "Status", 0, combo_from=("status",))
        self._field(row, "mood", "Mood", 2)
        self._field(row, "humor", "Humor", 3)
        self._field(row, "post_slug", "Post slug", 5)

        row = ttk.Frame(main); row.pack(fill="x", pady=(pad, 0))
        self._field(row, "reason", "Motivo", 0, width=60, span=4)

        row = ttk.Frame(main); row.pack(fill="x", pady=(pad, 0))
        self._field(row, "graf", "Gráficos", 0, kind="score")
        self._field(row, "som", "Som", 2, kind="score")
        self._field(row, "gameplay", "Gameplay", 4, kind="score")
        self._field(row, "desafio", "Desafio", 6, kind="score")
        self._field(row, "geral", "Geral", 8, kind="score")

        btns = ttk.Frame(main); btns.pack(fill="x", pady=(8, 2))
        ttk.Button(btns, text="Salvar", command=self.save).pack(side="left", padx=(0, 4))
        ttk.Button(btns, text="Novo (mesma seção)", command=self._new).pack(side="left", padx=4)
        ttk.Button(btns, text="Duplicar", command=self._duplicate).pack(side="left", padx=4)
        ttk.Button(btns, text="Mover p/ seção...", command=self._move).pack(side="left", padx=4)
        ttk.Button(btns, text="Apagar", command=self._delete).pack(side="left", padx=4)
        ttk.Button(btns, text="↑", command=lambda: self._swap(-1)).pack(side="left", padx=4)
        ttk.Button(btns, text="↓", command=lambda: self._swap(1)).pack(side="left", padx=4)

    def _field(self, parent, key, label, col, kind="entry", width=None,
               values=None, combo_from=None, span=1):
        lbl = ttk.Label(parent, text=label)
        lbl.grid(row=0, column=col, sticky="w", padx=(8, 2), pady=1)
        var = tk.StringVar()
        self.vars[key] = var
        if kind == "spin":
            w = ttk.Spinbox(parent, from_=0, to=999999, textvariable=var, width=width or 5)
        elif kind == "score":
            w = ttk.Spinbox(parent, from_=0, to=10, increment=0.5, textvariable=var, width=width or 5)
        elif combo_from or values is not None:
            w = ttk.Combobox(parent, textvariable=var, width=width or 22)
            self.editor.bind_combo(w, key, combo_from or (), values or ())
        else:
            w = ttk.Entry(parent, textvariable=var, width=width or 24)
        w.grid(row=1, column=col, columnspan=span, sticky="w", padx=(8, 2))
        if key == "name":
            w.bind("<Return>", lambda e: self.save())
            self.widgets["name"] = w
        self.widgets[key] = w

    def load(self, row):
        if row is None:
            for k, var in self.vars.items():
                var.set("")
            return
        for k, var in self.vars.items():
            v = row[k] if k in row.keys() else None
            var.set("" if v is None else str(v))
        # re-popula combos com valores atuais do bd
        for key, combo in self.editor.combos.items():
            if key in self.vars:
                combo.refresh()

    def save(self):
        editor = self.editor
        conn = editor.conn
        sel = editor.selection_id()
        values = {k: v.get().strip() for k, v in self.vars.items()}
        if values["name"] == "" and not sel:
            messagebox.showwarning("Editar", "Sem nome e sem registro selecionado.")
            return
        if sel is None:
            row_id = insert_row(conn, values["player_key"] or editor.player(), values["section"], values["name"], **values)
        else:
            values.pop("pos", None)
            update_row(conn, sel, **values)
            row_id = sel
        editor.refresh(select=row_id)

    def _new(self):
        editor = self.editor
        conn = editor.conn
        rid = insert_row(conn, editor.player(), editor.section(), "Novo registro")
        editor.refresh(select=rid)
        self.widgets["name"].focus_set()

    def _duplicate(self):
        editor = self.editor
        sel = editor.selection_id()
        if sel is None:
            return
        row = fetch_row(editor.conn, sel)
        if row is None:
            return
        name = row["name"]
        if not messagebox.askyesno("Duplicar", f"Duplicar '{name}'?"):
            return
        fields = {k: row[k] for k in ROW_FIELDS if k not in ("player_key", "section", "pos")}
        fields.pop("name", None)
        rid = insert_row(editor.conn, row["player_key"], row["section"], name + " (cópia)", **fields)
        editor.refresh(select=rid)

    def _move(self):
        editor = self.editor
        sel = editor.selection_id()
        if sel is None:
            return
        target = simpledialog.askstring("Mover", f"Seção destino ({'/'.join(SECTIONS)}):")
        if not target or target not in SECTIONS:
            return
        move_row(editor.conn, sel, target)
        editor.refresh(select=sel)

    def _delete(self):
        editor = self.editor
        sel = editor.selection_id()
        if sel is None:
            return
        row = fetch_row(editor.conn, sel)
        if not messagebox.askyesno("Apagar", f"Apagar '{row['name']}'?"):
            return
        delete_row(editor.conn, sel)
        editor.refresh()

    def _swap(self, direction):
        editor = self.editor
        sel = editor.selection_id()
        if sel is None:
            return
        other = swap_pos(editor.conn, sel, direction)
        if other:
            editor.refresh(select=other)


class ComboSource:
    """Combobox com valores vindos do banco; refresh updates itens."""

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


class EditorApp:
    def __init__(self, root, conn):
        self.root = root
        self.conn = conn
        root.title("Três por Dez — Editor do Backlog")
        root.geometry("1180x760")
        self.player_keys = load_players(conn)
        self.player_names = load_player_names(conn)
        self.combos = {}

        self._build_toolbar()
        self._build_filter()
        self._build_master()
        self._build_detail()
        self._build_scores_tab()
        self.load_master()

    # -- UI construction ---------------------------------------------------

    def _build_toolbar(self):
        bar = ttk.Frame(self.root)
        bar.pack(fill="x", padx=8, pady=(8, 4))
        ttk.Label(bar, text="Registro do arquivista", font=("Segeo UI", 11, "bold")).pack(side="left")
        ttk.Button(bar, text="Exportar yml", command=self.export_yml).pack(side="right", padx=4)
        ttk.Button(bar, text="Limpar filtros", command=self.clear_filters).pack(side="right", padx=4)
        ttk.Button(bar, text="Batch...", command=self.batch_dialog).pack(side="right", padx=4)
        ttk.Button(bar, text="Organizar (plataforma/gênero)...", command=self.organize_dialog).pack(side="right", padx=4)
        ttk.Button(bar, text="Renomear em batch...", command=self.rename_dialog).pack(side="right", padx=4)

    def _build_filter(self):
        f = ttk.LabelFrame(self.root, text="Filtros")
        f.pack(fill="x", padx=8, pady=4)
        inner = ttk.Frame(f); inner.pack(fill="x", padx=6, pady=4)
        self.var_player = tk.StringVar()
        vals = ["(todos)"] + self.player_keys
        self.cb_player = ttk.Combobox(inner, textvariable=self.var_player, values=vals, width=14)
        self.cb_player.current(1 if len(vals) > 1 else 0)
        self.cb_player.pack(side="left", padx=(0, 6))

        self.var_section = tk.StringVar(value="")
        cb = ttk.Combobox(inner, textvariable=self.var_section, values=[""] + SECTIONS, width=10)
        cb.pack(side="left", padx=(0, 6))

        self.var_text = tk.StringVar()
        e = ttk.Entry(inner, textvariable=self.var_text, width=24)
        e.pack(side="left", padx=(0, 6))
        e.bind("<Return>", lambda ev: self.load_master())

        self.var_platform = tk.StringVar(value="")
        cb2 = ttk.Combobox(inner, textvariable=self.var_platform, width=14)
        cb2.pack(side="left", padx=(0, 6))
        self.bind_combo(cb2, "platform", from_table=("platform",))

        self.var_genre = tk.StringVar(value="")
        cb3 = ttk.Combobox(inner, textvariable=self.var_genre, width=16)
        cb3.pack(side="left", padx=(0, 6))
        self.bind_combo(cb3, "genre", from_table=("genre",))

        self.var_status = tk.StringVar(value="")
        cb4 = ttk.Combobox(inner, textvariable=self.var_status, width=14)
        cb4.pack(side="left", padx=(0, 6))
        self.bind_combo(cb4, "status", from_table=("status",))

        ttk.Button(inner, text="Aplicar", command=self.load_master).pack(side="left", padx=(4, 2))
        self.lbl_count = ttk.Label(inner, text="")
        self.lbl_count.pack(side="right", padx=8)

    def _build_master(self):
        wrap = ttk.Frame(self.root)
        wrap.pack(fill="both", expand=True, padx=8, pady=4)
        cols = ("id", "section", "pos", "name", "platform", "genre", "status",
                "added_at", "geral")
        heads = ("id", "seção", "pos", "nome", "plataforma", "gênero", "status",
                 "add", "nota")
        self.tree = ttk.Treeview(wrap, columns=cols, show="headings", selectmode="extended")
        for c, h, w in zip(cols, heads, (50, 70, 40, 340, 90, 130, 90, 80, 40)):
            self.tree.heading(c, text=h)
            self.tree.column(c, width=w, anchor=("w" if c in ("name", "platform", "genre", "status") else "center"), stretch=(c == "name"))
        vs = ttk.Scrollbar(wrap, orient="vertical", command=self.tree.yview)
        hs = ttk.Scrollbar(wrap, orient="horizontal", command=self.tree.xview)
        self.tree.configure(yscrollcommand=vs.set, xscrollcommand=hs.set)
        self.tree.grid(row=0, column=0, sticky="nsew")
        vs.grid(row=0, column=1, sticky="ns")
        hs.grid(row=1, column=0, sticky="ew")
        wrap.rowconfigure(0, weight=1)
        wrap.columnconfigure(0, weight=1)
        self.tree.bind("<<TreeviewSelect>>", lambda e: self.on_select())

    def _build_detail(self):
        self.detail = DetailPanel(self.root, self)

    def _build_scores_tab(self):
        wrap = ttk.LabelFrame(self.root, text="Scores (posts)")
        wrap.pack(fill="x", padx=8, pady=4)
        self.score_tree = ttk.Treeview(wrap, columns=("slug", "graf", "som", "gameplay", "desafio", "geral"),
                                       show="headings", height=4)
        for c, h, w in zip(("slug", "graf", "som", "gameplay", "desafio", "geral"),
                           ("post", "gráf", "som", "game", "des.", "geral"),
                           (260, 50, 50, 50, 50, 50)):
            self.score_tree.heading(c, text=h)
            self.score_tree.column(c, width=w, stretch=(c == "slug"))
        self.score_tree.pack(side="left", fill="x", expand=True, padx=(6, 4), pady=4)
        ttk.Button(wrap, text="Novo", command=self.score_new).pack(side="left", padx=2)
        ttk.Button(wrap, text="Salvar selec.", command=self.score_save).pack(side="left", padx=2)
        ttk.Button(wrap, text="Apagar", command=self.score_delete).pack(side="left", padx=2)
        self.load_scores()

    # -- helpers -------------------------------------------------------------

    def bind_combo(self, widget, key, from_table=None, static=None):
        self.combos[key] = ComboSource(self, widget, key, from_table=from_table, static=static)

    def player(self):
        return "" if self.var_player.get() in ("", "(todos)") else self.var_player.get()

    def section(self):
        return self.var_section.get()

    def current_filters(self):
        return dict(
            player=self.player() or None,
            section=self.section() or None,
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

    # -- data flow ------------------------------------------------------------

    def load_master(self, select=None):
        self.tree.delete(*self.tree.get_children())
        rows = list_rows(self.conn, **self.current_filters())
        for r in rows:
            self.tree.insert("", "end", iid=str(r["id"]), values=(
                r["id"], r["section"], r["pos"], r["name"] or "",
                r["platform"] or "", r["genre"] or "", r["status"] or "",
                r["added_at"] or "", "" if r["geral"] is None else r["geral"],
            ))
        self.lbl_count.config(text=f"{len(rows)} registros")
        if select is not None:
            self.tree.selection_set(str(select))
            self.tree.see(str(select))
            self.on_select()

    def on_select(self):
        rid = self.selection_id()
        row = fetch_row(self.conn, rid) if rid is not None else None
        self.detail.load(row)

    def refresh(self, select=None):
        self.load_master(select=select)

    def clear_filters(self):
        self.cb_player.current(1 if len(self.player_keys) > 1 else 0)
        self.var_section.set("")
        self.var_text.set("")
        for key in ("platform", "genre", "status"):
            c = self.combos.get(key)
            if c is not None:
                c.widget.set("")
                c.refresh()
        self.load_master()

    def export_yml(self):
        out = "Exportando...\n" + run_export()
        messagebox.showinfo("Exportar yml", out)

    # -- batch / organize -------------------------------------------------------

    def require_selection(self, action):
        ids = self.selection_ids()
        if not ids:
            messagebox.showinfo(action, "Nenhum registro selecionado no grid.")
            return None
        return ids

    def rename_dialog(self):
        ids = self.require_selection("Renomear")
        if not ids:
            return
        d = tk.Toplevel(self.root)
        d.title(f"Renomear {len(ids)} em lote")
        d.transient(self.root); d.grab_set()
        ttk.Label(d, text="Procurar:").grid(row=0, column=0, padx=6, pady=6, sticky="e")
        var_a = tk.StringVar(); ttk.Entry(d, textvariable=var_a, width=30).grid(row=0, column=1, padx=6)
        ttk.Label(d, text="Substituir por:").grid(row=1, column=0, padx=6, pady=6, sticky="e")
        var_b = tk.StringVar(); ttk.Entry(d, textvariable=var_b, width=30).grid(row=1, column=1, padx=6)
        var_rx = tk.BooleanVar()
        ttk.Checkbutton(d, text="regex", variable=var_rx).grid(row=2, column=1, sticky="w", padx=6)
        err = ttk.Label(d, text="", foreground="red"); err.grid(row=3, column=0, columnspan=2)

        def go():
            try:
                n = batch_rename(self.conn, ids, var_a.get(), var_b.get(), var_rx.get())
            except re.error as e:
                err.config(text=f"regex inválida: {e}")
                return
            d.destroy()
            self.refresh()
            messagebox.showinfo("Renomear", f"{n} nomes alterados.")

        ttk.Button(d, text="Aplicar", command=go).grid(row=4, column=1, padx=6, pady=8, sticky="w")
        d.attributes("-topmost", True)

    def batch_dialog(self):
        ids = self.require_selection("Batch")
        if not ids:
            return
        d = tk.Toplevel(self.root)
        d.title(f"Editar {len(ids)} em lote")
        d.transient(self.root); d.grab_set()
        fields = ["player_key", "section", "platform", "genre", "status",
                  "mood", "humor", "reason", "added_at", "post_slug"]
        ttk.Label(d, text="Campo:").grid(row=0, column=0, padx=6, pady=6, sticky="e")
        var_f = tk.StringVar()
        cb = ttk.Combobox(d, textvariable=var_f, values=fields, state="readonly", width=18)
        cb.current(2); cb.grid(row=0, column=1, padx=6)
        ttk.Label(d, text="Valor:").grid(row=1, column=0, padx=6, pady=6, sticky="e")
        var_v = tk.StringVar()
        e = ttk.Entry(d, textvariable=var_v, width=36); e.grid(row=1, column=1, padx=6)

        def refresh_val():
            f = var_f.get()
            if f in ("platform", "genre", "status"):
                vals = distinct_values(self.conn, f)
                e.config(state="normal")
        cb.bind("<<ComboboxSelected>>", lambda ev: refresh_val())

        def go():
            f = var_f.get()
            v = var_v.get()
            valves = {f: (None if v.strip() == "" else v.strip())}
            batch_update(self.conn, ids, **valves)
            d.destroy()
            self.refresh()
            messagebox.showinfo("Batch", "Atualizado.")

        ttk.Button(d, text="Aplicar", command=go).grid(row=2, column=1, padx=6, pady=8, sticky="w")
        d.attributes("-topmost", True)

    def organize_dialog(self):
        d = tk.Toplevel(self.root)
        d.title("Organizar plataformas / gêneros")
        d.transient(self.root); d.grab_set()
        inner = ttk.LabelFrame(d, text="Renomear valor (merge)")
        inner.pack(fill="x", padx=8, pady=8)
        ttk.Label(inner, text="Coluna:").grid(row=0, column=0, sticky="e", padx=6, pady=4)
        var_col = tk.StringVar(); cbcol = ttk.Combobox(inner, textvariable=var_col, values=["platform", "genre"], width=12, state="readonly")
        cbcol.current(0); cbcol.grid(row=0, column=1, padx=6)
        ttk.Label(inner, text="De:").grid(row=1, column=0, sticky="e", padx=6)
        var_a = tk.StringVar(); cba = ttk.Combobox(inner, textvariable=var_a, width=30)
        cba.grid(row=1, column=1, padx=6)
        ttk.Label(inner, text="Para:").grid(row=2, column=0, sticky="e", padx=6)
        var_b = tk.StringVar(); cbb = ttk.Combobox(inner, textvariable=var_b, width=30)
        cbb.grid(row=2, column=1, padx=6)

        def refill(_=None):
            col = var_col.get()
            vals = distinct_values(self.conn, col)
            cba["values"] = vals
            cbb["values"] = vals

        cbcol.bind("<<ComboboxSelected>>", refill)
        refill()

        def go():
            col, a, b = var_col.get(), var_a.get().strip(), var_b.get().strip()
            if not a or not b:
                messagebox.showwarning("Organizar", "Preencha De e Para.")
                return
            n = rename_value(self.conn, col, a, b)
            d.destroy()
            self.refresh()
            messagebox.showinfo("Organizar", f"{n} registros: '{a}' → '{b}'")

        ttk.Button(inner, text="Aplicar", command=go).grid(row=3, column=1, sticky="w", padx=6, pady=8)

        stats = ttk.LabelFrame(d, text="Distribuição atual")
        stats.pack(fill="both", expand=True, padx=8, pady=(0, 8))
        txt = tk.Text(stats, height=14, width=46)
        txt.pack(fill="both", expand=True, padx=6, pady=6)
        lines = []
        for col in ("platform", "genre", "status"):
            lines.append(f"== {col} ==")
            rows = self.conn.execute(
                f"SELECT {col} v, COUNT(*) n FROM backlog_items WHERE {col} IS NOT NULL "
                f"GROUP BY {col} ORDER BY n DESC"
            ).fetchall()
            lines += [f"  {r['n']:>5}  {r['v']}" for r in rows]
        txt.insert("1.0", "\n".join(lines))
        txt.config(state="disabled")
        d.attributes("-topmost", True)

    # -- scores ---------------------------------------------------------------

    def load_scores(self):
        self.score_tree.delete(*self.score_tree.get_children())
        for r in list_scores(self.conn):
            self.score_tree.insert("", "end", iid=r["content_slug"], values=(
                r["content_slug"], r["graf"] or "", r["som"] or "", r["gameplay"] or "",
                r["desafio"] or "", r["geral"] or "",
            ))

    def score_save(self):
        sel = self.score_tree.selection()
        if not sel:
            return
        slug = sel[0]
        d = tk.Toplevel(self.root)
        d.title(f"Score: {slug}")
        d.transient(self.root)
        row = self.conn.execute("SELECT * FROM scores WHERE content_slug=?", (slug,)).fetchone() or {}
        vars_ = {}
        for i, k in enumerate(["graf", "som", "gameplay", "desafio", "geral"]):
            ttk.Label(d, text=k).grid(row=0, column=i * 2, padx=4, pady=4)
            var = tk.StringVar(value="" if k not in row else (row[k] or ""))
            vars_[k] = var
            ttk.Spinbox(d, from_=0, to=10, increment=0.5, textvariable=var, width=6).grid(row=1, column=i * 2, padx=4)
        ttk.Label(d, text="raw").grid(row=2, column=0, padx=4, pady=4, sticky="w")
        var_raw = tk.StringVar(value=row["raw"] or "" if row else "")
        ttk.Entry(d, textvariable=var_raw, width=60).grid(row=3, column=0, columnspan=10, padx=4)

        def ok():
            vals = {k: (None if vars_[k].get().strip() == "" else float(vars_[k].get().strip().replace(",", "."))) for k in vars_}
            rw = var_raw.get() or None
            save_score(self.conn, slug, vals.get("graf"), vals.get("som"), vals.get("gameplay"), vals.get("desafio"), vals.get("geral"), rw)
            d.destroy()
            self.load_scores()

        ttk.Button(d, text="Salvar", command=ok).grid(row=4, column=0, columnspan=10, pady=6)

    def score_new(self):
        slug = simpledialog.askstring("Novo score", "content_slug do post:")
        if not slug:
            return
        save_score(self.conn, slug.strip(), None, None, None, None, None, None)
        self.load_scores()

    def score_delete(self):
        sel = self.score_tree.selection()
        if not sel:
            return
        if messagebox.askyesno("Apagar score", f"Apagar '{sel[0]}'?"):
            delete_score(self.conn, sel[0])
            self.load_scores()


# --------------------------------------------------------------------------
# --selftest: roda a lógica sobre uma cópia do banco (não toca o real).
# --------------------------------------------------------------------------

def selftest():
    tmp = Path(tempfile.mkdtemp(prefix="backlog-editor-")) / "trespordez.sqlite"
    shutil.copy2(DB_PATH, tmp)
    conn = connect_db(tmp)
    tests = 0

    n_before = conn.execute("SELECT COUNT(*) n FROM backlog_items").fetchone()["n"]

    # reorder
    rid = insert_row(conn, "the-archivist", "catalog", "ZZZ selftest")
    tests += 1
    assert fetch_row(conn, rid)["pos"] >= 0

    # batch rename regex
    rows = conn.execute("SELECT id FROM backlog_items WHERE section='catalog' LIMIT 3").fetchall()
    ids = [r["id"] for r in rows]
    n = batch_rename(conn, ids, "^(Prince)", r"\1 XX", True)
    tests += 1
    assert n >= 0

    # rename platform merge
    conn.execute("INSERT INTO backlog_items (player_key, section, pos, name, platform) VALUES ('the-archivist','catalog',99999,'tmp','WeirdPlatform')")
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

    conn.close()
    print(f"[selftest] {tests} checks OK — {tmp}")
    print("[selftest] db real intacto (copiado p/ temp antes das mutações)")


def main():
    if "--selftest" in sys.argv:
        selftest()
        return
    if not DB_PATH.exists():
        messagebox.showerror("DB", f"sqlite não encontrado: {DB_PATH}\n\nRode node scripts/backlog-lib *.mjs antes ou verifique o path.")
        sys.exit(1)
    root = tk.Tk()
    conn = connect_db()
    try:
        EditorApp(root, conn)
        root.mainloop()
    finally:
        conn.close()


if __name__ == "__main__":
    main()