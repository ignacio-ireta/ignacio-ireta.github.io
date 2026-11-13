import test from "node:test";
import assert from "node:assert/strict";
import { drawDepthGuides, hexLatticePoints, traceSmoothBlob } from "../src/background/geometry.js";

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

test("traceSmoothBlob builds one closed path with a curve per vertex", () => {
  const ctx = recordingCtx();
  traceSmoothBlob(ctx, 0, 0, 10, 10, 6, 0);
  assert.equal(ctx.calls.beginPath, 1);
  assert.equal(ctx.calls.moveTo, 1);
  assert.equal(ctx.calls.quadraticCurveTo, 6);
  assert.equal(ctx.calls.closePath, 1);
});

test("hexLatticePoints is close-packed: six neighbours one spacing away", () => {
  const spacing = 10;
  const points = hexLatticePoints(35, spacing);
  assert.ok(points.every((point) => Math.hypot(point.x, point.y) <= 35));
  assert.ok(points.some((point) => point.x === 0 && point.y === 0));

  const distances = points
    .filter((point) => point.x !== 0 || point.y !== 0)
    .map((point) => Math.hypot(point.x, point.y));
  const nearest = Math.min(...distances);
  assert.ok(Math.abs(nearest - spacing) < 1e-9);
  assert.equal(distances.filter((distance) => Math.abs(distance - spacing) < 1e-9).length, 6);
});

test("drawDepthGuides is save/restore balanced and does not throw", () => {
  const ctx = recordingCtx();
  const state = { width: 800, height: 600 };
  assert.doesNotThrow(() => drawDepthGuides(ctx, state, 0, { isDark: false, reducedMotion: true }));
  assert.equal(ctx.calls.save, 1);
  assert.equal(ctx.calls.restore, 1);
});
