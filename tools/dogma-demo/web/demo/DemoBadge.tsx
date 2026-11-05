// A small floating note that says what this page is: dogma's real interface on a snapshot, with
// Run and Submit graded in the browser. Floating, so it never changes the app's own layout.
import { useEffect, useState, useSyncExternalStore } from "react";
import { type Manifest, readManifest } from "./data";
import { type RunnerStatus, runner } from "./runner";

const OPEN_KEY = "dogma-demo.badge.open";
const PORTFOLIO_URL = "/#projects";

const RUNTIME_WORDS: Record<RunnerStatus, string> = {
  idle: "loads on your first Run",
  loading: "loading…",
  ready: "ready",
  running: "grading…",
  failed: "could not load (Run will say why)"
};

/** Open on the first visit; afterwards as the visitor last left it (it covers some content). */
function initiallyOpen(): boolean {
  try {
    return window.localStorage.getItem(OPEN_KEY) !== "0";
  } catch {
    return false;
  }
}

function formatDay(isoDate: string): string {
  return new Date(`${isoDate}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });
}

export function DemoBadge() {
  const [open, setOpen] = useState(initiallyOpen);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const status = useSyncExternalStore(runner.subscribe, runner.getStatus);

  useEffect(() => {
    readManifest().then(setManifest, () => setManifest(null));
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      window.localStorage.setItem(OPEN_KEY, next ? "1" : "0");
    } catch {
      // Storage is optional: the badge just starts closed next time.
    }
  };

  return (
    <aside className={`demo-badge${open ? " demo-badge--open" : ""}`} aria-label="About this demo">
      <button
        type="button"
        className="demo-badge__toggle"
        aria-expanded={open}
        aria-controls="demo-badge-body"
        onClick={toggle}
      >
        <span className="demo-badge__dot" aria-hidden="true" />
        Interactive demo
        <span className="demo-badge__chevron" aria-hidden="true">
          {open ? "▾" : "▴"}
        </span>
      </button>
      {open ? (
        <div id="demo-badge-body" className="demo-badge__body">
          <p className="demo-badge__title">This is dogma's real interface, running statically.</p>
          <p>
            The pages read a snapshot of the local API
            {manifest ? <> taken on {formatDay(manifest.local_date)}</> : null}, for a demo learner
            who replayed the first eight study days through the real grader.
          </p>
          <ul>
            <li>
              <strong>Run</strong> and <strong>Submit</strong> grade your code here, in Python
              compiled to WebAssembly, against each problem's public tests.
            </li>
            <li>Hints, the map, progress and due cards are as the API served them.</li>
            <li>Hidden tests, your history and the local tutor model stay in the local app.</li>
          </ul>
          <p className="demo-badge__runtime">
            Python in this tab: <span>{RUNTIME_WORDS[status]}</span>
          </p>
          <a className="demo-badge__back" href={PORTFOLIO_URL}>
            ← Back to the portfolio
          </a>
        </div>
      ) : null}
    </aside>
  );
}
