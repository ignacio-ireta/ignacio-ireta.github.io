export function traceOrganicMass(targetCtx, x, y, rx, ry, points, phase) {
  targetCtx.beginPath();
  for (let i = 0; i <= points; i += 1) {
    const angle = (Math.PI * 2 * i) / points;
    const swell = 0.82 + Math.sin(angle * 3.1 + phase) * 0.12 + Math.cos(angle * 5.2 - phase) * 0.08;
    const px = x + Math.cos(angle) * rx * swell;
    const py = y + Math.sin(angle) * ry * swell;
    if (i === 0) targetCtx.moveTo(px, py);
    else targetCtx.lineTo(px, py);
  }
  targetCtx.closePath();
}

export function drawOrganicMass(targetCtx, x, y, rx, ry, points, phase, strokeOnly = false) {
  traceOrganicMass(targetCtx, x, y, rx, ry, points, phase);
  if (strokeOnly) targetCtx.stroke();
  else targetCtx.fill();
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

export function drawSquiggle(targetCtx, y, width) {
  targetCtx.beginPath();
  for (let x = -40; x < width + 60; x += 28) {
    const offset = Math.sin(x * 0.011 + y * 0.019) * 9 + Math.sin(x * 0.026) * 2;
    if (x === -40) targetCtx.moveTo(x, y + offset);
    else targetCtx.lineTo(x, y + offset);
  }
  targetCtx.stroke();
}

export function traceSquigglePath(targetCtx, x, y, length, amplitude, phase, steps = 16) {
  targetCtx.beginPath();
  for (let i = 0; i <= steps; i += 1) {
    const progress = i / steps;
    const px = x + progress * length;
    const py =
      y +
      Math.sin(progress * Math.PI * 2.2 + phase) * amplitude +
      Math.sin(progress * Math.PI * 5.4 - phase) * amplitude * 0.28;
    if (i === 0) targetCtx.moveTo(px, py);
    else targetCtx.lineTo(px, py);
  }
}

export function drawMembraneArc(targetCtx, x, y, radius, startAngle, endAngle) {
  targetCtx.beginPath();
  targetCtx.arc(x, y, radius, startAngle, endAngle);
  targetCtx.stroke();
}

export function drawMembraneBand(targetCtx, x, y, radius, startAngle, endAngle, gap = 9) {
  targetCtx.beginPath();
  targetCtx.arc(x, y, radius - gap * 0.5, startAngle, endAngle);
  targetCtx.stroke();
  targetCtx.beginPath();
  targetCtx.arc(x, y, radius + gap * 0.5, startAngle, endAngle);
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
