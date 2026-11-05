"""Grade one attempt in the browser the way dogma grades it locally (dogma demo only).

The pipeline follows ``dogma.runner.run``: static checks (``dogma.grading.static``), then pytest
in-process with dogma's own ``Collector`` plugin (``dogma_harness``), then the learner-safe wording
of ``dogma.grading.display``, shaped like the API's ``LearnerReport``. Those modules ship verbatim
from dogma; only ``dogma.grading.models`` is a dataclass stand-in.

What differs from the local runner, all forced by the browser:

- Only ``test_public.py`` ships with the demo, so a submit is graded on the public tests.
- There is no OS sandbox. Pyodide runs in a Web Worker, and the page enforces the time limit by
  terminating the worker (see web/demo/runner.ts).
- Pyodide has no ``signal.setitimer``. A no-op stand-in keeps the per-test time guards of a few
  public tests importable; the worker's time limit still stops a runaway run.
"""

from __future__ import annotations

import base64
import json
import os
import shutil
import signal
import sys
import time
from pathlib import Path
from typing import Any

import pytest

from dogma.grading.display import findings_in_words, learner_message, status_headline
from dogma.grading.models import GradeReport, RunStatus, TestResult
from dogma.grading.static import check_submission
from dogma_harness.collector import Collector
from dogma_harness.report import HarnessResult

RUNS = Path("/tmp/dogma-runs")
PUBLIC_TESTS = "test_public.py"
# dogma_harness.cli.PYTEST_ARGS without --hypothesis-seed: no public test uses Hypothesis.
PYTEST_ARGS = ("-q", "-p", "no:cacheprovider", "--capture=no", "--tb=short")
_HARNESS_STATUS = {
    "passed": RunStatus.PASSED,
    "failed": RunStatus.FAILED,
    "error": RunStatus.ERROR,
}
_SUBMISSION = {"python": "submission.py", "sql": "submission.sql"}
_REJECTED = "rejected before running: fix the findings listed"


def _install_signal_stand_ins() -> None:
    if hasattr(signal, "setitimer"):
        return

    def setitimer(which: int, seconds: float, interval: float = 0.0) -> tuple[float, float]:
        return (0.0, 0.0)

    signal.ITIMER_REAL = getattr(signal, "ITIMER_REAL", 0)
    signal.setitimer = setitimer


_install_signal_stand_ins()


def headlines() -> str:
    """The sentences the page shows for runs it stops itself (timeout) or loses (error)."""
    return json.dumps(
        {
            "timeout": status_headline(RunStatus.TIMEOUT),
            "error": status_headline(RunStatus.ERROR),
        }
    )


def grade(request_json: str) -> str:
    """Grade one attempt. ``request_json`` carries the problem, the code and the test bundle."""
    request: dict[str, Any] = json.loads(request_json)
    return json.dumps(learner_report(_grade(request)), ensure_ascii=False)


def learner_report(report: GradeReport) -> dict[str, Any]:
    """The API's LearnerReport (dogma.api.services.attempts.learner_report), as a dict."""
    return {
        "attempt_id": report.attempt_id,
        "problem_id": report.problem_id,
        "problem_version": report.problem_version,
        "runtime": report.runtime,
        "status": report.status.value,
        "headline": status_headline(report.status),
        "tests": [
            {
                "name": test.name,
                "file": test.file,
                "outcome": test.outcome,
                "message": learner_message(test),
                "duration_ms": test.duration_ms,
            }
            for test in report.tests
        ],
        "static": [
            {"rule": finding.rule, "message": finding.message, "line": finding.line}
            for finding in report.static
        ],
        "findings": findings_in_words(report),
        "stdout": report.stdout,
        "duration_ms": report.duration_ms,
        "message": report.message,
    }


def _grade(request: dict[str, Any]) -> GradeReport:
    problem: dict[str, Any] = request["problem"]
    ident = {
        "attempt_id": str(request["attempt_id"]),
        "problem_id": problem["id"],
        "problem_version": int(problem["version"]),
        "runtime": problem["runtime"],
    }
    run_dir = RUNS / ident["attempt_id"]
    tests_dir = RUNS / f".{ident['attempt_id']}.tests"
    for directory in (run_dir, tests_dir):
        shutil.rmtree(directory, ignore_errors=True)
        directory.mkdir(parents=True)
    try:
        submission = run_dir / _SUBMISSION[problem["language"]]
        submission.write_text(request["code"], encoding="utf-8")
        findings = check_submission(
            submission,
            language=problem["language"],
            entry=problem["entry"],
            banned_imports=problem["banned_imports"],
        )
        if findings:
            return GradeReport(
                **ident, status=RunStatus.REJECTED, static=tuple(findings), message=_REJECTED
            )
        _stage(run_dir, tests_dir, submission, request["bundle"])
        started = time.perf_counter()
        harness = _run_pytest(run_dir, tests_dir)
        duration_ms = round((time.perf_counter() - started) * 1000)
        return GradeReport(
            **ident,
            status=_HARNESS_STATUS[harness.status],
            tests=tuple(
                TestResult(
                    name=t.name,
                    file=t.file,
                    outcome=t.outcome,
                    message=t.message,
                    duration_ms=t.duration_ms,
                )
                for t in harness.tests
            ),
            stdout=harness.stdout,
            duration_ms=duration_ms,
            message=harness.collection_error or "",
        )
    finally:
        shutil.rmtree(run_dir, ignore_errors=True)
        shutil.rmtree(tests_dir, ignore_errors=True)


def _stage(run_dir: Path, tests_dir: Path, submission: Path, bundle: dict[str, Any]) -> None:
    """Lay files out as dogma.runner.staging does: fixtures in both, tests in the bundle only."""
    shutil.copyfile(submission, tests_dir / submission.name)
    for name, text in bundle["tests"].items():
        (tests_dir / name).write_text(text, encoding="utf-8")
    for relative, encoded in bundle["fixtures"].items():
        data = base64.b64decode(encoded)
        for root in (run_dir, tests_dir):
            target = root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)


def _run_pytest(run_dir: Path, tests_dir: Path) -> HarnessResult:
    """dogma_harness.cli._run, plus the clean-up one long-lived interpreter needs between runs."""
    saved_path = list(sys.path)
    saved_cwd = os.getcwd()
    _forget_attempt_modules()
    try:
        os.chdir(run_dir)
        config = run_dir / "pytest.ini"
        config.write_text("[pytest]\n", encoding="utf-8")
        collector = Collector()
        exit_code = pytest.main(
            [
                *PYTEST_ARGS,
                "-c",
                str(config),
                f"--rootdir={tests_dir}",
                str(tests_dir / PUBLIC_TESTS),
            ],
            plugins=[collector],
        )
        return collector.result(int(exit_code))
    except BaseException as exc:  # the harness owes the page a report, whatever broke
        return HarnessResult.errored(f"harness failure: {type(exc).__name__}: {exc}")
    finally:
        os.chdir(saved_cwd)
        sys.path[:] = saved_path
        _forget_attempt_modules()


def _forget_attempt_modules() -> None:
    """Drop the previous attempt's modules, so the next run imports the new files."""
    runs = str(RUNS)
    for name, module in list(sys.modules.items()):
        origin = getattr(module, "__file__", None) or ""
        if name in ("submission", "test_public", "conftest") or origin.startswith(runs):
            del sys.modules[name]
