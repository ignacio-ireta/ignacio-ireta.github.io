"""Capture a static snapshot of the dogma API for the portfolio demo.

Run inside dogma's own environment (build.mjs does this):

    uv run --project <dogma> --frozen python capture.py <dogma> <out-dir> <scratch-dir>

What it does, in order:

1. Builds a throwaway data root in <scratch-dir> that links dogma's ``content/`` and
   ``curriculum/`` and starts with an empty ``var/`` and ``workspace/``. The real learner
   database, workspace, ``private/`` and ``corpus/`` are never opened.
2. Seeds a demo learner by replaying the first days of the core path through the real API on an
   injected clock: run the starter (it fails), submit the reference solution (it passes),
   rate due cards, and close each session with a short transition note.
3. Freezes the clock at CAPTURE_AT and records every GET the web UI makes, the reviewed hint
   ladder (levels 1-3, the authored text only) and dry-run calendar previews. Precomputes each
   rating of each due card on a throwaway copy of the database.
4. Writes the public test file and fixtures of each problem for in-browser grading.

Never written to <out-dir>: reference solutions, hidden tests, the level-4 walkthrough, model
output, corpus passages and workspace files. build.mjs checks the output for leaks afterwards.
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
import shutil
import sqlite3
import subprocess
import sys
import time
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any
from urllib.parse import quote, urlencode

# Local dates follow the process time zone (dogma.learning.calendar uses astimezone()). Pin it,
# so the snapshot does not depend on where it was built.
os.environ["TZ"] = "Europe/Oslo"
time.tzset()

from fastapi.testclient import TestClient  # noqa: E402

from dogma.api import deps  # noqa: E402
from dogma.api.app import create_app  # noqa: E402
from dogma.core.config import Settings  # noqa: E402

API = "/api/v1"
# The demo learner's study days: the first eight study days of the core path (Sunday is the
# path's rest day). The snapshot is taken the next morning, before the first session.
SEED_DAYS = (
    "2026-10-26",
    "2026-10-27",
    "2026-10-28",
    "2026-10-29",
    "2026-10-30",
    "2026-10-31",
    "2026-11-02",
    "2026-11-03",
)
SLOT_HOURS = (8, 12, 17)  # Oslo time; one hour per session
CAPTURE_AT = "2026-11-04T08:30:00"
# Links into the data root (sources/ is the committed, scrubbed seed that topic citations
# resolve against). Everything else (var/, workspace/) starts empty.
LINKED = ("content", "curriculum", "sources")
# The tutor must not reach a real model: hints are captured as the reviewed text alone.
NO_MODEL = "http://127.0.0.1:9/v1"
HINT_LEVELS = (1, 2, 3)
# The API's "unavailable" note names the local model server and how to start it. The demo has no
# model at all, so the note says that instead (shown in brackets after the app's own sentence).
DEMO_NUDGE_NOTE = "this demo has no model: the local app adds a nudge written for your code"
TIERS = ("A", "B", "C")
BROWSER_RUNTIMES = ("py-stdlib", "py-numpy", "py-data", "sql-duckdb")


def oslo(day: str, hour: int, minute: int = 0) -> datetime:
    """An aware datetime for a local Oslo wall-clock time."""
    naive = datetime.fromisoformat(f"{day}T{hour:02d}:{minute:02d}:00")
    return naive.astimezone().astimezone(UTC)


class Clock:
    """The injected API clock. ``set`` moves it; every request reads the current value."""

    def __init__(self, start: datetime) -> None:
        self.now = start

    def set(self, when: datetime) -> None:
        self.now = when

    def advance(self, minutes: int) -> None:
        self.now += timedelta(minutes=minutes)

    def __call__(self) -> datetime:
        return self.now


class Api:
    """A thin client over the in-process app. Every non-2xx answer is a capture failure."""

    def __init__(self, client: TestClient) -> None:
        self.client = client

    def get(self, path: str) -> Any:
        response = self.client.get(API + path)
        if response.status_code != 200:
            raise RuntimeError(f"GET {path}: {response.status_code} {response.text[:400]}")
        return response.json()

    def post(
        self, path: str, body: object | None = None, *, ok: tuple[int, ...] = (200, 201)
    ) -> Any:
        response = self.client.post(API + path, json=body)
        if response.status_code not in ok:
            raise RuntimeError(f"POST {path}: {response.status_code} {response.text[:400]}")
        return response.json()

    def put(self, path: str, body: object) -> Any:
        response = self.client.put(API + path, json=body)
        if response.status_code != 200:
            raise RuntimeError(f"PUT {path}: {response.status_code} {response.text[:400]}")
        return response.json()

    def stream(self, path: str, body: object) -> tuple[int, str]:
        response = self.client.post(API + path, json=body, headers={"Accept": "text/event-stream"})
        return response.status_code, response.text


def ident(problem_or_topic_id: str) -> str:
    return "/".join(quote(part, safe="") for part in problem_or_topic_id.split("/"))


def snapshot_key(path: str, query: dict[str, object] | None = None) -> str:
    """The file a GET is stored under. Mirrored by snapshotKey() in web/demo/api.ts."""
    key = path.strip("/")
    if query:
        key += "".join(f"~{name}-{query[name]}" for name in sorted(query))
    return f"{key}.json"


class Writer:
    def __init__(self, out: Path) -> None:
        self.out = out
        self.files = 0

    def json(self, relative: str, payload: object) -> None:
        target = self.out / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(
            json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )
        self.files += 1


def make_root(dogma: Path, scratch: Path) -> Path:
    root = scratch / "data-root"
    if root.exists():
        shutil.rmtree(root)
    root.mkdir(parents=True)
    for name in LINKED:
        (root / name).symlink_to(dogma / name, target_is_directory=True)
    return root


# --------------------------------------------------------------------------------------------
# Seeding: a demo learner replays the first study days of the path through the real API.
# --------------------------------------------------------------------------------------------


def solution_path(dogma: Path, problem_id: str, language: str) -> Path:
    track, topic, problem = problem_id.split("/")
    name = "solution.sql" if language == "sql" else "solution.py"
    return dogma / "content" / track / topic / "problems" / problem / name


def rating_for(card_id: str, day_index: int) -> int:
    """A deterministic, mostly-Good spread of recall ratings."""
    digest = hashlib.sha256(f"{card_id}:{day_index}".encode()).digest()[0]
    if digest < 26:
        return 2  # Hard, about one in ten
    if digest > 235:
        return 4  # Easy, about one in twelve
    return 3


def solve(api: Api, clock: Clock, dogma: Path, problem_id: str) -> None:
    """Run the starter (it fails), then submit the reference solution (it passes)."""
    problem = api.get(f"/problems/{ident(problem_id)}")
    api.put(f"/workspace/{ident(problem_id)}", {"content": problem["starter"]})
    clock.advance(14)
    first = api.post("/attempts", {"problem_id": problem_id, "mode": "run"})
    if first["report"]["status"] == "passed":
        raise RuntimeError(f"{problem_id}: the starter passed its public tests")
    reference = solution_path(dogma, problem_id, problem["language"]).read_text(encoding="utf-8")
    api.put(f"/workspace/{ident(problem_id)}", {"content": reference})
    clock.advance(16)
    submit = api.post("/attempts", {"problem_id": problem_id, "mode": "submit"})
    if submit["report"]["status"] != "passed":
        raise RuntimeError(f"{problem_id}: the reference solution did not pass: {submit['report']}")


def review_due(api: Api, clock: Clock, day_index: int) -> int:
    due = api.get("/reviews/due?limit=20")["cards"]
    for card in due:
        clock.advance(1)
        api.post(
            f"/reviews/{ident(card['card_id'])}",
            {
                "rating": rating_for(card["card_id"], day_index),
                "expected_due": card["due"],
                "expected_content_hash": card["content_hash"],
            },
        )
    return len(due)


def close_note(session: dict[str, Any], titles: dict[str, str]) -> dict[str, object]:
    kind = session["kind"]
    topic = titles.get(session.get("topic_id") or "", "the topic")
    if kind == "learn":
        return {
            "stopped_where": f"Submitted the core problem for {topic}; all its tests pass.",
            "next_step": "Skim the interview angle once more, then start the next Learn session.",
            "blocker": None,
            "answer": None,
        }
    return {
        "stopped_where": "Cleared the due cards and re-solved one familiar problem.",
        "next_step": "Start the next session from Today.",
        "blocker": None,
        "answer": None,
    }


def seed(api: Api, clock: Clock, dogma: Path, titles: dict[str, str]) -> dict[str, int]:
    stats = {"sessions": 0, "solved": 0, "reviews": 0}
    for day_index, day in enumerate(SEED_DAYS):
        for hour in SLOT_HOURS:
            clock.set(oslo(day, hour))
            today = api.get("/today")
            session = today["current"]
            if session is None:
                break
            stats["reviews"] += review_due(api, clock, day_index)
            must_do = session.get("must_do")
            if must_do:
                solve(api, clock, dogma, must_do)
                stats["solved"] += 1
            clock.advance(5)
            api.post(f"/sessions/{session['session_id']}/close", close_note(session, titles))
            stats["sessions"] += 1
    return stats


# --------------------------------------------------------------------------------------------
# Capture
# --------------------------------------------------------------------------------------------


def capture_reads(api: Api, w: Writer, catalog: dict[str, Any]) -> dict[str, Any]:
    """Every GET the UI makes, at CAPTURE_AT. Order matters: reads that write go last."""
    w.json("api/" + snapshot_key("health"), api.get("/health"))
    w.json("api/" + snapshot_key("catalog"), catalog)
    topics = [topic["id"] for topic in catalog["topics"]]
    problems = [problem["id"] for topic in catalog["topics"] for problem in topic["problems"]]
    for topic_id in topics:
        topic = api.get(f"/topics/{ident(topic_id)}")
        w.json(f"api/topics/{topic_id}.json", topic)
        # Topics without interview questions answer 404, which the demo API reproduces.
        if topic["interview_present"]:
            interview = api.get(f"/topics/{ident(topic_id)}/interview")
            w.json(f"api/topics/{topic_id}/interview.json", interview)
    problem_rows: dict[str, Any] = {}
    for problem_id in problems:
        row = api.get(f"/problems/{ident(problem_id)}")
        problem_rows[problem_id] = row
        w.json(f"api/problems/{problem_id}.json", row)
    for rubric in ("topic-answer", "mock"):
        w.json(f"api/rubrics/{rubric}.json", api.get(f"/rubrics/{rubric}"))

    progress = api.get("/progress")
    w.json("api/" + snapshot_key("progress"), progress)
    for week in progress["weeks"]:
        number = week["week"]
        w.json(
            "api/" + snapshot_key("progress", {"week": number}), api.get(f"/progress?week={number}")
        )

    tracks = sorted({topic["track"] for topic in catalog["topics"]})
    for tier in (None, *TIERS):
        for track in (None, *tracks):
            query = {k: v for k, v in (("tier", tier), ("track", track)) if v is not None}
            suffix = f"?{urlencode(query)}" if query else ""
            w.json("api/" + snapshot_key("coverage", query), api.get(f"/coverage{suffix}"))

    calendar = api.get("/calendar")
    w.json("api/" + snapshot_key("calendar"), calendar)
    w.json("api/" + snapshot_key("mocks/current"), api.get("/mocks/current"))
    w.json("api/" + snapshot_key("resolves/current"), api.get("/resolves/current"))

    # Plans or resumes the morning's first session: a write, but the same one the UI makes.
    today = api.get("/today")
    w.json("api/" + snapshot_key("today"), today)
    due = api.get("/reviews/due?limit=20")
    w.json("api/" + snapshot_key("reviews/due", {"limit": 20}), due)
    return {"problems": problem_rows, "calendar": calendar, "due": due, "tracks": tracks}


def warp_requests(weeks: int) -> list[dict[str, object]]:
    moves: list[dict[str, object]] = [{"kind": "sync"}, {"kind": "original"}]
    moves += [{"kind": "to_week", "week": n} for n in range(1, weeks + 1)]
    moves += [{"kind": kind, "weeks": n} for kind in ("ahead", "back") for n in range(1, weeks)]
    return moves


def warp_key(move: dict[str, object]) -> str:
    """Mirrored by warpKey() in web/demo/api.ts."""
    amount = move.get("week") or move.get("weeks")
    return f"{move['kind']}-{amount}" if amount is not None else str(move["kind"])


def capture_warp_previews(api: Api, w: Writer, weeks: int) -> int:
    previews: dict[str, object] = {}
    for move in warp_requests(weeks):
        response = api.client.post(f"{API}/calendar/warp", json={**move, "dry_run": True})
        previews[warp_key(move)] = {"status": response.status_code, "body": response.json()}
    w.json("warp-previews.json", previews)
    return len(previews)


def copy_db(source: Path, target: Path) -> None:
    """Copy a WAL-mode SQLite database with the backup API (a file copy can miss the WAL)."""
    with sqlite3.connect(source) as src, sqlite3.connect(target) as dst:
        src.backup(dst)
    src.close()
    dst.close()


def capture_ratings(api: Api, w: Writer, root: Path, due: dict[str, Any]) -> int:
    """Each rating of each due card, each on a fresh copy of the snapshot's database."""
    db = root / "var" / "dogma.db"
    pristine = root / "var" / "dogma.snapshot.db"
    copy_db(db, pristine)
    answers: dict[str, dict[str, object]] = {}
    try:
        for card in due["cards"]:
            per_rating: dict[str, object] = {}
            for rating in (1, 2, 3, 4):
                copy_db(pristine, db)
                per_rating[str(rating)] = api.post(
                    f"/reviews/{ident(card['card_id'])}",
                    {
                        "rating": rating,
                        "expected_due": card["due"],
                        "expected_content_hash": card["content_hash"],
                    },
                )
            answers[card["card_id"]] = per_rating
    finally:
        copy_db(pristine, db)
        pristine.unlink()
    w.json("review-ratings.json", answers)
    return len(answers)


