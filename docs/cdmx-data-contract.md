# CDMX Convenience Map — data & build contract

The CDMX map ([`projects/cdmx-map/`](../projects/cdmx-map/)) is built in a separate repo, [ignacio-ireta/cdmx-convenience-map](https://github.com/ignacio-ireta/cdmx-convenience-map). This repo commits only the **build output** and the **scored data** it fetches. This document is the contract for both — what the data means, how it's versioned, and how to trace a deployed map back to its source.

## Datasets

The app fetches these at runtime via same-origin `fetch('./data/...')`:

| File                                                                                    | Area unit              | Features | Geometry                 |
| --------------------------------------------------------------------------------------- | ---------------------- | -------- | ------------------------ |
| `scores_colonia.geojson`                                                                | colonia (neighborhood) | 1,837    | Polygon                  |
| `scores_postal_code.geojson`                                                            | postal code            | 1,215    | Polygon                  |
| `score_metadata.json`, `score_metadata_colonia.json`, `score_metadata_postal_code.json` | —                      | —        | run metadata (see below) |

> ⚠️ **Do not move these to Git LFS.** GitHub Pages serves the LFS _pointer file_, not the content, which would break `fetch()`. Keep them committed normally (well under the 100 MiB per-file / ~1 GB site limits). If the data ever outgrows that, host it externally rather than using LFS.

Each is a standard GeoJSON `FeatureCollection` with a `crs` member; every feature is a `Polygon` whose `properties` follow the schema below.

## Feature property schema

Each feature carries ~100 properties. Closer-is-better scores are 0–100, clipped at the 95th percentile per metric. Grouped:

- **Identity:** `area_unit`, `area_id`, `area_name`, `display_name`, `alcaldia`, plus unit-specific keys (`colonia_name`/`col_code`/`mun_code`… for colonias; `postal_code`/`d_cp`… for postal codes), `centroid_lat`, `centroid_lon` (representative point), `year`, `source`.
- **Distances (meters):** `dist_work_m`, `dist_transit_m`, `dist_{core,surface,metro,metrobus,rtp,trolebus,corredor}_transit_m`, `dist_supermarket_m`, `dist_costco_m`, `dist_walmart_m`, `dist_gym_m`.
- **Travel times (minutes):** `time_{supermarket,costco,walmart,gym}_min`, `time_work_{driving,walking,biking}_min`, `time_work_transit_min`, `time_work_transit_p75_min`.
- **Scores (0–100):** `score_work` (+ per-mode), `score_transit` (+ per-system: metro/metrobus/rtp/trolebus/corredor), `score_supermarkets`, `score_gyms`, `score_safety`, `score_work_transit`, and `score_combined_default` (the weighted blend).
- **Nearest POIs:** `nearest_*_name` and `nearest_*_source` (e.g. `apimetro`, `openstreetmap`, `places_config`) for work, each transit system, supermarket, costco, walmart, gym.
- **Transit commute:** `transit_commute_source`, `transit_origin_*` / `transit_destination_*` (stop name, system, line, walk meters), `transit_transfer_penalty_min`, `transit_route_complexity`, `transfers_work_transit`, `transit_route_summary`, `transit_commute_notes`.
- **Safety:** `crime_incidents_total`, `crime_incidents_recent_12m`, `crime_density_recent_12m_per_km2`, `crime_top_category_recent_12m`, `crime_source`.

## Run metadata (`score_metadata*.json`)

The metadata files are a self-describing, versioned provenance record — the contract's traceability anchor. Key fields:

- `generated_at` (ISO timestamp), `area_unit`, `feature_count`.
- `weights` — the default scoring blend: `work 0.30`, `transit 0.25`, `supermarkets 0.18`, `safety 0.15`, `gyms 0.12`.
- `point_counts`, `crime` (record totals + recency window), `workplace`.
- `travel_time` / `amenity_travel_time` — modes, speeds, detour factors, and `source` (fallback straight-line vs. routed).
- `transit_commute.router` — schedule-aware routing provenance: `engine` (r5py), `gtfs_sha1`, `osm_sha1`, `service_date`, `coverage_percent`, plus `known_limitations`.
- `source_urls` / `sources` — upstream URLs and input file paths.
- `notes` — scoring caveats (e.g. transit score weighting, lower-is-better safety from FGJ crime).

**Determinism:** the same inputs + the same generator version produce the same output, except `generated_at`.

## Build-artifact contract

- `projects/cdmx-map/assets/index-<hash>.js` and `index-<hash>.css` are **minified Vite output** — generated, not hand-edited. `projects/cdmx-map/index.html` references them by hash.
- They are excluded from Prettier/ESLint/`html-validate` (see `.prettierignore`, `eslint.config.js`, `package.json`).
- **Provenance to record on each build:** the source commit in `cdmx-convenience-map` that produced the committed bundle. _Current build: `index-CYCcWLQQ.js` ← `cdmx-convenience-map@<commit>` (TODO: fill in the exact commit on the next rebuild)._
- **Avoiding history bloat:** delete stale `index-*.js`/`index-*.css` before committing a new build so superseded hashed bundles don't accumulate in git history (a major past cause of `.git` growth). See [CONTRIBUTING.md](../CONTRIBUTING.md).

## Data licensing & attribution

Derived from third-party open data; downstream use must honor the upstream terms:

- **OpenStreetMap** (amenities, OSM extract via BBBike) — © OpenStreetMap contributors, ODbL.
- **CDMX GTFS** transit schedules and **Apimetro** stop data.
- **FGJ CDMX** victim/crime records (`datos.cdmx.gob.mx`).
- **Colonia boundaries** via OpenDataSoft `georef-mexico-colonia`.

See `source_urls` in the metadata for exact dataset links.
