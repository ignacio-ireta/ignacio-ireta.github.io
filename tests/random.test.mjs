import test from "node:test";
import assert from "node:assert/strict";
import {
  clamp,
  lerp,
  smoothstep,
  seededRandom,
  interpolatePoint
} from "../src/background/random.js";

test("clamp keeps values within [min, max]", () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-3, 0, 10), 0);
  assert.equal(clamp(42, 0, 10), 10);
});

test("lerp interpolates linearly", () => {
  assert.equal(lerp(0, 10, 0), 0);
  assert.equal(lerp(0, 10, 1), 10);
  assert.equal(lerp(0, 10, 0.5), 5);
  assert.equal(lerp(4, 8, 0.25), 5);
});

test("smoothstep clamps its input and eases the ends", () => {
  assert.equal(smoothstep(-1), 0);
  assert.equal(smoothstep(0), 0);
  assert.equal(smoothstep(1), 1);
  assert.equal(smoothstep(2), 1);
  assert.equal(smoothstep(0.5), 0.5);
  // Eased: slower than linear near the ends.
  assert.ok(smoothstep(0.25) < 0.25);
  assert.ok(smoothstep(0.75) > 0.75);
});

test("seededRandom is deterministic for a given seed", () => {
  const a = seededRandom(12345);
  const b = seededRandom(12345);
  const seqA = Array.from({ length: 8 }, () => a());
  const seqB = Array.from({ length: 8 }, () => b());
  assert.deepEqual(seqA, seqB);
});

test("seededRandom yields values in [0, 1)", () => {
  const next = seededRandom(987654321);
  for (let i = 0; i < 1000; i += 1) {
    const v = next();
    assert.ok(v >= 0 && v < 1, `value ${v} out of range`);
  }
});

test("seededRandom diverges for different seeds", () => {
  assert.notEqual(seededRandom(1)(), seededRandom(2)());
});

test("interpolatePoint eases between two endpoints", () => {
  const from = { x: 0, y: 0 };
  const to = { x: 10, y: 20 };
  assert.deepEqual(interpolatePoint(from, to, 0), { x: 0, y: 0 });
  assert.deepEqual(interpolatePoint(from, to, 1), { x: 10, y: 20 });
  const mid = interpolatePoint(from, to, 0.5);
  assert.equal(mid.x, 5);
  assert.equal(mid.y, 10);
});
