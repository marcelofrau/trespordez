#!/usr/bin/env python3
"""Sync local trespordez.sqlite backlog with the Backloggery account.

Uses the Backloggery web app's internal JSON API (unofficial). Reads/writes
only your own account. Defaults to a read-only dry run; pass --apply to write.

Usage:
    python scripts/backloggery-sync.py                # interactive dry-run
    python scripts/backloggery-sync.py --apply        # interactive + write
    python scripts/backloggery-sync.py --sections backlog,played
    python scripts/backloggery-sync.py --json         # machine-readable plan

Credentials come from BACKLOGGERY_USERNAME/BACKLOGGERY_PASSWORD (env or .env).
"""

from __future__ import annotations

import argparse
import atexit
import json
import logging
import logging.handlers
import os
import re
import sqlite3
import sys
import time
import unicodedata
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Optional

import requests
from rich import box
from rich.console import Console, Group
from rich.panel import Panel
from rich.progress import BarColumn, Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.prompt import Confirm, Prompt
from rich.rule import Rule
from rich.table import Table

REPO_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = REPO_ROOT / "data" / "trespordez.sqlite"
ENV_PATH = REPO_ROOT / ".env"
BASE_URL = "https://backloggery.com"
LOG_DIR = REPO_ROOT / "logs"
DEFAULT_LOG = LOG_DIR / "trespordez-backloggery.log"
DEFAULT_AUDIT = LOG_DIR / "trespordez-backloggery-audit.jsonl"


def _ensure_utf8() -> None:
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            try:
                reconfigure(encoding="utf-8", errors="replace")
            except Exception:
                pass


_ensure_utf8()
console = Console()


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def setup_logging(log_path: Path, verbose: bool = False) -> None:
    log_path = Path(log_path)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    handlers: list[logging.Handler] = [
        logging.handlers.RotatingFileHandler(
            log_path, maxBytes=2 * 1024 * 1024, backupCount=3, encoding="utf-8"
        )
    ]
    if verbose:
        handlers.append(logging.StreamHandler())
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.INFO,
        handlers=handlers,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )


def mask_secrets(payload: dict) -> dict:
    out = dict(payload)
    if "password" in out:
        out["password"] = "********"
    return out


class AuditLog:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._f = self.path.open("a", encoding="utf-8")

    def write(self, op: str, ok: Optional[bool], **fields) -> None:
        row = {"ts": utc_now_iso(), "op": op, "ok": ok}
        row.update({k: v for k, v in fields.items() if v is not None})
        self._f.write(json.dumps(row, ensure_ascii=False) + "\n")
        self._f.flush()

    def close(self) -> None:
        try:
            self._f.close()
        except Exception:
            pass

# --------------------------------------------------------------------------- #
# Enums (reverse-engineered from the Backloggery SPA, see docs/backloggery.md)
# --------------------------------------------------------------------------- #

STATUS = {
    10: "Unplayed", 20: "Unfinished", 30: "Beaten", 40: "Completed",
    60: "Endless", 80: "None",
}
STATUS_BY_NAME = {v: k for k, v in STATUS.items()}

PRIORITY = {
    80: "Now Playing", 70: "Ongoing", 60: "Paused", 50: "High",
    40: "Normal", 30: "Low", 20: "Replay", 10: "Shelved",
}
PRIORITY_BY_NAME = {v: k for k, v in PRIORITY.items()}

OWN = {
    0: "(unset)", 1: "Own", 7: "Wishlist", 5: "Household", 6: "Subscription",
    3: "Played It", 2: "Formerly Owned", 4: "Other",
}

PHYS_DIGI = {
    0: "(unset)", 1: "Digital", 20: "Physical", 21: "Physical (Game Only)",
    22: "Physical (Incomplete)", 28: "Physical (Complete In Box)",
    29: "Physical (Sealed)", 30: "Physical (Licensed Repro)",
    31: "Physical (Unlicensed Repro)",
}

REGION = {
    0: "(unset)", 1: "Free", 2: "North America", 3: "Japan", 4: "PAL",
    5: "China", 6: "Korea", 7: "Brazil", 8: "Asia",
}

# Local platform string -> Backloggery abbr (resolved to platform_id at runtime).
PLATFORM_ALIASES = {
    "PC": "PC", "MS-DOS": "DOS", "Dos": "DOS", "DOS": "DOS",
    "Saturn": "Saturn", "PS1": "PS", "PlayStation": "PS", "PS2": "PS2",
    "PS3": "PS3", "N64": "N64", "NES": "NES", "SNES": "SNES",
    "Switch": "NS", "MegaDrive": "SMD", "Mega Drive": "SMD",
    "MasterSystem": "SMS", "Master System": "SMS", "SegaCD": "SCD", "Sega CD": "SCD",
    "GameBoy": "GB", "Game Boy": "GB", "GBA": "GBA", "Game Gear": "GG",
    "NeoGeo": "NG", "Neo Geo": "NG", "32x": "32X", "Sega 32X": "32X",
    "Arcade": "ARC", "Atari 2600": "2600", "Atari 5200": "5200",
    "Commodore 64": "C64", "Amiga": "Amiga", "Xbox": "Xbox",
    "GOG": "GOG", "EA app": "Origin", "Ubisoft Connect": "UPlay",
    "Steam": "Steam", "itch.io": "itchio", "Battle.Net": "BNet",
    "Browser": "Brwsr", "Web": "Brwsr", "Dreamcast": "DC",
    "Misc": "Misc", "Ports": "Misc", "FanGames": "Misc",
    "OpenSource": "Misc", "Scumm": "Misc", "DLC": "Misc",
}

