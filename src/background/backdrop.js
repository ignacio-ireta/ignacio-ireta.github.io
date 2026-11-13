import { CATALYST, MOLECULE_DENSITY } from "./config.js?v=haber-micrograph-20261113";
import { hexLatticePoints } from "./geometry.js?v=haber-micrograph-20261113";
import { lerp, seededRandom } from "./random.js?v=haber-micrograph-20261113";
import { viewportTierName } from "./species.js?v=haber-micrograph-20261113";

// ===========================================================================
// The field of view: what the "microscope" sees around the molecules.
//
// Light scheme is a bright-field micrograph (a lit field falling off toward
// the rim); dark scheme is a dark-field / fluorescence one. Both get the same
// optical furniture: uneven illumination, the catalyst bed far out of focus
// beneath the focal plane, diffraction-ringed specks of dust, a vignette, a
// scale bar, slow drifting light, and sensor grain.
// ===========================================================================

const TAU = Math.PI * 2;

const FIELD = {
  light: {
    stops: ["#fcfaf1", "#e4ecf3", "#b4c4e0"],
    tints: [
      { x: 0.12, y: 0.78, r: 0.46, rgb: "84, 178, 164", alpha: 0.28 },
      { x: 0.86, y: 0.16, r: 0.42, rgb: "140, 120, 200", alpha: 0.24 },
      { x: 0.74, y: 0.88, r: 0.4, rgb: "240, 170, 112", alpha: 0.3 },
      { x: 0.18, y: 0.1, r: 0.4, rgb: "96, 140, 220", alpha: 0.2 }
    ],
    bed: "204, 132, 74",
    bedAlpha: 0.36,
    speck: "255, 255, 255",
    ink: "30, 46, 100",
    vignette: "40, 52, 108",
    vignetteAlpha: 0.34,
    lights: [
      { rgb: "255, 255, 255", alpha: 0.4, r: 0.34 },
      { rgb: "255, 232, 200", alpha: 0.34, r: 0.28 },
      { rgb: "255, 255, 255", alpha: 0.3, r: 0.3 },
      { rgb: "208, 244, 236", alpha: 0.34, r: 0.26 }
    ],
    blend: "source-over",
    grain: 0.5
  },
  dark: {
    stops: ["#1b2a40", "#0d1622", "#03060b"],
    tints: [
      { x: 0.12, y: 0.78, r: 0.46, rgb: "40, 150, 140", alpha: 0.26 },
      { x: 0.86, y: 0.16, r: 0.42, rgb: "110, 90, 190", alpha: 0.24 },
      { x: 0.74, y: 0.88, r: 0.4, rgb: "214, 120, 60", alpha: 0.2 },
      { x: 0.18, y: 0.1, r: 0.4, rgb: "50, 100, 200", alpha: 0.24 }
    ],
    bed: "232, 146, 76",
    bedAlpha: 0.3,
    speck: "170, 205, 255",
    ink: "214, 226, 248",
    vignette: "0, 0, 0",
    vignetteAlpha: 0.66,
    lights: [
      { rgb: "70, 130, 220", alpha: 0.2, r: 0.34 },
      { rgb: "236, 150, 80", alpha: 0.13, r: 0.28 },
      { rgb: "60, 180, 168", alpha: 0.15, r: 0.3 },
      { rgb: "130, 106, 214", alpha: 0.15, r: 0.26 }
    ],
    blend: "lighter",
    grain: 0.3
  }
};

