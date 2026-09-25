import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock


SCRIPT = Path(__file__).parents[1] / "scripts" / "backloggery-sync.py"
SPEC = importlib.util.spec_from_file_location("backloggery_sync", SCRIPT)
assert SPEC is not None
assert SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


def local_item(section="backlog", name="Jogo", platform: str | None = "PC", status: str | None = None, reason=None, scores=None):
    return MODULE.LocalItem(
        section=section,
        pos=0,
        name=name,
        platform=platform,
        status=status,
        reason=reason,
        scores=scores or {},
    )


def remote_item(title="Jogo", platform_id=1, abbr="PC", status=10, priority=40, rating=None, own=1, game_inst_id=None):
    return MODULE.BlgEntry(
        game_inst_id=game_inst_id or platform_id,
        user_id=112025,
        title=title,
        platform_id=platform_id,
        abbr=abbr,
        status=status,
        priority=priority,
        own=own,
        region=2,
        phys_digi=20,
        rating=rating,
    )


class StatusMappingTests(unittest.TestCase):
    def test_canonical_statuses(self):
        expected = {
            "jogando": ("Unfinished", "Now Playing"),
            "zerado": ("Beaten", "Normal"),
            "na-fila": ("Unplayed", "High"),
            "pausado": ("Unfinished", "Paused"),
            "arquivado": ("Unplayed", "Shelved"),
        }
        for section in ("backlog", "played"):
            for status, result in expected.items():
                with self.subTest(section=section, status=status):
                    self.assertEqual(MODULE.local_status_map(section, status), result)

    def test_section_overrides(self):
        self.assertEqual(MODULE.local_status_map("dropped", None), ("Unfinished", "Shelved"))
        self.assertEqual(MODULE.local_status_map("dropped", "zerado"), ("Unfinished", "Shelved"))
        self.assertEqual(MODULE.local_status_map("catalog", "arquivado"), ("Unplayed", "Normal"))
        self.assertEqual(MODULE.local_status_map("played", None), ("Beaten", "Normal"))

    def test_legacy_aliases(self):
        self.assertEqual(MODULE.local_status_map("backlog", "▶️"), ("Unfinished", "Now Playing"))
        self.assertEqual(MODULE.local_status_map("backlog", "💾"), ("Unplayed", "High"))
        self.assertEqual(MODULE.local_status_map("backlog", "👑"), ("Beaten", "Normal"))

    def test_unknown_status_is_rejected(self):
        for section in ("backlog", "played", "dropped", "catalog"):
            with self.subTest(section=section):
                with self.assertRaisesRegex(ValueError, "status local inválido"):
                    MODULE.local_status_map(section, "unexpected")

    def test_status_none_can_move_to_a_real_status(self):
        self.assertTrue(MODULE.status_promotes(80, 10))
        self.assertFalse(MODULE.status_promotes(10, 80))