LEGACY_STATUS_ALIASES = {
    "▶️": "jogando",
    "👑": "zerado",
    "💾": "na-fila",
    "⏸️": "pausado",
    "💤": "pausado",
    "🟡": "pausado",
    "🗃️": "arquivado",
    "⏲️": "arquivado",
    "?": "arquivado",
    "⚪": "na-fila",
}

LOCAL_STATUS_LABELS = {
    "backlog": {
        "jogando": ("Unfinished", "Now Playing"),
        "zerado": ("Beaten", "Normal"),
        "na-fila": ("Unplayed", "High"),
        "pausado": ("Unfinished", "Paused"),
        "arquivado": ("Unplayed", "Shelved"),
    },
    "played": {
        "jogando": ("Unfinished", "Now Playing"),
        "zerado": ("Beaten", "Normal"),
        "na-fila": ("Unplayed", "High"),
        "pausado": ("Unfinished", "Paused"),
        "arquivado": ("Unplayed", "Shelved"),
    },
}

SECTION_STATUS_OVERRIDES = {
    "dropped": ("Unfinished", "Shelved"),
    "catalog": ("Unplayed", "Normal"),
}

DEFAULT_SECTION_STATUS = {
    "backlog": ("Unplayed", "Normal"),
    "played": ("Beaten", "Normal"),
    "dropped": ("Unfinished", "Shelved"),
    "catalog": ("Unplayed", "Normal"),
}

CANONICAL_STATUS_KEYS = frozenset({"jogando", "zerado", "na-fila", "pausado", "arquivado"})


def normalize_local_status(status: Optional[str]) -> Optional[str]:
    if status is None:
        return None
    value = str(status).strip()
    if not value:
        return None
    return LEGACY_STATUS_ALIASES.get(value, value)


def local_status_map(section: str, status: Optional[str]) -> tuple[str, str]:
    if section not in DEFAULT_SECTION_STATUS:
        raise ValueError(f"seção local inválida: {section}")
    normalized = normalize_local_status(status)
    if normalized is not None and normalized not in CANONICAL_STATUS_KEYS:
        raise ValueError(f"status local inválido: {section}/{status}")
    if section in SECTION_STATUS_OVERRIDES:
        return SECTION_STATUS_OVERRIDES[section]
    if normalized is None:
        return DEFAULT_SECTION_STATUS[section]
    return LOCAL_STATUS_LABELS[section][normalized]


# --------------------------------------------------------------------------- #
# Utilities
# --------------------------------------------------------------------------- #


def load_env() -> None:
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            os.environ.setdefault(key.strip(), value.strip().strip("'\""))


def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = value.lower().replace("&", "and").replace("+", " plus ")
    value = re.sub(r"[^a-z0-9]+", " ", value).strip()
    for article in ("the ", "a ", "an "):
        if value.startswith(article):
            value = value[len(article):]
            break
    return value


@dataclass(frozen=True)
class LocalItem:
    section: str
    pos: int
    name: str
    platform: Optional[str]
    status: Optional[str]
    reason: Optional[str]
    scores: dict = field(default_factory=dict)
    post_slug: Optional[str] = None

    @property
    def key(self) -> str:
        return f"{self.section}/{self.name}/{self.platform or ''}"


@dataclass(eq=True, frozen=True)
class BlgEntry:
    game_inst_id: int
    user_id: int
    title: str
    platform_id: int
    abbr: str
    status: int
    priority: int
    own: int
    region: int
    phys_digi: int
    rating: Optional[int]
    notes: str = ""
    parent_inst_id: Optional[int] = None
    is_parent: int = 0
    sub_platform_id: int = 0


# --------------------------------------------------------------------------- #
# Backloggery client
# --------------------------------------------------------------------------- #


class BackloggeryError(RuntimeError):
    pass


class BackloggeryUncertainError(BackloggeryError):
    pass


