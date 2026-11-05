"""Browser stand-in for ``dogma.grading.models`` (dogma demo only).

The same names, fields and defaults as dogma's frozen Pydantic models, as frozen dataclasses, so
``dogma.grading.static`` and ``dogma.grading.display`` run verbatim in Pyodide without loading
Pydantic. Keep in step with ``src/dogma/grading/models.py`` in dogma.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from typing import Literal

FileKind = Literal["public", "hidden"]
Outcome = Literal["pass", "fail", "error", "skip"]


class RunStatus(StrEnum):
    """Overall verdict for one attempt. ``rejected``: static checks stopped it before running."""

    PASSED = "passed"
    FAILED = "failed"
    ERROR = "error"
    TIMEOUT = "timeout"
    OOM = "oom"
    REJECTED = "rejected"


@dataclass(frozen=True)
class TestResult:
    """Outcome of one test function. ``message`` names the kind of mistake when it failed."""

    __test__ = False  # not a pytest test class

    name: str
    file: FileKind
    outcome: Outcome
    message: str = ""
    duration_ms: int = 0


@dataclass(frozen=True)
class StaticFinding:
    """One problem found by a static check before execution."""

    rule: str
    message: str
    line: int | None = None


@dataclass(frozen=True)
class GradeReport:
    """Everything the learner needs about one attempt."""

    attempt_id: str
    problem_id: str
    problem_version: int
    runtime: str
    status: RunStatus
    tests: tuple[TestResult, ...] = ()
    static: tuple[StaticFinding, ...] = ()
    stdout: str = ""
    duration_ms: int = 0
    message: str = ""

    @property
    def passed(self) -> bool:
        return self.status is RunStatus.PASSED

    def counts(self, file: FileKind) -> tuple[int, int]:
        mine = [t for t in self.tests if t.file == file]
        return sum(t.outcome == "pass" for t in mine), len(mine)
