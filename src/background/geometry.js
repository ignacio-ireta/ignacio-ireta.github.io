// A closed, gently irregular outline for a watercolor wash. Each vertex is a
// quadratic control point between edge midpoints, so the shape has no corners.
export function traceSmoothBlob(targetCtx, x, y, rx, ry, points, phase) {
  const vertices = [];
  for (let i = 0; i < points; i += 1) {
    const angle = (Math.PI * 2 * i) / points;
    const swell =
      0.82 + Math.sin(angle * 3.1 + phase) * 0.12 + Math.cos(angle * 5.2 - phase) * 0.08;
    vertices.push({ x: x + Math.cos(angle) * rx * swell, y: y + Math.sin(angle) * ry * swell });
  }
  const mid = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  const start = mid(vertices[points - 1], vertices[0]);
  targetCtx.beginPath();
  targetCtx.moveTo(start.x, start.y);
  for (let i = 0; i < points; i += 1) {
    const next = mid(vertices[i], vertices[(i + 1) % points]);
    targetCtx.quadraticCurveTo(vertices[i].x, vertices[i].y, next.x, next.y);
  }
  targetCtx.closePath();
}

// Points of a close-packed (hexagonal) lattice within `radius` of the origin:
// rows `spacing * sqrt(3) / 2` apart, alternate rows offset by half a spacing.
export function hexLatticePoints(radius, spacing) {
  const points = [];
  const rowHeight = (spacing * Math.sqrt(3)) / 2;
  const rows = Math.floor(radius / rowHeight);
  for (let row = -rows; row <= rows; row += 1) {
    const y = row * rowHeight;
    const offset = row % 2 === 0 ? 0 : spacing / 2;
    const columns = Math.floor((radius + spacing) / spacing);
    for (let column = -columns; column <= columns; column += 1) {
      const x = column * spacing + offset;
      if (x * x + y * y <= radius * radius) points.push({ x, y });
    }
  }
  return points;
}

export function drawRibbon(targetCtx, y, width, phase, shift = 0) {
  targetCtx.beginPath();
  for (let x = -60; x < width + 80; x += 36) {
    const waveY = y + Math.sin(x * 0.006 + phase) * 18 + shift;
    if (x === -60) targetCtx.moveTo(x, waveY);
    else targetCtx.lineTo(x, waveY);
  }
  targetCtx.stroke();
}

export function drawDepthGuides(targetCtx, state, now, { isDark, reducedMotion }) {
  targetCtx.save();
  targetCtx.globalCompositeOperation = "multiply";
  targetCtx.strokeStyle = isDark ? "rgba(230, 220, 195, 0.08)" : "rgba(54, 48, 37, 0.08)";
  targetCtx.lineWidth = 1;
  const shift = reducedMotion ? 0 : Math.sin(now * 0.0001) * 6;

  for (let i = 0; i < 5; i += 1) {
    drawRibbon(targetCtx, state.height * (0.16 + i * 0.2), state.width, i * 1.7, shift);
  }
  targetCtx.restore();
}