class Backloggery:
    def __init__(self, username: str, password: str, delay: float = 0.6,
                 retries: int = 2, audit: Optional[AuditLog] = None):
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "trespordez-backloggery-sync/1.0"})
        self.username = username
        self.password = password
        self.delay = delay
        self.retries = retries
        self.audit = audit
        self.pending_adds: list[dict] = []
        self._platforms: dict[int, dict] = {}
        self._platform_by_abbr: dict[str, dict] = {}
        self._platform_by_title: dict[str, dict] = {}
        self.user_platform_ids: Optional[set[int]] = None
        self.logged_in = False

    def _post(self, endpoint: str, payload: dict, retryable: bool = True) -> Any:
        url = f"{BASE_URL}/api/{endpoint}"
        logging.info("REQ %s payload=%s", endpoint, json.dumps(mask_secrets(payload), ensure_ascii=False))
        last_error = None
        next_backoff: Optional[float] = None
        for attempt in range(self.retries + 1):
            if attempt:
                backoff = next_backoff or 2.0 * (2 ** (attempt - 1))
                next_backoff = None
                logging.warning("%s tentativa %d após %ss de backoff", endpoint, attempt, backoff)
                time.sleep(backoff)
            try:
                resp = self.session.post(url, json=payload, timeout=30)
                body = resp.text
                logging.info("RES %s HTTP %d %s", endpoint, resp.status_code, body[:1000])
                if resp.status_code == 429:
                    last_error = BackloggeryError(f"{endpoint}: rate limited (429)")
                    if not retryable:
                        raise BackloggeryUncertainError(f"{endpoint}: resposta 429; estado remoto deve ser reconciliado")
                    next_backoff = 60.0
                    continue
                if resp.status_code >= 500:
                    logging.error("RES %s HTTP %d body=%s", endpoint, resp.status_code, body[:2000])
                    last_error = BackloggeryError(f"{endpoint}: HTTP {resp.status_code}")
                    if not retryable:
                        raise BackloggeryUncertainError(f"{endpoint}: HTTP {resp.status_code}; estado remoto deve ser reconciliado")
                    continue
                try:
                    data = resp.json()
                except ValueError as exc:
                    raise BackloggeryError(f"{endpoint}: resposta não-JSON: {body[:200]}") from exc
                if isinstance(data, dict) and data.get("errors"):
                    raise BackloggeryError(f"{endpoint}: {data['errors']}")
                return data
            except (requests.ConnectionError, requests.Timeout) as exc:
                last_error = BackloggeryError(f"{endpoint}: erro de rede: {exc}")
                if not retryable:
                    raise BackloggeryUncertainError(f"{endpoint}: erro de rede; estado remoto deve ser reconciliado") from exc
        raise last_error or BackloggeryError(f"{endpoint}: falha após {self.retries + 1} tentativas")

    def login(self) -> None:
        data = self._post("auth_login.php", {
            "usermail": self.username,
            "password": self.password,
            "remember": False,
        })
        payload = data.get("payload", {})
        if not payload.get("username"):
            raise BackloggeryError("Login falhou: usuário ou senha inválidos")
        self.logged_in = True
        self.user_id = payload.get("user_id") or 0
        logging.info("login ok user_id=%s join=%s", payload.get("user_id"), payload.get("join_date"))

    def load_reference(self) -> None:
        self.load_platforms()
        try:
            platform_rows = self._post("fetch_user_platforms.php", {"get_owner_platforms": True}).get("payload", [])
            self.user_platform_ids = {int(row["platform_id"]) for row in platform_rows if row.get("platform_id") is not None}
            logging.info("plataformas do usuário carregadas: %d", len(self.user_platform_ids))
        except BackloggeryError as exc:
            self.user_platform_ids = None
            logging.warning("sem plataformas do usuário (%s); adds com plataforma serão bloqueados", exc)
        try:
            defaults = self._post("fetch_user_defaults.php", {}).get("payload", [{}])[0]
            self.defaults = {
                "own": defaults.get("own", 1),
                "region": defaults.get("region", 2),
                "phys_digi": defaults.get("phys_digi", 20),
            }
            logging.info("user defaults %s", self.defaults)
        except BackloggeryError as exc:
            self.defaults = {"own": 1, "region": 2, "phys_digi": 20}
            logging.warning("sem user defaults (%s); usando padrões %s", exc, self.defaults)

    def load_platforms(self) -> None:
        for row in self._post("fetch_platforms.php", {}).get("payload", []):
            pid = row["platform_id"]
            self._platforms[pid] = row
            self._platform_by_abbr.setdefault(row.get("abbr", "").lower(), row)
            self._platform_by_title.setdefault(row.get("title", "").lower(), row)
        logging.info("plataformas carregadas: %d", len(self._platforms))

    def resolve_platform(self, local: str) -> tuple[int, str, dict]:
        key = local.strip()
        abbr = PLATFORM_ALIASES.get(key)
        if abbr:
            row = self._platform_by_abbr.get(abbr.lower())
            if row:
                return row["platform_id"], row["abbr"], row
        row = self._platform_by_title.get(key.lower())
        if row:
            return row["platform_id"], row["abbr"], row
        row = self._platform_by_abbr.get(key.lower())
        if row:
            return row["platform_id"], row["abbr"], row
        for ab, row in self._platform_by_abbr.items():
            if key.lower() in ab:
                return row["platform_id"], row["abbr"], row
        raise BackloggeryError(f"plataforma sem correspondência: {key!r}")

    def is_user_platform(self, platform_id: int) -> bool:
        return self.user_platform_ids is not None and platform_id in self.user_platform_ids

    def get_library(self) -> list[BlgEntry]:
        data = self._post("fetch_library.php", {"username": self.username})
        payload = data if isinstance(data, list) else data.get("payload", [])
        entries = []
        for row in payload:
            if not row:
                continue
            entries.append(BlgEntry(
                game_inst_id=row.get("game_inst_id", 0),
                user_id=row.get("user_id", 0),
                title=row.get("title", "") or "",
                platform_id=row.get("platform_id", 0),
                abbr=row.get("abbr", "") or "",
                status=int(row.get("status", 0) or 0),
                priority=int(row.get("priority", 0) or 0),
                own=int(row.get("own", 0) or 0),
                region=int(row.get("region", 0) or 0),
                phys_digi=int(row.get("phys_digi", 0) or 0),
                rating=row.get("rating"),
                notes=row.get("notes", "") or "",
                parent_inst_id=row.get("parent_inst_id"),
                is_parent=int(row.get("is_parent", 0) or 0),
                sub_platform_id=int(row.get("sub_platform_id", 0) or 0),
            ))
        logging.info("biblioteca carregada: %d jogos", len(entries))
        return entries

    def get_gameinfo(self, game_inst_id: int) -> Optional[dict]:
        data = self._post("fetch_gameinfo.php", {"game_inst_id": game_inst_id})
        if data.get("status"):
            return data.get("payload")
        return None

    def _pace(self) -> None:
        if self.delay:
            time.sleep(self.delay)

    def reconcile_pending_adds(self) -> list[tuple[dict, Optional[int], Optional[str]]]:
        pending = list(self.pending_adds)
        if not pending:
            return []
        entries = self.get_library()
        results = []
        self.pending_adds = []
        for game in pending:
            title = normalize(game.get("title", ""))
            platform_id = int(game.get("platform_id") or 0)
            matches = [entry for entry in entries
                       if normalize(entry.title) == title and entry.platform_id == platform_id]
            if len(matches) == 1:
                new_id = matches[0].game_inst_id
                error = None
                logging.info("add_game %r reconciliado -> %s", game.get("title"), new_id)
                if self.audit:
                    self.audit.write("add", True, title=game.get("title"), platform_id=platform_id,
                                     new_inst_id=new_id, reconciled=True)
            else:
                new_id = None
                error = (f"{len(matches)} registros criados para {title!r}; "
                         "reconciliação manual necessária" if matches else
                         f"nenhum registro criado para {title!r}; estado incerto")
                logging.error("add_game %r -> %s", game.get("title"), error)
                if self.audit:
                    self.audit.write("add", False, title=game.get("title"), platform_id=platform_id,
                                     error=error, reconciled=False)
            results.append((game, new_id, error))
        return results

    def add_game(self, game: dict) -> Optional[int]:
        self._pace()
        try:
            data = self._post("add_game.php", game, retryable=False)
        except BackloggeryUncertainError as exc:
            self.pending_adds.append(dict(game))
            logging.warning("add_game %r -> resposta incerta; pendente para reconciliação: %s",
                            game.get("title"), exc)
            if self.audit:
                self.audit.write("add_pending", None, title=game.get("title"), platform_id=game.get("platform_id"),
                                 error=str(exc))
            return None
        if not isinstance(data, dict):
            error = data if isinstance(data, (list, dict)) else str(data)
            logging.error("add_game %r -> resposta inesperada: %s", game.get("title"), error)
            if self.audit:
                self.audit.write("add", False, title=game.get("title"), platform_id=game.get("platform_id"),
                                 response=error)
            return None
        new_id = data.get("payload")
        ok = bool(data.get("status", 1)) and isinstance(new_id, int) and new_id > 0
        logging.info("add_game %r -> %s (%s)", game.get("title"), new_id, "ok" if ok else f"ERRO {data}")
        if self.audit:
            self.audit.write("add", ok, title=game.get("title"), platform_id=game.get("platform_id"),
                             new_inst_id=new_id, server_status=data.get("status"))
        return new_id if ok else None

    def update_game(self, game: dict) -> bool:
        self._pace()
        game = dict(game)
        game.pop("last_update", None)
        game.setdefault("prev_status", game.get("status", 0))
        game.setdefault("prev_own", game.get("own", 1))
        game.setdefault("is_stealth", False)
        game.setdefault("review_viewed", True)
        game.setdefault("update_parent", False)
        data = self._post("update_game.php", game)
        ok = bool(data.get("status"))
        logging.info("update_game %r (%s) -> %s", game.get("title"), game.get("game_inst_id"), "ok" if ok else f"ERRO {data}")
        if self.audit:
            self.audit.write("update", ok, title=game.get("title"),
                             inst_id=game.get("game_inst_id"), server_status=data.get("status"))
        return ok

    def delete_game(self, entry: BlgEntry, verify: bool = False) -> bool:
        self._pace()
        user_id = entry.user_id or self.user_id
        payload = {
            "title": entry.title,
            "abbr": entry.abbr,
            "notes": entry.notes,
            "platform_id": entry.platform_id,
            "game_inst_id": entry.game_inst_id,
            "parent_inst_id": entry.parent_inst_id,
            "is_parent": entry.is_parent,
            "user_id": user_id,
        }
        data = self._post("delete_game.php", payload)
        response_ok = bool(data.get("status")) if isinstance(data, dict) else False
        ok = response_ok
        if verify:
            start = time.monotonic()
            for _ in range(12):
                time.sleep(2.5)
                present = any(e.game_inst_id == entry.game_inst_id for e in self.get_library())
                if not present:
                    ok = True
                    break
                ok = False
            logging.info("delete verify: %s em %.1fs", entry.game_inst_id, time.monotonic() - start)
        logging.info("delete_game %r (inst %s) -> %s", entry.title, entry.game_inst_id, "ok" if ok else f"ERRO {data}")
        if self.audit:
            self.audit.write("delete", ok, title=entry.title, inst_id=entry.game_inst_id, verified=verify)
        return ok