function softDisc(ctx, x, y, radius, rgb, alpha) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(${rgb}, ${alpha})`);
  gradient.addColorStop(0.55, `rgba(${rgb}, ${alpha * 0.7})`);
  gradient.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

// The catalyst bed below the focal plane: iron lattice at the same scale as
// the live particles, blurred into overlapping warm discs that fade out.
function drawBed(ctx, patch, spacing, field) {
  const random = seededRandom(patch.seed);
  ctx.save();
  ctx.translate(patch.x, patch.y);
  ctx.rotate(patch.angle);
  for (const point of hexLatticePoints(patch.radius, spacing)) {
    const reach = Math.hypot(point.x, point.y) / patch.radius;
    const fade = Math.pow(1 - reach * reach, 1.4) * lerp(0.55, 1, random());
    if (fade < 0.04) continue;
    softDisc(ctx, point.x, point.y, spacing * 0.72, field.bed, field.bedAlpha * fade);
  }
  ctx.restore();
}

// Dust on the optics, far out of focus: each speck spreads into a faint disc
// with a brighter diffraction rim and an inner ring.
function drawSpecks(ctx, state, field, isDark) {
  const random = seededRandom((state.seed || 0) ^ 0x5eed);
  const count = Math.round((state.width * state.height) / 36000);
  for (let i = 0; i < count; i += 1) {
    const x = random() * state.width;
    const y = random() * state.height;
    const radius = lerp(5, 58, random() * random());
    const alpha = lerp(0.1, 0.32, random());
    // In bright field some specks absorb instead of scatter.
    const rgb = !isDark && random() < 0.4 ? field.ink : field.speck;
    const strength = rgb === field.ink ? alpha * 0.45 : alpha;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fillStyle = `rgba(${rgb}, ${strength * 0.32})`;
    ctx.fill();
    ctx.lineWidth = Math.max(0.8, radius * 0.07);
    ctx.strokeStyle = `rgba(${rgb}, ${strength})`;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.6, 0, TAU);
    ctx.lineWidth = Math.max(0.6, radius * 0.04);
    ctx.strokeStyle = `rgba(${rgb}, ${strength * 0.45})`;
    ctx.stroke();
  }
}

function drawScaleBar(ctx, state, scale, field) {
  const length = 10 * scale; // 10 Å = 1 nm
  const x = 22;
  const y = state.height - 24;
  ctx.strokeStyle = `rgba(${field.ink}, 0.55)`;
  ctx.fillStyle = `rgba(${field.ink}, 0.6)`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - 4);
  ctx.lineTo(x, y);
  ctx.lineTo(x + length, y);
  ctx.lineTo(x + length, y - 4);
  ctx.stroke();
  ctx.font = "500 11px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText("1 nm", x, y - 9);
}

// Everything that does not move, rendered once per resize. Opaque: it replaces
// the page's own background behind the canvas.
export function drawFieldLayer(ctx, state, { isDark }) {
  const { width, height } = state;
  const field = isDark ? FIELD.dark : FIELD.light;
  const reach = Math.hypot(width, height) * 0.62;

  const base = ctx.createRadialGradient(
    width * 0.5,
    height * 0.44,
    0,
    width * 0.5,
    height * 0.44,
    reach
  );
  base.addColorStop(0, field.stops[0]);
  base.addColorStop(0.58, field.stops[1]);
  base.addColorStop(1, field.stops[2]);
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalCompositeOperation = field.blend;
  for (const tint of field.tints) {
    softDisc(
      ctx,
      width * tint.x,
      height * tint.y,
      Math.max(width, height) * tint.r,
      tint.rgb,
      tint.alpha
    );
  }
  ctx.restore();

  const scale = MOLECULE_DENSITY[viewportTierName(state)].scale;
  const spacing = CATALYST.lattice * scale;
  const span = Math.max(190, Math.min(460, width * 0.27));
  const patches = [
    { x: width * -0.02, y: height * 0.96, radius: span, angle: 0.31, seed: 811 },
    { x: width * 1.03, y: height * 0.08, radius: span * 0.9, angle: -0.52, seed: 1213 },
    { x: width * 0.6, y: height * 1.1, radius: span * 0.66, angle: 0.9, seed: 1709 },
    { x: width * 0.34, y: height * -0.12, radius: span * 0.6, angle: 1.4, seed: 2203 }
  ];
  for (const patch of patches) drawBed(ctx, patch, spacing, field);

  drawSpecks(ctx, state, field, isDark);

  const vignette = ctx.createRadialGradient(
    width * 0.5,
    height * 0.5,
    Math.min(width, height) * 0.38,
    width * 0.5,
    height * 0.5,
    Math.hypot(width, height) * 0.56
  );
  vignette.addColorStop(0, `rgba(${field.vignette}, 0)`);
  vignette.addColorStop(1, `rgba(${field.vignette}, ${field.vignetteAlpha})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);

  drawScaleBar(ctx, state, scale, field);
}

const lightSprites = new Map();
function lightSprite(rgb) {
  let sprite = lightSprites.get(rgb);
  if (!sprite) {
    sprite = document.createElement("canvas");
    sprite.width = 256;
    sprite.height = 256;
    const g = sprite.getContext("2d");
    const glow = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    glow.addColorStop(0, `rgba(${rgb}, 1)`);
    glow.addColorStop(0.4, `rgba(${rgb}, 0.42)`);
    glow.addColorStop(1, `rgba(${rgb}, 0)`);
    g.fillStyle = glow;
    g.fillRect(0, 0, 256, 256);
    lightSprites.set(rgb, sprite);
  }
  return sprite;
}

// Illumination that is never quite even: broad pools of light wandering
// slowly across the field, each on its own long Lissajous path.
export function drawFieldLights(ctx, state, time, { isDark }) {
  const field = isDark ? FIELD.dark : FIELD.light;
  const t = time * 0.00006;
  ctx.save();
  ctx.globalCompositeOperation = field.blend;
  field.lights.forEach((light, index) => {
    const x = state.width * (0.5 + 0.4 * Math.sin(t * (1 + index * 0.37) + index * 2.1));
    const y = state.height * (0.5 + 0.38 * Math.cos(t * (0.8 + index * 0.29) + index * 1.3));
    const radius = Math.max(state.width, state.height) * light.r;
    ctx.globalAlpha = light.alpha * (0.8 + 0.2 * Math.sin(t * 3.1 + index));
    ctx.drawImage(lightSprite(light.rgb), x - radius, y - radius, radius * 2, radius * 2);
  });
  ctx.restore();
}

export function createGrainTile(isDark) {
  const size = 192;
  const tile = document.createElement("canvas");
  tile.width = size;
  tile.height = size;
  const g = tile.getContext("2d");
  const random = seededRandom(isDark ? 78631 : 78617);
  for (let i = 0; i < 5200; i += 1) {
    const bright = random() < (isDark ? 0.7 : 0.4);
    const alpha = bright ? lerp(0.04, isDark ? 0.16 : 0.3, random()) : lerp(0.03, 0.16, random());
    g.fillStyle = bright ? `rgba(255, 255, 255, ${alpha})` : `rgba(20, 28, 60, ${alpha})`;
    g.fillRect(Math.floor(random() * size), Math.floor(random() * size), 1, 1);
  }
  return tile;
}

// Sensor grain in device pixels, re-seated about eleven times a second so it
// shimmers like a live feed without strobing.
export function drawGrain(ctx, state, time, { isDark }) {
  const grain = state.layers.grain;
  if (!grain) return;
  if (!grain.pattern) grain.pattern = ctx.createPattern(grain.tile, "repeat");
  const step = Math.floor(time / 90);
  const ox = (step * 73) % 192;
  const oy = (step * 151) % 192;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, -ox, -oy);
  ctx.globalAlpha = (isDark ? FIELD.dark : FIELD.light).grain;
  ctx.fillStyle = grain.pattern;
  ctx.fillRect(0, 0, state.width * state.dpr + 192, state.height * state.dpr + 192);
  ctx.restore();
}
