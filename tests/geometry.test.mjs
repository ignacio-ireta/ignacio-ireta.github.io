import test from "node:test";
import assert from "node:assert/strict";
import { hexLatticePoints } from "../src/background/geometry.js";

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
