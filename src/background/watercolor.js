import { drawOrganicMass, drawSquiggle } from "./geometry.js";
import { lerp, seededRandom } from "./random.js?v=palette-f0rPXTJ-58a1b5";

export function drawWatercolorShape(
  targetCtx,
  traceShape,
  {
    fill,
    stroke,
    contour = "rgba(255, 255, 255, 0.18)",
    alpha = 0.2,
    glazeAlpha = 0.12,
    glazes = [],
    edgeAlpha = 0.34,
    lineWidth = 1,
    contours = [],
    granulation = 0,
    granuleColor = "rgba(43, 35, 24, 0.12)",
    bounds = null,
    seed = 1
  }
) {
  targetCtx.save();
  targetCtx.globalCompositeOperation = "multiply";
  targetCtx.globalAlpha = alpha;
  targetCtx.fillStyle = fill;
  traceShape(targetCtx);
  targetCtx.fill();

  targetCtx.globalAlpha = glazeAlpha;
  traceShape(targetCtx);
  targetCtx.fill();

  for (const glaze of glazes) {
    targetCtx.globalAlpha = glaze.alpha;
    targetCtx.fillStyle = glaze.fill || fill;
    targetCtx.save();
    targetCtx.translate(glaze.x || 0, glaze.y || 0);
    traceShape(targetCtx);
    targetCtx.fill();
    targetCtx.restore();
  }

  targetCtx.globalCompositeOperation = "source-over";
  targetCtx.globalAlpha = edgeAlpha;
  targetCtx.strokeStyle = stroke;
  targetCtx.lineWidth = lineWidth;
  traceShape(targetCtx);
  targetCtx.stroke();

  if (contours.length > 0) {
    targetCtx.globalAlpha = Math.min(0.32, edgeAlpha * 0.72);
    targetCtx.strokeStyle = contour;
    targetCtx.lineWidth = Math.max(0.55, lineWidth * 0.72);
    for (const traceContour of contours) {
      traceContour(targetCtx);
      targetCtx.stroke();
    }
  }

  if (bounds && granulation > 0) {
    const random = seededRandom(seed);
    targetCtx.globalCompositeOperation = "multiply";
    targetCtx.fillStyle = granuleColor;
    for (let i = 0; i < granulation; i += 1) {
      const x = lerp(bounds.x - bounds.rx, bounds.x + bounds.rx, random());
      const y = lerp(bounds.y - bounds.ry, bounds.y + bounds.ry, random());
      const nx = (x - bounds.x) / bounds.rx;
      const ny = (y - bounds.y) / bounds.ry;
      if (nx * nx + ny * ny > 1) continue;
      targetCtx.globalAlpha = lerp(0.035, 0.12, random());
      targetCtx.beginPath();
      targetCtx.arc(x, y, lerp(0.45, 1.45, random()), 0, Math.PI * 2);
      targetCtx.fill();
    }
  }

  targetCtx.restore();
}

function createPaperPattern(isDark) {
  const patternCanvas = document.createElement("canvas");
  const size = 96;
  patternCanvas.width = size;
  patternCanvas.height = size;
  const patternCtx = patternCanvas.getContext("2d");
  const random = seededRandom(isDark ? 78631 : 78617);

  patternCtx.clearRect(0, 0, size, size);
  patternCtx.save();
  patternCtx.globalCompositeOperation = isDark ? "screen" : "multiply";

  for (let i = 0; i < 760; i += 1) {
    const alpha = isDark ? lerp(0.015, 0.055, random()) : lerp(0.012, 0.05, random());
    patternCtx.fillStyle = isDark ? `rgba(236, 228, 206, ${alpha})` : `rgba(58, 48, 34, ${alpha})`;
    patternCtx.fillRect(random() * size, random() * size, random() > 0.82 ? 2 : 1, 1);
  }

  for (let i = 0; i < 80; i += 1) {
    const x = random() * size;
    const y = random() * size;
    patternCtx.globalAlpha = isDark ? lerp(0.025, 0.07, random()) : lerp(0.018, 0.052, random());
    patternCtx.strokeStyle = isDark ? "rgba(244, 238, 220, 0.8)" : "rgba(71, 58, 39, 0.76)";
    patternCtx.lineWidth = lerp(0.35, 0.85, random());
    patternCtx.beginPath();
    patternCtx.moveTo(x, y);
    patternCtx.lineTo(x + lerp(8, 28, random()), y + lerp(-2, 2, random()));
    patternCtx.stroke();
  }

  patternCtx.restore();
  return patternCanvas;
}