def capture_hints(api: Api, w: Writer, problems: dict[str, Any]) -> int:
    count = 0
    for problem_id, row in problems.items():
        ladder: dict[str, str] = {}
        for level in HINT_LEVELS:
            if level > row["hints_count"]:
                continue
            status, body = api.stream(
                "/tutor/hint/stream",
                {"problem_id": problem_id, "level": level, "confirm_walkthrough": False},
            )
            if status != 200:
                raise RuntimeError(f"hint {problem_id} L{level}: {status} {body[:300]}")
            ladder[str(level)] = demo_unavailable_note(body)
            count += 1
        w.json(f"hints/{problem_id}.json", ladder)
    return count


def demo_unavailable_note(stream: str) -> str:
    """Replace the data of the stream's ``unavailable`` event with the demo's note."""
    events = stream.split("\n\n")
    for index, event in enumerate(events):
        lines = event.split("\n")
        if "event: unavailable" not in lines:
            continue
        payload = json.loads(
            next(line[len("data: ") :] for line in lines if line.startswith("data: "))
        )
        payload["note"] = DEMO_NUDGE_NOTE
        events[index] = f"event: unavailable\ndata: {json.dumps(payload, ensure_ascii=False)}"
    return "\n\n".join(events)


def capture_runner_bundles(dogma: Path, w: Writer, problems: dict[str, Any]) -> dict[str, str]:
    """Public tests and fixtures, the only grading files that leave dogma (CONTENT_SPEC §6.4)."""
    runtimes: dict[str, str] = {}
    for problem_id, row in problems.items():
        runtimes[problem_id] = row["runtime"]
        if row["runtime"] not in BROWSER_RUNTIMES:
            continue
        track, topic, problem = problem_id.split("/")
        problem_dir = dogma / "content" / track / topic / "problems" / problem
        fixtures: dict[str, str] = {}
        fixtures_dir = problem_dir / "fixtures"
        if fixtures_dir.is_dir():
            for path in sorted(fixtures_dir.rglob("*")):
                if path.is_symlink():
                    raise RuntimeError(f"{path}: fixtures must not contain symlinks")
                if path.is_file():
                    fixtures[path.relative_to(problem_dir).as_posix()] = base64.b64encode(
                        path.read_bytes()
                    ).decode("ascii")
        w.json(
            f"runner/{problem_id}.json",
            {
                "tests": {
                    "test_public.py": (problem_dir / "test_public.py").read_text(encoding="utf-8")
                },
                "fixtures": fixtures,
            },
        )
    return runtimes


