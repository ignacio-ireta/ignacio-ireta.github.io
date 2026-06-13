# ETF outputs & sync contract

This documents the ETF Portfolio Research artifacts served under
`projects/etf-portfolio-research/reports/`, the schema the showcase page reads,
and the cross-repo CI pipeline that keeps them current. It is the ETF analogue of
[`cdmx-data-contract.md`](cdmx-data-contract.md).

## Where the artifacts come from

The artifacts are **generated in the source repo**
[`ignacio-ireta/etf-portfolio-research`](https://github.com/ignacio-ireta/etf-portfolio-research)
by its Python pipeline (`uv run etf-portfolio run-all`). They are committed there
under `reports/`, and a **curated subset** is synced into this repo so GitHub Pages
can serve them same-origin and the page can embed them. Nothing on this page is
regenerated here — this repo only hosts a copy of the outputs.

## Committed artifact set

Synced into `projects/etf-portfolio-research/reports/`:

| Path                                | What it is                                                           |
| ----------------------------------- | -------------------------------------------------------------------- |
| `html/latest_report.html` (~7.2 MB) | Self-contained interactive Plotly walk-forward backtest dashboard    |
| `html/frontier.html` (~4.85 MB)     | Self-contained interactive efficient-frontier explorer               |
| `figures/*.png` (12)                | Publication-ready charts (2800×1680), also shown inline as a gallery |
| `excel/optimized_portfolios.xlsx`   | Optimizer target weights and portfolio composition                   |
| `excel/portfolio_results.xlsx`      | Per-period backtest holdings and performance                         |
| `metrics/backtest_metrics.json`     | Headline metrics for the strategy + benchmarks (drives the table)    |
| `metrics/validation_summary.json`   | Data-quality validation summary                                      |
| `runs/*.json`                       | Timestamped run records (provenance for each report)                 |

**Deliberately dropped:** `html/backtest_report.html` — it is byte-identical to
`latest_report.html` (same SHA), so shipping it would waste ~7 MB of the Pages
budget. The sync script omits it.

The interactive HTML reports are self-contained (inline Plotly, no `<base>`, no
external fetches), so they render fully client-side and do not inherit the site's
CSS — the page frames each one in a bordered panel "viewport".

## `backtest_metrics.json` schema

The metrics table on the page (`embed.js`) reads this file:

```jsonc
{
  "optimized_strategy": { "<MetricName>": number, ... },
  "benchmarks": {
    "Selected Benchmark ETF": { "<MetricName>": number, ... },
    "60/40 Portfolio": { ... },
    "Equal-Weight ETF Universe": { ... },
    "Risk-Parity Portfolio": { ... },
    "Minimum-Variance Portfolio": { ... },
    "Inverse-Volatility Portfolio": { ... },
    // ...others
  },
  "provenance_status": "tracked",
  "run_id": "run-all-<UTC timestamp>-<short hash>",
  "run_record": "reports/runs/backtest_<run_id>.json"
}
```

Metric names include `CAGR`, `Sharpe Ratio`, `Sortino Ratio`, `Max Drawdown`,
`Annualized Volatility`, `Alpha`, `Beta`, `Calmar Ratio`, `Information Ratio`,
`Tracking Error`, `Turnover`, `Herfindahl Concentration Index`, `Largest Position`,
`Average Number of Holdings`, `Best/Worst Month`, `Worst Quarter`. The page renders
a curated subset; rate-like metrics (CAGR, Max Drawdown, Volatility, Alpha) are
formatted as percentages and ratio-like metrics (Sharpe, Sortino, Beta, Calmar) as
plain numbers. The table reads the file at runtime, so a freshly synced JSON
updates the page with no HTML edit. `run_id` is surfaced in the provenance line.

## Cross-repo sync contract

The automation lives in the **source repo**, not here:

- `.github/workflows/deploy.yml` — on push to `main` (filtered to `paths: reports/**`)
  or `workflow_dispatch`: checks out this showcase repo via the `WEBSITE_REPO_DEPLOY_KEY`
  deploy key, runs the sync script, and commits/pushes to `master` only if the
  result differs. It does **not** run the Python pipeline (`reports/` is committed).
- `scripts/sync_website_embed.sh` — takes the **page directory** as its argument and
  derives `…/reports` internally, then wipes and repopulates **only that subtree**
  with the curated allow-list. It never touches the hand-authored `index.html` /
  `embed.js`. (Contrast: the CDMX sync `rm -rf`s its whole embed dir, safe because
  that dir is 100% Vite-generated.)

End-to-end: regenerate reports locally → commit to source `main` → push → the deploy
workflow syncs the curated subset into `projects/etf-portfolio-research/reports/`
on `master` → Pages redeploys. A no-op (byte-identical) sync logs "No report
changes" and pushes nothing.

**Setup:** the source repo needs a `WEBSITE_REPO_DEPLOY_KEY` secret whose public
half is a write-enabled deploy key on this repo (reusing the CDMX deploy key works).

## GitHub Pages constraints

All artifacts are plain tracked files (no Git LFS — Pages serves LFS pointers, not
content). The largest file (`latest_report.html`, ~7.2 MB) is far under the 100 MiB
per-file limit, and the full curated set (~15 MB) is comfortably within the ~1 GB
site budget. The 7.2 MB report is only fetched when a visitor clicks to load it
(the iframe ships with no `src`), so it costs nothing on first paint and is gentle
on the bandwidth budget.

## Data licensing & disclaimer

The reports are computed from research-grade market data (yfinance by default).
They are provided for **research and illustration only — not financial advice**,
and make no guarantee of accuracy or future performance. See the source repo's
`docs/` (methodology, assumptions and limitations, trust & safety) for the full
modeling caveats.