export function drawPaperLayer(layerCtx, state, { isDark }) {
  const random = seededRandom(44021);
  layerCtx.clearRect(0, 0, state.width, state.height);

  const pattern = layerCtx.createPattern(createPaperPattern(isDark), "repeat");
  layerCtx.save();
  layerCtx.globalCompositeOperation = isDark ? "screen" : "multiply";
  layerCtx.globalAlpha = isDark ? 0.18 : 0.28;
  layerCtx.fillStyle = pattern;
  layerCtx.fillRect(0, 0, state.width, state.height);
  layerCtx.restore();

  layerCtx.save();
  layerCtx.globalCompositeOperation = "multiply";
  for (let i = 0; i < 520; i += 1) {
    const x = random() * state.width;
    const y = random() * state.height;
    const length = lerp(8, 42, random());
    const alpha = isDark ? lerp(0.035, 0.08, random()) : lerp(0.018, 0.055, random());
    layerCtx.strokeStyle = `rgba(83, 74, 56, ${alpha})`;
    layerCtx.lineWidth = lerp(0.4, 1.1, random());
    layerCtx.beginPath();
    layerCtx.moveTo(x, y);
    layerCtx.quadraticCurveTo(
      x + length * 0.45,
      y + lerp(-4, 4, random()),
      x + length,
      y + lerp(-6, 6, random())
    );
    layerCtx.stroke();
  }

  for (let i = 0; i < 1800; i += 1) {
    const alpha = isDark ? lerp(0.035, 0.09, random()) : lerp(0.02, 0.075, random());
    layerCtx.fillStyle = `rgba(49, 42, 31, ${alpha})`;
    layerCtx.fillRect(random() * state.width, random() * state.height, 1, 1);
  }
  layerCtx.restore();
}

export function drawFieldLayer(layerCtx, state, { isDark }) {
  layerCtx.clearRect(0, 0, state.width, state.height);

  layerCtx.save();
  layerCtx.globalCompositeOperation = "multiply";

  const haze = isDark ? 0.14 : 0.18;
  const darkHaze = isDark ? 0.18 : 0.1;

  const leftWash = layerCtx.createRadialGradient(
    state.width * 0.08,
    state.height * 0.22,
    20,
    state.width * 0.16,
    state.height * 0.24,
    state.width * 0.42
  );
  leftWash.addColorStop(0, `rgba(126, 107, 167, ${haze * 0.7})`);
  leftWash.addColorStop(0.48, `rgba(79, 120, 189, ${haze * 0.54})`);
  leftWash.addColorStop(1, "rgba(126, 107, 167, 0)");
  layerCtx.fillStyle = leftWash;
  layerCtx.fillRect(0, 0, state.width, state.height);

  const bottomWash = layerCtx.createRadialGradient(
    state.width * 0.78,
    state.height * 0.92,
    30,
    state.width * 0.72,
    state.height * 0.82,
    state.width * 0.5
  );
  bottomWash.addColorStop(0, `rgba(63, 150, 140, ${haze * 0.85})`);
  bottomWash.addColorStop(0.5, `rgba(185, 134, 54, ${haze * 0.55})`);
  bottomWash.addColorStop(1, "rgba(63, 150, 140, 0)");
  layerCtx.fillStyle = bottomWash;
  layerCtx.fillRect(0, 0, state.width, state.height);

  layerCtx.globalAlpha = darkHaze;
  layerCtx.fillStyle = isDark ? "#070a07" : "#5a5345";
  drawOrganicMass(layerCtx, state.width * 0.84, state.height * 0.18, state.width * 0.28, state.height * 0.22, 12, 0.8);
  drawOrganicMass(layerCtx, state.width * 0.17, state.height * 0.78, state.width * 0.24, state.height * 0.18, 10, 2.4);
  layerCtx.globalAlpha = 1;

  const compartments = [
    { x: 0.1, y: 0.18, rx: 0.18, ry: 0.12, color: "rose", phase: 0.4 },
    { x: 0.44, y: 0.1, rx: 0.22, ry: 0.1, color: "blue", phase: 1.8 },
    { x: 0.68, y: 0.44, rx: 0.2, ry: 0.15, color: "teal", phase: 2.6 },
    { x: 0.32, y: 0.72, rx: 0.24, ry: 0.13, color: "gold", phase: 3.2 },
    { x: 0.88, y: 0.78, rx: 0.18, ry: 0.12, color: "violet", phase: 4.6 }
  ];

  for (const compartment of compartments) {
    const palette = state.palette[compartment.color];
    const x = state.width * compartment.x;
    const y = state.height * compartment.y;
    const rx = state.width * compartment.rx;
    const ry = state.height * compartment.ry;

    layerCtx.globalAlpha = isDark ? 0.13 : 0.16;
    layerCtx.fillStyle = palette.fill;
    drawOrganicMass(layerCtx, x, y, rx, ry, 14, compartment.phase);

    layerCtx.globalAlpha = isDark ? 0.24 : 0.28;
    layerCtx.strokeStyle = palette.stroke;
    layerCtx.lineWidth = 1.2;
    drawOrganicMass(layerCtx, x, y, rx, ry, 14, compartment.phase, true);
  }

  layerCtx.strokeStyle = isDark ? "rgba(232, 222, 195, 0.12)" : "rgba(72, 61, 43, 0.13)";
  layerCtx.lineWidth = 1;
  for (let y = -60; y < state.height + 80; y += 88) {
    drawSquiggle(layerCtx, y, state.width);
  }

  layerCtx.restore();
}