class MatchingTests(unittest.TestCase):
    def test_known_platform_matches_only_same_platform(self):
        local = [local_item(section="played", name="Grandia", platform="PlayStation", status="zerado", scores={"geral": 9})]
        remote = [
            remote_item("Grandia", platform_id=1, abbr="PS", status=30, rating=9),
            remote_item("Grandia", platform_id=2, abbr="Saturn", status=30, rating=9),
        ]

        plan = MODULE.match_entries(local, remote, lambda value: (1, "PS", {}))

        self.assertEqual(plan["unresolved"], [])
        self.assertEqual(len(plan["updates"]), 1)
        self.assertEqual(plan["adds"], [])
        self.assertEqual([entry.abbr for entry in plan["orphans"]], ["Saturn"])

    def test_unconfigured_user_platform_is_unresolved(self):
        local = [local_item(section="backlog", name="Pulstar", platform="Neo Geo")]
        plan = MODULE.match_entries(
            local,
            [],
            lambda _value: (104, "NG", {}),
            lambda _platform_id: False,
        )
        self.assertEqual(plan["adds"], [])
        self.assertEqual(len(plan["unresolved"]), 1)

    def test_duplicate_local_entry_is_not_added_twice(self):
        local = [
            local_item(section="played", name="Blazing Star", platform="Neo Geo", status="zerado"),
            local_item(section="played", name="Blazing Star", platform="Neo Geo", status="zerado"),
        ]
        plan = MODULE.match_entries(
            local,
            [],
            lambda _value: (104, "NG", {}),
            lambda _platform_id: True,
        )
        self.assertEqual(len(plan["adds"]), 1)
        self.assertEqual(len(plan["unresolved"]), 1)
        self.assertIn("duplicata local", plan["unresolved"][0][1])

    def test_existing_ownership_is_preserved_without_local_ownership(self):
        local = [local_item(section="played", name="Jogo", status="zerado")]
        remote = [remote_item(status=30, own=7)]

        plan = MODULE.match_entries(local, remote, lambda value: (1, "PC", {}))

        self.assertEqual(plan["updates"], [])
        self.assertEqual(len(plan["kept"]), 1)

    def test_missing_platform_is_ambiguous_when_title_has_multiple_matches(self):
        local = [local_item(name="Grandia", platform=None)]
        remote = [
            remote_item("Grandia", platform_id=1, abbr="PS"),
            remote_item("Grandia", platform_id=2, abbr="Saturn"),
        ]

        plan = MODULE.match_entries(local, remote, lambda value: (1, "PS", {}))

        self.assertEqual(plan["adds"], [])
        self.assertEqual(len(plan["unresolved"]), 1)
        self.assertIn("2 correspondências", plan["unresolved"][0][1])

    def test_unknown_platform_is_unresolved(self):
        local = [local_item(platform="Plataforma Inventada")]

        def resolve(_value):
            raise MODULE.BackloggeryError("plataforma sem correspondência")

        plan = MODULE.match_entries(local, [], resolve)

        self.assertEqual(plan["adds"], [])
        self.assertEqual(len(plan["unresolved"]), 1)
        self.assertIn("Plataforma Inventada", plan["unresolved"][0][1])

    def test_known_platform_is_required_by_matcher(self):
        plan = MODULE.match_entries([local_item(platform="PC")], [remote_item()])

        self.assertEqual(plan["adds"], [])
        self.assertEqual(len(plan["unresolved"]), 1)
        self.assertIn("não resolvida", plan["unresolved"][0][1])

    def test_duplicate_remote_entries_are_ambiguous(self):
        local = [local_item(name="Jogo", platform=None)]
        remote = [remote_item("Jogo", platform_id=1), remote_item("Jogo", platform_id=1)]

        plan = MODULE.match_entries(local, remote, lambda value: (1, "PC", {}))

        self.assertEqual(plan["adds"], [])
        self.assertEqual(len(plan["unresolved"]), 1)
        self.assertIn("2 correspondências", plan["unresolved"][0][1])

    def test_item_without_platform_is_unresolved_when_not_found(self):
        plan = MODULE.match_entries([local_item(name="Jogo", platform=None)], [], lambda value: (1, "PC", {}))

        self.assertEqual(plan["adds"], [])
        self.assertEqual(len(plan["unresolved"]), 1)
        self.assertIn("sem plataforma", plan["unresolved"][0][1])

    def test_diff_value_handles_value_and_label_only_changes(self):
        self.assertEqual(MODULE.diff_value(["rating 4→9"], "rating"), "4→9")
        self.assertEqual(MODULE.diff_value(["notas"], "notas"), "alterado")
        self.assertEqual(MODULE.diff_value(["notas"], "nota"), "—")


class AddResponseTests(unittest.TestCase):
    def test_uncertain_response_is_queued_without_retrying(self):
        client = object.__new__(MODULE.Backloggery)
        client.username = "user"
        client.delay = 0
        client.audit = None
        client.pending_adds = []
        client._post = Mock(side_effect=MODULE.BackloggeryUncertainError("HTTP 500"))

        result = client.add_game({"title": "Pragmata", "platform_id": 123})

        self.assertIsNone(result)
        self.assertEqual(len(client.pending_adds), 1)
        self.assertEqual(client._post.call_count, 1)

    def test_pending_response_reconciles_against_single_library_entry(self):
        client = object.__new__(MODULE.Backloggery)
        client.username = "user"
        client.delay = 0
        client.audit = None
        client.pending_adds = [{"title": "Pragmata", "platform_id": 123}]
        client.get_library = Mock(return_value=[remote_item("Pragmata", platform_id=123, game_inst_id=123)])

        result = client.reconcile_pending_adds()

        self.assertEqual(result[0][1], 123)
        self.assertEqual(client.pending_adds, [])

    def test_unexpected_response_is_reported_without_crashing(self):
        client = object.__new__(MODULE.Backloggery)
        client.username = "user"
        client.delay = 0
        client.audit = None
        client.pending_adds = []
        client._post = Mock(return_value=["Invalid platform entry!"])

        self.assertIsNone(client.add_game({"title": "Jogo", "platform_id": 123}))


class SnapshotTests(unittest.TestCase):
    def test_snapshot_contains_remote_library_without_credentials(self):
        with tempfile.TemporaryDirectory() as directory:
            path = MODULE.write_library_snapshot([remote_item()], Path(directory) / "snapshot.json")
            payload = json.loads(path.read_text(encoding="utf-8"))

        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["entries"][0]["title"], "Jogo")
        self.assertNotIn("password", payload)


if __name__ == "__main__":
    unittest.main()
