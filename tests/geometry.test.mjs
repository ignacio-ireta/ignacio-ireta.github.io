import test from "node:test";
import assert from "node:assert/strict";
import {
  traceOrganicMass,
  traceSquigglePath,
  drawMembraneBand,
  drawDepthGuides
} from "../src/background/geometry.js";

// A canvas 2D context stub that counts how often each method is called, so we
// can assert on the path commands a geometry helper issues without a real canvas.
function recordingCtx() {
  const calls = {};
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "calls") return calls;
        if (typeof prop === "symbol") return undefined;
        return () => {
          calls[prop] = (calls[prop] || 0) + 1;
        };
      },
      set() {
        return true;
      }
    }
  );
}

test("traceOrganicMass builds one closed path with a point per segment", () => {
  const ctx = recordingCtx();
  traceOrganicMass(ctx, 0, 0, 10, 10, 6, 0);
  assert.equal(ctx.calls.beginPath, 1);
  assert.equal(ctx.calls.moveTo, 1);
  assert.equal(ctx.calls.lineTo, 6);
  assert.equal(ctx.calls.closePath, 1);
});

test("traceSquigglePath strokes an open path", () => {
  const ctx = recordingCtx();
  traceSquigglePath(ctx, 0, 0, 100, 10, 0, 4);
  assert.equal(ctx.calls.beginPath, 1);
  assert.equal(ctx.calls.moveTo, 1);
  assert.equal(ctx.calls.lineTo, 4);
  assert.equal(ctx.calls.closePath, undefined);
});

test("drawMembraneBand draws two concentric arcs", () => {
  const ctx = recordingCtx();
  drawMembraneBand(ctx, 0, 0, 20, 0, Math.PI);
  assert.equal(ctx.calls.beginPath, 2);
  assert.equal(ctx.calls.arc, 2);
  assert.equal(ctx.calls.stroke, 2);
});

test("drawDepthGuides is save/restore balanced and does not throw", () => {
  const ctx = recordingCtx();
  const state = { width: 800, height: 600 };
  assert.doesNotThrow(() => drawDepthGuides(ctx, state, 0, { isDark: false, reducedMotion: true }));
  assert.equal(ctx.calls.save, 1);
  assert.equal(ctx.calls.restore, 1);
});
