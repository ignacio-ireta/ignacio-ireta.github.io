import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

// The cache-bust query string main.js uses to import its siblings. Importing
// scene.js with the SAME specifier returns the same module instance main.js
// booted, so we can inspect the state it produced.
const V = "?v=collision-chemistry-b240cafe";

test("background app boots without throwing under a stubbed canvas", async () => {
  const dom = new JSDOM(
    `<!doctype html><html><head></head><body><canvas id="molecule-canvas"></canvas></body></html>`,
    { pretendToBeVisual: true }
  );
  const { window } = dom;

  // jsdom implements neither the canvas 2D context nor matchMedia; stub both.
  const makeCtx = () =>
    new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === "canvas") return { width: 0, height: 0 };
          if (prop === "createLinearGradient" || prop === "createRadialGradient") {
            return () => ({ addColorStop() {} });
          }
          if (prop === "createPattern") return () => ({});
          if (prop === "measureText") return () => ({ width: 0 });
          if (prop === "getImageData") {
            return () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
          }
          if (typeof prop === "symbol") return undefined;
          return () => {};
        },
        set() {
          return true;
        }
      }
    );
  window.HTMLCanvasElement.prototype.getContext = () => makeCtx();
  window.matchMedia = () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {}
  });

  // Expose the globals main.js reads at module load.
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.getComputedStyle = window.getComputedStyle.bind(window);
  // Node provides a native `performance` global; don't shadow it with jsdom's
  // wrapper, which delegates back to the global and would recurse infinitely.
  globalThis.requestAnimationFrame = () => 1; // return an id; never run a frame
  globalThis.cancelAnimationFrame = () => {};

  await assert.doesNotReject(
    () => import(`../src/background/main.js`),
    "main.js should boot without throwing"
  );

  // resizeScene() should have sized the real canvas to the viewport.
  const canvas = window.document.getElementById("molecule-canvas");
  assert.ok(canvas.width > 0, "canvas was sized during boot");

  // The shared scene state should be populated.
  const { state } = await import(`../src/background/scene.js${V}`);
  assert.ok(state.width > 0 && state.height > 0, "scene sized to the viewport");
  assert.ok(Array.isArray(state.molecules) && state.molecules.length > 0, "molecules created");
});