# --------------------------------------------------------------------------- #
# Local database
# --------------------------------------------------------------------------- #


def load_local(player_key: str = "the-archivist") -> list[LocalItem]:
    con = sqlite3.connect(f"file:{DB_PATH.as_posix()}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    rows = con.execute(
        """SELECT section, pos, name, platform, status, reason,
                  graf, som, gameplay, desafio, geral, post_slug
           FROM backlog_items WHERE player_key = ? ORDER BY section, pos""",
        (player_key,),
    ).fetchall()
    con.close()
    items = []
    for r in rows:
        scores = {}
        for sc in ("graf", "som", "gameplay", "desafio", "geral"):
            v = r[sc]
            if v is not None:
                scores[sc] = round(float(v), 1)
        items.append(LocalItem(
            section=r["section"],
            pos=r["pos"],
            name=(r["name"] or "").strip(),
            platform=r["platform"],
            status=r["status"],
            reason=r["reason"],
            scores=scores,
            post_slug=r["post_slug"],
        ))
    return items


# --------------------------------------------------------------------------- #
# Planning
# --------------------------------------------------------------------------- #


def build_note(item: LocalItem, notes: Optional[str] = None) -> str:
    parts = []
    if item.reason:
        parts.append(f"Dropped: {item.reason}")
    if item.scores and (item.section == "played" or item.scores.get("geral")):
        bits = " · ".join(f"{k.capitalize()} {v}" for k, v in item.scores.items())
        parts.append(f"Notas: {bits}")
    if item.post_slug:
        parts.append(f"Cobertura: /{item.post_slug}/")
    if notes and notes.strip():
        parts.insert(0, notes.strip())
    return " | ".join(parts)[:500]


