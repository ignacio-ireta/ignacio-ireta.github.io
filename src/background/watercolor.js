import { CATALYST, MOLECULE_DENSITY } from "./config.js?v=haber-surface-20261113";
import { hexLatticePoints, traceSmoothBlob } from "./geometry.js?v=haber-surface-20261113";
import { lerp, seededRandom } from "./random.js?v=haber-surface-20261113";
import { viewportTierName } from "./species.js?v=haber-surface-20261113";

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

// A faded pencil study of the catalyst: a close-packed iron lattice at the same
// scale as the live nanoparticles, dissolving into the paper toward its rim.
function drawLatticePatch(layerCtx, patch, spacing, isDark) {
  const random = seededRandom(patch.seed);
  const ink = isDark ? "183, 209, 241" : "14, 40, 105";
  layerCtx.save();
  layerCtx.translate(patch.x, patch.y);
  layerCtx.rotate(patch.angle);
  layerCtx.lineWidth = 0.9;
  for (const point of hexLatticePoints(patch.radius, spacing)) {
    const reach = Math.hypot(point.x, point.y) / patch.radius;
    const fade = Math.pow(1 - reach * reach, 1.5) * lerp(0.45, 1, random());
    if (fade < 0.04) continue;
    layerCtx.beginPath();
    layerCtx.arc(point.x, point.y, spacing * 0.5 - 0.7, 0, Math.PI * 2);
    layerCtx.fillStyle = `rgba(${ink}, ${patch.alpha * 0.2 * fade})`;
    layerCtx.fill();
    layerCtx.strokeStyle = `rgba(${ink}, ${patch.alpha * fade})`;
    layerCtx.stroke();
  }
  layerCtx.restore();
}

// The static backdrop behind the simulation: soft washes for the gas mixture
// (cool blue where the feed is, teal toward the product), a few watercolor
// blooms, and faded lattice studies of the iron surface in the corners.
export function drawFieldLayer(layerCtx, state, { isDark }) {
  const { width, height } = state;
  layerCtx.clearRect(0, 0, width, height);
  layerCtx.save();
  layerCtx.globalCompositeOperation = "multiply";

  const haze = isDark ? 0.24 : 0.2;
  const washes = [
    { x: 0.05, y: 0.2, r: 0.52, inner: "79, 120, 189", outer: "126, 107, 167", alpha: 0.62 },
    { x: 0.88, y: 0.9, r: 0.58, inner: "63, 150, 140", outer: "79, 120, 189", alpha: 0.8 },
    { x: 0.92, y: 0.06, r: 0.36, inner: "126, 107, 167", outer: "79, 120, 189", alpha: 0.42 },
    { x: 0.28, y: 1.04, r: 0.4, inner: "79, 120, 189", outer: "63, 150, 140", alpha: 0.4 }
  ];
  for (const wash of washes) {
    const x = width * wash.x;
    const y = height * wash.y;
    const gradient = layerCtx.createRadialGradient(x, y, 12, x, y, width * wash.r);
    gradient.addColorStop(0, `rgba(${wash.inner}, ${haze * wash.alpha})`);
    gradient.addColorStop(0.5, `rgba(${wash.outer}, ${haze * wash.alpha * 0.55})`);
    gradient.addColorStop(1, `rgba(${wash.outer}, 0)`);
    layerCtx.fillStyle = gradient;
    layerCtx.fillRect(0, 0, width, height);
  }
  layerCtx.restore();

  const blooms = [
    { x: 0.1, y: 0.16, rx: 0.2, ry: 0.13, color: "blue", phase: 0.4 },
    { x: 0.5, y: 0.04, rx: 0.24, ry: 0.09, color: "violet", phase: 1.8 },
    { x: 0.94, y: 0.46, rx: 0.14, ry: 0.2, color: "teal", phase: 2.6 },
    { x: 0.3, y: 0.9, rx: 0.26, ry: 0.13, color: "teal", phase: 3.2 },
    { x: 0.76, y: 0.96, rx: 0.2, ry: 0.12, color: "blue", phase: 4.6 },
    { x: 0.02, y: 0.58, rx: 0.1, ry: 0.2, color: "rose", phase: 5.3 }
  ];
  blooms.forEach((bloom, index) => {
    const palette = state.palette[bloom.color];
    const x = width * bloom.x;
    const y = height * bloom.y;
    const rx = width * bloom.rx;
    const ry = height * bloom.ry;
    drawWatercolorShape(layerCtx, (ctx) => traceSmoothBlob(ctx, x, y, rx, ry, 11, bloom.phase), {
      fill: palette.fill,
      stroke: palette.stroke,
      alpha: isDark ? 0.07 : 0.085,
      glazeAlpha: isDark ? 0.04 : 0.05,
      glazes: [{ alpha: isDark ? 0.03 : 0.04, x: rx * 0.05, y: -ry * 0.06 }],
      edgeAlpha: isDark ? 0.13 : 0.17,
      lineWidth: 1.1,
      granulation: 46,
      granuleColor: isDark ? "rgba(10, 12, 9, 0.22)" : "rgba(54, 45, 31, 0.16)",
      bounds: { x, y, rx: rx * 0.8, ry: ry * 0.8 },
      seed: 4100 + index * 131
    });
  });

  const spacing = CATALYST.lattice * MOLECULE_DENSITY[viewportTierName(state)].scale;
  const reach = Math.max(170, Math.min(430, width * 0.25));
  const patches = [
    { x: width * -0.02, y: height * 0.94, radius: reach, angle: 0.31, seed: 811 },
    { x: width * 1.03, y: height * 0.1, radius: reach * 0.86, angle: -0.52, seed: 1213 },
    { x: width * 0.62, y: height * 1.08, radius: reach * 0.62, angle: 0.9, seed: 1709 }
  ];
  for (const patch of patches) {
    drawLatticePatch(layerCtx, { ...patch, alpha: isDark ? 0.17 : 0.2 }, spacing, isDark);
  }
}
