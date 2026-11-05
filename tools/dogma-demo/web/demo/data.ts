// Reads of the captured snapshot under <base>/data/ (written by tools/dogma-demo/capture.py and
// build.mjs). Reads use the browser's own fetch, captured here before api.ts replaces it.

export const DATA_URL = `${import.meta.env.BASE_URL}data/`;

const nativeFetch: typeof fetch = window.fetch.bind(window);
const cache = new Map<string, Promise<unknown>>();

export interface Manifest {
  readonly schema: 1;
  readonly captured_at: string;
  readonly local_date: string;
  readonly time_zone: string;
  readonly dogma_revision: string;
  readonly pyodide_version: string;
  readonly runtimes: Readonly<Record<string, string>>;
  readonly browser_runnable: readonly string[];
}

/** Encode each segment of a snapshot path (ids keep their slashes). */
function dataUrl(path: string): string {
  return DATA_URL + path.split("/").map(encodeURIComponent).join("/");
}

/** A snapshot file, or null when the snapshot has no such file. Each path is fetched once. */
export function readJson<T>(path: string): Promise<T | null> {
  let pending = cache.get(path);
  if (pending === undefined) {
    pending = nativeFetch(dataUrl(path)).then(async (response) => {
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`the demo snapshot answered ${response.status} for ${path}`);
      }
      return (await response.json()) as unknown;
    });
    // A failed read (offline, say) is not remembered, so the next request tries again.
    pending.catch(() => cache.delete(path));
    cache.set(path, pending);
  }
  return pending as Promise<T | null>;
}

export async function readManifest(): Promise<Manifest> {
  const manifest = await readJson<Manifest>("manifest.json");
  if (manifest === null) {
    throw new Error("the demo snapshot has no manifest.json");
  }
  return manifest;
}