def desired_blg(item: LocalItem, defaults: dict) -> dict:
    status_name, priority_name = local_status_map(item.section, item.status)
    custom_note = item.reason if item.section == "dropped" else None
    score = item.scores.get("geral")
    return {
        "local": item,
        "title": item.name,
        "status": STATUS_BY_NAME[status_name],
        "priority": PRIORITY_BY_NAME[priority_name],
        "own": defaults.get("own", 1),
        "region": defaults.get("region", 2),
        "phys_digi": defaults.get("phys_digi", 20),
        "ownership_set": False,
        "rating": rating_from(item),
        # rating só é reescrito quando a seção local traz nota de avaliação;
        # em backlog/catalog/dropped a nota do Backloggery é preservada.
        "rating_set": item.section == "played" and score is not None,
        "notes": build_note(item, custom_note),
    }


def resolve_notes(existing: Optional[str], requested: str) -> str:
    """Notas finais: preserva o que já existe no Backloggery e acrescenta o nosso."""
    exist = (existing or "").strip()
    req = (requested or "").strip()
    if not req:
        return exist
    if not exist:
        return req
    if req in exist:
        return exist
    return f"{exist} | {req}"


def rating_from(item: LocalItem) -> Optional[int]:
    g = item.scores.get("geral")
    if g is None:
        return None
    v = int(round(g))
    return max(1, min(10, v))


def match_entries(local: list[LocalItem], blg: list[BlgEntry],
                  resolve_platform: Optional[Callable] = None,
                  platform_allowed: Optional[Callable[[int], bool]] = None):
    blg_by_key: dict[tuple[str, int], list[BlgEntry]] = {}
    for entry in blg:
        if entry.parent_inst_id or entry.is_parent:
            continue
        key = (normalize(entry.title), entry.platform_id)
        blg_by_key.setdefault(key, []).append(entry)

    adds, updates, kept, unresolved = [], [], [], []
    seen_local = set()
    for item in local:
        if not item.name:
            continue
        platform_id = None
        if item.platform:
            if resolve_platform is None:
                unresolved.append((item, f"plataforma {item.platform!r} não resolvida"))
                continue
            try:
                platform_id, _, _ = resolve_platform(item.platform)
            except BackloggeryError as exc:
                unresolved.append((item, f"plataforma {item.platform!r}: {exc}"))
                continue
        try:
            desired = desired_blg(item, {})
        except ValueError as exc:
            unresolved.append((item, str(exc)))
            continue

        normalized_name = normalize(item.name)
        local_key = (item.section, normalized_name, platform_id)
        if local_key in seen_local:
            unresolved.append((item, "duplicata local com mesma seção, título e plataforma"))
            continue
        seen_local.add(local_key)
        candidates = []
        for (title, candidate_platform_id), entries in blg_by_key.items():
            if title == normalized_name and (platform_id is None or candidate_platform_id == platform_id):
                candidates.extend(entries)
        if len(candidates) == 1:
            match = candidates[0]
        elif candidates:
            unresolved.append((item, f"{len(candidates)} correspondências ({[c.abbr for c in candidates]})"))
            continue
        else:
            match = None

        if match:
            blg_by_key.pop((normalize(match.title), match.platform_id), None)
            if blg_field_diff(match, desired):
                updates.append((item, match, desired))
            else:
                kept.append((item, match))
        elif platform_id is not None and platform_allowed is not None and not platform_allowed(platform_id):
            unresolved.append((item, f"platform_id {platform_id} não está na lista do usuário"))
        elif platform_id is not None:
            adds.append((item, platform_id))
        else:
            unresolved.append((item, "sem plataforma local e sem correspondência única"))

    orphans = [entry for entries in blg_by_key.values() for entry in entries]
    return {
        "adds": adds,
        "updates": updates,
        "kept": kept,
        "unresolved": unresolved,
        "orphans": sorted(orphans, key=lambda e: (normalize(e.title), e.abbr)),
    }


STATUS_ORDER = {80: 0, 10: 1, 20: 2, 30: 3, 40: 4, 60: 5}


def status_rank(code: int) -> int:
    return STATUS_ORDER.get(code, 0)


def status_promotes(current: int, desired: int) -> bool:
    """Verdadeiro quando o novo status não rebaixa o progresso já registrado."""
    return status_rank(desired) >= status_rank(current)


def blg_field_diff(entry: BlgEntry, desired: dict) -> list[str]:
    changed = []
    if entry.status != desired["status"]:
        if status_promotes(entry.status, desired["status"]):
            changed.append(f"status {STATUS.get(entry.status, entry.status)}→{STATUS[desired['status']]}")
    if entry.priority != desired["priority"]:
        changed.append(f"prioridade {PRIORITY.get(entry.priority, entry.priority)}→{PRIORITY[desired['priority']]}")
    if desired["rating_set"] and int(entry.rating or 0) != int(desired.get("rating") or 0):
        changed.append(f"nota {entry.rating}→{desired.get('rating')}")
    final_notes = resolve_notes(entry.notes, desired["notes"])
    if entry.notes.strip() != final_notes.strip():
        changed.append("notas")
    if desired.get("ownership_set") and entry.own != desired["own"]:
        changed.append(f"own {entry.own}→{desired['own']}")
    return changed


