// Progressive enhancement for the ETF showcase page:
//   1. Click-to-load the heavy self-contained report iframes. Each iframe ships
//      with NO src (only data-src), so it stays about:blank and fetches nothing
//      until the user clicks — the multi-MB report is never paid on first paint.
//   2. Render the headline metrics table from the committed metrics JSON, so the
//      table stays in sync with whatever the deploy pipeline last synced.
// Vanilla ES module, no dependencies — matches the site's zero-runtime-deps ethos.

function wireEmbeds() {
  const embeds = document.querySelectorAll("[data-embed]");

  for (const embed of embeds) {
    const trigger = embed.querySelector("[data-embed-load]");
    const frame = embed.querySelector(".report-embed__iframe");
    if (!trigger || !frame) continue;

    trigger.addEventListener(
      "click",
      () => {
        const url = frame.getAttribute("data-src");
        if (!url) return;

        frame.addEventListener(
          "load",
          () => {
            embed.classList.add("is-loaded");
            trigger.remove();
            frame.focus();
          },
          { once: true }
        );

        const cta = trigger.querySelector(".report-embed__cta");
        if (cta) cta.textContent = "Loading report…";
        trigger.disabled = true;
        frame.hidden = false;
        frame.removeAttribute("hidden");
        frame.src = url; // the ONLY line that triggers the heavy fetch
      },
      { once: true }
    );
  }
}

// Columns shown in the metrics table, paired with how each value is formatted.
// "pct" multiplies by 100 and appends %; "ratio" is a plain 2-decimal number.
const METRIC_COLUMNS = [
  { key: "CAGR", format: "pct" },
  { key: "Sharpe Ratio", format: "ratio" },
  { key: "Sortino Ratio", format: "ratio" },
  { key: "Max Drawdown", format: "pct" },
  { key: "Annualized Volatility", format: "pct" },
  { key: "Alpha", format: "pct" },
  { key: "Beta", format: "ratio" },
  { key: "Calmar Ratio", format: "ratio" }
];

// Rows in display order. "strategy" reads from optimized_strategy; the rest read
// from benchmarks[source]. Missing rows are skipped gracefully.
const METRIC_ROWS = [
  { label: "Optimized strategy", source: "strategy" },
  { label: "Benchmark ETF (VT)", source: "Selected Benchmark ETF" },
  { label: "60 / 40 portfolio", source: "60/40 Portfolio" },
  { label: "Equal-weight universe", source: "Equal-Weight ETF Universe" },
  { label: "Risk parity", source: "Risk-Parity Portfolio" },
  { label: "Minimum variance", source: "Minimum-Variance Portfolio" },
  { label: "Inverse volatility", source: "Inverse-Volatility Portfolio" }
];

function formatMetric(value, format) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  if (format === "pct") return `${(value * 100).toFixed(2)}%`;
  return value.toFixed(2);
}

function buildRow(doc, { label, source }, data, isStrategy) {
  const metrics = source === "strategy" ? data.optimized_strategy : data.benchmarks?.[source];
  if (!metrics) return null;

  const row = doc.createElement("tr");
  if (isStrategy) row.className = "is-strategy";

  const head = doc.createElement("th");
  head.scope = "row";
  head.textContent = label;
  row.append(head);

  for (const { key, format } of METRIC_COLUMNS) {
    const cell = doc.createElement("td");
    cell.textContent = formatMetric(metrics[key], format);
    row.append(cell);
  }
  return row;
}

async function renderMetrics() {
  const body = document.getElementById("metrics-body");
  const status = document.getElementById("metrics-status");
  if (!body) return;

  try {
    const response = await fetch("reports/metrics/backtest_metrics.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    const rows = METRIC_ROWS.map((spec) =>
      buildRow(document, spec, data, spec.source === "strategy")
    ).filter(Boolean);

    if (rows.length === 0) throw new Error("no metric rows");

    body.replaceChildren(...rows);
    if (status) status.textContent = "";

    const runId = document.getElementById("run-id");
    if (runId && typeof data.run_id === "string") runId.textContent = data.run_id;
  } catch (error) {
    if (status) {
      status.textContent =
        "Couldn't load the live metrics — open the full report for the complete numbers.";
    }
    // Leave the table's static fallback row in place rather than blanking it.
    if (typeof console !== "undefined") console.error("metrics render failed:", error);
  }
}

wireEmbeds();
renderMetrics();