def dogma_revision(dogma: Path) -> str:
    """The commit the snapshot was taken from, with -dirty when the working tree had changes."""
    try:
        out = subprocess.run(
            ["git", "-C", str(dogma), "describe", "--always", "--dirty", "--abbrev=7"],
            check=True,
            capture_output=True,
            text=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return "unknown"
    return out.stdout.strip()


def main(argv: list[str]) -> int:
    if len(argv) != 4:
        print(__doc__, file=sys.stderr)
        return 2
    dogma, out, scratch = (Path(arg).resolve() for arg in argv[1:])
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    root = make_root(dogma, scratch)
    # _env_file=None: a developer's dogma .env must not change the snapshot.
    settings = Settings(repo_root=root, llm_base_url=NO_MODEL, _env_file=None)  # type: ignore[call-arg]
    app = create_app(settings, web_dist=root / "no-web-build")
    clock = Clock(oslo(SEED_DAYS[0], SLOT_HOURS[0]))
    app.dependency_overrides[deps.get_clock] = lambda: clock
    w = Writer(out)
    with TestClient(app, base_url="http://127.0.0.1:8765") as client:
        api = Api(client)
        catalog = api.get("/catalog")
        titles = {topic["id"]: topic["title"] for topic in catalog["topics"]}
        started = time.monotonic()
        stats = seed(api, clock, dogma, titles)
        print(f"seeded {stats} in {time.monotonic() - started:.0f}s", flush=True)

        clock.set(datetime.fromisoformat(CAPTURE_AT).astimezone().astimezone(UTC))
        reads = capture_reads(api, w, catalog)
        weeks = len(reads["calendar"]["weeks"])
        previews = capture_warp_previews(api, w, weeks)
        ratings = capture_ratings(api, w, root, reads["due"])
        hints = capture_hints(api, w, reads["problems"])
        runtimes = capture_runner_bundles(dogma, w, reads["problems"])
        # Last: replanning for an energy level is stored, and changes later reads of /today.
        for energy in ("low", "normal"):
            replan = api.get(f"/today?energy={energy}")
            w.json("api/" + snapshot_key("today", {"energy": energy}), replan)

    w.json(
        "manifest.json",
        {
            "schema": 1,
            "captured_at": clock().isoformat(),
            "local_date": CAPTURE_AT[:10],
            "time_zone": "Europe/Oslo",
            "dogma_revision": dogma_revision(dogma),
            "seed": {**stats, "days": list(SEED_DAYS)},
            "counts": {
                "topics": len(catalog["topics"]),
                "problems": len(reads["problems"]),
                "hints": hints,
                "warp_previews": previews,
                "due_cards": ratings,
            },
            "runtimes": runtimes,
            "browser_runtimes": list(BROWSER_RUNTIMES),
            # Filled in by build.mjs after the in-browser runtime has graded every problem.
            "browser_runnable": [],
        },
    )
    print(f"wrote {w.files} files to {out}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