# --------------------------------------------------------------------------- #
# Rich UI
# --------------------------------------------------------------------------- #


def diff_value(diffs: list[str], prefix: str) -> str:
    for diff in diffs:
        if diff == prefix:
            return "alterado"
        marker = f"{prefix} "
        if diff.startswith(marker):
            return diff[len(marker):]
    return "—"


def banner(state: dict) -> None:
    table = Table(box=box.ROUNDED, title="Backloggery Sync", title_justify="center")
    table.add_column("Fonte", style="bold")
    table.add_column("Itens", justify="right")
    table.add_row(f"Local (the-archivist)", str(state["local_total"]))
    for sec, n in state["local_by_section"].items():
        table.add_row(f"  ├ {sec}", str(n), style="dim")
    table.add_row(f"Backloggery (Biblioteca)", str(state["blg_total"]), style="bold")
    table.add_row(f"Para adicionar", f"[green]{state['n_adds']}[/]", style="bold")
    table.add_row(f"Para atualizar", f"[yellow]{state['n_updates']}[/]")
    table.add_row(f"Sem mudança", f"[dim]{state['n_kept']}[/]")
    if state["n_unresolved"]:
        table.add_row(f"Ambíguos/sem plataforma", f"[red]{state['n_unresolved']}[/]")
    if state["n_orphans"]:
        table.add_row(f"Na BLG, sem par local", f"[magenta]{state['n_orphans']}[/]")
    console.print(Panel(table, border_style="bright_yellow"))


def items_table(title: str, rows: list[tuple], columns: list[tuple]) -> None:
    if not rows:
        console.print(f"[dim]— {title}: nada —[/]")
        return
    t = Table(title=title, box=box.HEAVY_HEAD, expand=True)
    for label, style in columns:
        t.add_column(label, style=style, no_wrap=False)
    for i, row in enumerate(rows, 1):
        t.add_row(str(i), *row)
    console.print(t)


def parse_indices(raw: str, size: int) -> set[int]:
    out = set()
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        if "-" in part:
            a, _, b = part.partition("-")
            try:
                out.update(range(int(a), int(b) + 1))
            except ValueError:
                continue
        else:
            try:
                out.add(int(part))
            except ValueError:
                continue
    return {i for i in out if 1 <= i <= size}


# --------------------------------------------------------------------------- #
# Apply
# --------------------------------------------------------------------------- #


def apply_adds(client: Backloggery, plan: list[tuple], chosen: Optional[set[int]],
               max_failures: int = 5):
    results = []
    failures = 0
    progress = Progress(
        SpinnerColumn(), TextColumn("[progress.description]{task.description}"),
        BarColumn(), TextColumn("{task.completed}/{task.total}"), TimeElapsedColumn(),
        console=console,
    )
    with progress:
        task = progress.add_task("Adicionando jogos…", total=len(chosen or plan))
        for pos, (item, platform_id) in enumerate(plan, 1):
            if chosen is not None and pos not in chosen:
                continue
            if failures >= max_failures:
                console.print(f"[red]Abortando adições após {failures} falhas consecutivas (--max-failures).[/]")
                break
            blg = {"username": client.username, "title": item.name}
            desired = desired_blg(item, client.defaults)
            if platform_id:
                blg["platform_id"] = platform_id
                blg["abbr"] = client._platforms[platform_id]["abbr"]
            blg.update({
                "status": desired["status"], "priority": desired["priority"],
                "own": desired["own"], "region": desired["region"],
                "phys_digi": desired["phys_digi"], "notes": desired["notes"],
                "rating": desired["rating"] if desired["rating_set"] else None,
                "difficulty": 0,
                "achieve_score": 0, "achieve_total": 0, "online_info": "",
                "sub_platform_id": 0, "is_stealth": False,
            })
            pending_before = len(client.pending_adds)
            try:
                new_id = client.add_game(blg)
                if new_id:
                    status = "ok"
                    failures = 0
                elif len(client.pending_adds) > pending_before:
                    status = "pendente"
                else:
                    status = "sem id retornado"
                    failures += 1
            except BackloggeryUncertainError:
                raise
            except BackloggeryError as exc:
                status = f"ERRO: {exc}"
                failures += 1
            results.append((desired["title"], platform_id, status))
            progress.update(task, advance=1)
    if client.pending_adds:
        try:
            pending_results = client.reconcile_pending_adds()
        except BackloggeryError as exc:
            console.print(f"[red]Falha ao reconciliar additions pendentes: {exc}[/]")
            return results
        for game, new_id, error in pending_results:
            key = (normalize(game.get("title", "")), int(game.get("platform_id") or 0))
            for index, (title, platform_id, status) in enumerate(results):
                if status == "pendente" and (normalize(title), platform_id) == key:
                    status = "ok reconciliado" if new_id else f"ERRO: {error}"
                    results[index] = (title, platform_id, status)
                    if not new_id:
                        failures += 1
    return results


def apply_updates(client: Backloggery, plan: list[tuple], chosen: Optional[set[int]],
                  max_failures: int = 5):
    results = []
    failures = 0
    progress = Progress(
        SpinnerColumn(), TextColumn("[progress.description]{task.description}"),
        BarColumn(), TextColumn("{task.completed}/{task.total}"), TimeElapsedColumn(),
        console=console,
    )
    with progress:
        task = progress.add_task("Atualizando jogos…", total=len(chosen or plan))
        for pos, (item, entry, desired) in enumerate(plan, 1):
            if chosen is not None and pos not in chosen:
                continue
            if failures >= max_failures:
                console.print(f"[red]Abortando atualizações após {failures} falhas consecutivas (--max-failures).[/]")
                break
            try:
                base = client.get_gameinfo(entry.game_inst_id) or {}
            except BackloggeryError as exc:
                results.append((entry.title, f"ERRO: {exc}"))
                failures += 1
                progress.update(task, advance=1)
                continue
            base["prev_status"] = int(base.get("status") or 0)
            base["prev_own"] = int(base.get("own") or 1)
            if status_promotes(int(base.get("status") or 0), desired["status"]):
                base["status"] = desired["status"]
            base["priority"] = desired["priority"]
            base["notes"] = resolve_notes(base.get("notes") or "", desired["notes"])
            if desired["rating_set"]:
                base["rating"] = desired["rating"]
            if desired.get("ownership_set"):
                base["own"] = desired["own"]
                base["region"] = desired["region"]
                base["phys_digi"] = desired["phys_digi"]
            base["review_viewed"] = base.get("review_viewed", 0)
            try:
                ok = client.update_game(base)
                status = "ok" if ok else "falha (status 0)"
                if not ok:
                    failures += 1
                else:
                    failures = 0
            except BackloggeryError as exc:
                status = f"ERRO: {exc}"
                failures += 1
            results.append((entry.title, status))
            progress.update(task, advance=1)
    return results


def summary_table(action: str, results: list[tuple]) -> None:
    t = Table(title=f"Resultado — {action}", box=box.ROUNDED, expand=True)
    t.add_column("Título", style="bold")
    t.add_column("Status", style="cyan")
    ok = 0
    for title, status in results:
        t.add_row(title, status or "")
        if status == "ok" or status == "sem id retornado":
            ok += 1
    console.print(t)
    console.print(f"[bold]{action}: [green]{ok}[/] ok, [red]{len(results)-ok}[/] falhas")


def write_library_snapshot(entries: list[BlgEntry], path: Path) -> Path:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "created_at": utc_now_iso(),
        "count": len(entries),
        "entries": [asdict(entry) for entry in entries],
    }
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    logging.info("snapshot da biblioteca salvo em %s (%d jogos)", path, len(entries))
    return path


# --------------------------------------------------------------------------- #
# main
# --------------------------------------------------------------------------- #


def main() -> int:
    load_env()
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="executa as escritas (padrão: dry-run)")
    parser.add_argument("--sections", default=None, help="seções separadas por vírgula (backlog,played,dropped,catalog)")
    parser.add_argument("--json", dest="as_json", action="store_true", help="emite o plano em JSON e sai")
    parser.add_argument("--no-interactive", action="store_true", help="não pergunta nada")
    parser.add_argument("--delay", type=float, default=0.6, help="intervalo entre chamadas (s)")
    parser.add_argument("--retries", type=int, default=2, help="retries por chamada na rede/429/5xx")
    parser.add_argument("--max-failures", type=int, default=5, help="para após N falhas consecutivas por lote")
    parser.add_argument("--log", type=Path, default=DEFAULT_LOG, help=f"arquivo de log (padrão {DEFAULT_LOG})")
    parser.add_argument("--audit", type=Path, default=DEFAULT_AUDIT, help=f"audit JSONL de mutações (padrão {DEFAULT_AUDIT})")
    parser.add_argument("--snapshot", type=Path, default=None, help="snapshot JSON da biblioteca antes do apply")
    parser.add_argument("--yes", action="store_true", help="confirma apply não interativo")
    parser.add_argument("--verbose", action="store_true", help="também imprime logs no terminal")
    parser.add_argument("--username", default=None)
    parser.add_argument("--password", default=None)
    args = parser.parse_args()
    if args.apply and args.no_interactive and not args.yes:
        console.print("[red]Apply não interativo exige --yes explícito.[/]")
        return 2

    setup_logging(args.log, verbose=args.verbose)

    username = args.username or os.environ.get("BACKLOGGERY_USERNAME")
    password = args.password or os.environ.get("BACKLOGGERY_PASSWORD")
    if not username or not password:
        console.print("[red]Credenciais ausentes. Defina BACKLOGGERY_USERNAME/BACKLOGGERY_PASSWORD ou o arquivo .env.[/]")
        logging.error("credenciais ausentes")
        return 2

    sections = [s.strip() for s in (args.sections or "backlog,played,dropped").split(",") if s.strip()]
    if not sections:
        console.print("[red]Nenhuma seção selecionada.[/]")
        return 2

    console.print(f"[dim]Conectando como [bold]{username}[/]…[/]")
    client = Backloggery(username, password, delay=args.delay, retries=args.retries,
                         audit=AuditLog(args.audit))
    if client.audit:
        atexit.register(client.audit.close)
    try:
        client.login()
        client.load_reference()
        local_all = load_local()
        blg_all = client.get_library()
    except BackloggeryError as exc:
        console.print(f"[red]Erro: {exc}[/]")
        logging.exception("falha na inicialização")
        return 1

    local_by_section = {s: sum(1 for i in local_all if i.section == s) for s in ("backlog", "played", "dropped", "catalog")}

    if "catalog" in sections:
        catalog_count = local_by_section.get("catalog", 0)
        if catalog_count > 100 and not args.no_interactive:
            console.print(Panel(
                f"Seção catalog tem [bold]{catalog_count}[/] itens e será tratada como [bold]referência[/], "
                f"não como jogos pessoais (own=Own, status Unplayed/Normal).",
                title="Aviso: catalog", border_style="yellow",
            ))
            if not Confirm.ask("Continuar com catalog?"):
                sections.remove("catalog")

    local_selected = [i for i in local_all if i.section in sections]
    local_by_section = {s: sum(1 for i in local_selected if i.section == s) for s in sections}
    plan = match_entries(local_selected, blg_all, client.resolve_platform, client.is_user_platform)

    state = {
        "local_total": len(local_selected), "local_by_section": local_by_section,
        "blg_total": len(blg_all),
        "n_adds": len(plan["adds"]), "n_updates": len(plan["updates"]),
        "n_kept": len(plan["kept"]),
        "n_orphans": len(plan["orphans"]),
        "n_unresolved": len(plan["unresolved"]),
    }

    banner(state)

    if args.as_json:
        payload = {
            "username": username,
            "sections": sections,
            "blg_total": len(blg_all),
            "adds": [
                {
                    "title": item.name,
                    "platform": item.platform,
                    "platform_id": platform_id,
                    "section": item.section,
                    "local_status": item.status,
                    "status": STATUS[desired_blg(item, {})["status"]],
                    "priority": PRIORITY[desired_blg(item, {})["priority"]],
                }
                for item, platform_id in plan["adds"]
            ],
            "updates": [
                {
                    "title": entry.title,
                    "platform": entry.abbr,
                    "section": item.section,
                    "diffs": blg_field_diff(entry, desired),
                }
                for item, entry, desired in plan["updates"]
            ],
            "kept": len(plan["kept"]),
            "unresolved": [{"item": it.name, "why": why} for it, why in plan["unresolved"]],
            "orphans": [{"title": e.title, "abbr": e.abbr} for e in plan["orphans"]],
        }
        console.print(json.dumps(payload, ensure_ascii=False, indent=2))
        client.session.close()
        return 0

    # Preview tables
    add_rows = [(i.name, i.platform or "—", STATUS[desired_blg(i, {}).get("status", 10)] or "",
                 PRIORITY[desired_blg(i, {}).get("priority", 40)] or "",
                 str(desired_blg(i, {}).get("rating") or "—") if i.section != "catalog" else "—",
                 i.section)
                for i, _ in plan["adds"]]
    items_table("Adicionar", add_rows,
                [("Título", "bold"), ("Plataforma", "cyan"), ("Status", ""), ("Prioridade", ""), ("Nota", ""), ("Seção", "dim")])

    upd_rows = []
    for i, ent, des in plan["updates"]:
        diffs = blg_field_diff(ent, des)
        upd_rows.append((ent.title,
                         diff_value(diffs, "status"),
                         diff_value(diffs, "prioridade"),
                         diff_value(diffs, "rating"),
                         diff_value(diffs, "notas"),
                         i.section))
    items_table("Atualizar", upd_rows,
                [("Título", "bold"), ("Status", "yellow"), ("Prioridade", "yellow"), ("Nota", ""), ("Notas", ""), ("Seção", "dim")])

    if plan["unresolved"]:
        rows = [(it.name, why) for it, why in plan["unresolved"]]
        items_table("Ambíguos / sem plataforma", rows, [("Item", "bold"), ("Motivo", "magenta")])

    if plan["orphans"]:
        rows = [(e.title, e.abbr, STATUS.get(e.status, e.status)) for e in plan["orphans"]]
        items_table("Na Backloggery sem par local (prune desativado por padrão)", rows,
                    [("Título", "bold"), ("Plat", "cyan"), ("Status", "dim")])

    if args.no_interactive:
        if not args.apply:
            logging.info("dry-run concluído (nada escrito)")
            console.print("[yellow]dry-run: nada foi escrito. Use --apply para aplicar.[/]")
            console.print(f"[dim]log: {args.log}[/]")
            return 0

    add_plan = plan["adds"]
    upd_plan = plan["updates"]

    if args.apply:
        chosen_adds = set(range(1, len(add_plan) + 1))
        chosen_upds = set(range(1, len(upd_plan) + 1))
        if not args.no_interactive:
            if not Confirm.ask(f"Aplicar [green]{len(add_plan)}[/] adições e [yellow]{len(upd_plan)}[/] atualizações?", default=False):
                raw = Prompt.ask("Digite índices (ex.: 1-5,8) ou 'todos'", default="todos")
                if raw.strip().lower() in ("", "todos", "all"):
                    chosen_adds = set(range(1, len(add_plan) + 1))
                    chosen_upds = set(range(1, len(upd_plan) + 1))
                else:
                    chosen_adds = parse_indices(raw, len(add_plan))
                    chosen_upds = parse_indices(raw, len(upd_plan)) if len(add_plan) == len(upd_plan) else set()
        snapshot_path = args.snapshot
        if snapshot_path is None:
            snapshot_path = LOG_DIR / f"trespordez-backloggery-snapshot-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')}.json"
        write_library_snapshot(blg_all, snapshot_path)
        console.print(f"[dim]snapshot: {snapshot_path}[/]")
        logging.info("apply: %d adições, %d atualizações", len(chosen_adds), len(chosen_upds))
        ok_adds = apply_adds(client, add_plan, chosen_adds, max_failures=args.max_failures)
        ok_upds = apply_updates(client, upd_plan, chosen_upds, max_failures=args.max_failures)
        summary_table("Adições", [(t, s) for t, _, s in ok_adds])
        summary_table("Atualizações", ok_upds)
        console.print("[bold green]Concluído. Confira a biblioteca em https://backloggery.com/[/]")
    else:
        logging.info("dry-run concluído (nada escrito)")
        console.print("[yellow]dry-run: nada foi escrito. Use --apply para aplicar.[/]")
    console.print(f"[dim]log: {args.log}[/]")
    console.print(f"[dim]audit: {args.audit}[/]")
    client.session.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())