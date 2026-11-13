import { ELEMENTS, SPECIES } from "./config.js?v=haber-micrograph-20261113";
import { clamp } from "./random.js?v=haber-micrograph-20261113";
import { projectAtoms } from "./species.js?v=haber-micrograph-20261113";

// ===========================================================================
// Drawing for the Haber–Bosch simulation in species.js.
//
// Atoms are pre-rendered sphere sprites lit from the upper left (the light is
// fixed in screen space, so highlights stay put while molecules tumble). Each
// molecule is depth-sorted per frame so atoms and bonds occlude one another
// correctly as it rotates. Out-of-focus sprites give the layers in front of and
// behind the reaction plane a depth-of-field falloff.
// ===========================================================================

const TAU = Math.PI * 2;

// Bond radii in Å.
const BOND_WIDTH = { 1: 0.2, 3: 0.105 };
const TRIPLE_GAP = 0.19;

function hexToRgb(hex) {
  const int = parseInt(hex.slice(1), 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function mix(from, to, t) {
  return from.map((channel, index) => Math.round(channel + (to[index] - channel) * t));
}

function rgba(rgb, alpha = 1) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

// Tonal ramp for one element: highlight → base → shade → deep edge.
function elementTones(el, isDark, dim = 0) {
  const element = ELEMENTS[el];
  // Iron shades toward umber and highlights toward cream, so it reads as warm
  // metal against the cool gas and field.
  const ink = element.metallic
    ? isDark
      ? [34, 14, 6]
      : [96, 46, 20]
    : isDark
      ? [4, 8, 18]
      : [10, 26, 72];
  const white = element.metallic ? [255, 244, 222] : [255, 255, 255];
  let base = hexToRgb(isDark ? element.dark : element.light);
  if (dim) base = mix(base, ink, dim);
  // Hydrogen is near-white, so it takes a cool grey shade to read as a sphere.
  const shadeInk = el === "H" ? (isDark ? [70, 92, 140] : [92, 116, 164]) : ink;
  return {
    base,
    highlight: mix(base, white, element.metallic ? 0.74 : 0.6),
    shade: mix(base, shadeInk, el === "H" ? 0.5 : 0.42),
    deep: mix(base, shadeInk, el === "H" ? 0.78 : 0.7),
    outline: rgba(ink, isDark || el !== "N" ? 0.5 : 0.62),
    specular: element.metallic ? 0.95 : 0.8
  };
}

function makeCanvas(size) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

// A lit sphere: diffuse falloff from an off-center light, a soft bounce light
// on the far side, a specular glint, and a thin outline for definition.
function sphereSprite(el, radius, isDark, dpr, dim) {
  const pad = 2;
  const half = radius + pad;
  const canvas = makeCanvas(Math.ceil(half * 2 * dpr));
  const g = canvas.getContext("2d");
  const tones = elementTones(el, isDark, dim);
  g.scale(dpr, dpr);

  const body = g.createRadialGradient(
    half - radius * 0.34,
    half - radius * 0.38,
    radius * 0.06,
    half,
    half,
    radius
  );
  body.addColorStop(0, rgba(tones.highlight));
  body.addColorStop(0.42, rgba(tones.base));
  body.addColorStop(0.86, rgba(tones.shade));
  body.addColorStop(1, rgba(tones.deep));
  g.beginPath();
  g.arc(half, half, radius, 0, TAU);
  g.fillStyle = body;
  g.fill();

  g.save();
  g.clip();
  const bx = half + radius * 0.5;
  const by = half + radius * 0.58;
  const bounce = g.createRadialGradient(bx, by, 0, bx, by, radius * 0.8);
  bounce.addColorStop(0, rgba(tones.highlight, 0.3));
  bounce.addColorStop(1, rgba(tones.highlight, 0));
  g.fillStyle = bounce;
  g.fillRect(0, 0, half * 2, half * 2);

  const sx = half - radius * 0.4;
  const sy = half - radius * 0.44;
  const glint = g.createRadialGradient(sx, sy, 0, sx, sy, radius * 0.36);
  glint.addColorStop(0, rgba([255, 255, 255], tones.specular));
  glint.addColorStop(1, rgba([255, 255, 255], 0));
  g.fillStyle = glint;
  g.fillRect(0, 0, half * 2, half * 2);
  g.restore();

  const lineWidth = Math.max(0.6, radius * 0.085);
  g.beginPath();
  g.arc(half, half, radius - lineWidth / 2, 0, TAU);
  g.lineWidth = lineWidth;
  g.strokeStyle = tones.outline;
  g.stroke();
  return { canvas, half };
}

// Out-of-focus atom: `blur` is the circle-of-confusion growth as a fraction of
// the radius. A wide blur flattens into a soft-edged bokeh disc.
function softSprite(el, radius, isDark, dpr, blur) {
  const outer = radius * (1 + blur);
  const half = outer + 1;
  const canvas = makeCanvas(Math.ceil(half * 2 * dpr));
  const g = canvas.getContext("2d");
  const tones = elementTones(el, isDark);
  g.scale(dpr, dpr);
  const disc = g.createRadialGradient(
    half - radius * 0.2,
    half - radius * 0.22,
    0,
    half,
    half,
    outer
  );
  // Defocus spreads a point into a disc whose rim is brighter than its middle.
  disc.addColorStop(0, rgba(tones.base, 0.62));
  disc.addColorStop(0.66, rgba(tones.base, 0.56));
  disc.addColorStop(0.86, rgba(mix(tones.base, [255, 255, 255], 0.4), 0.9));
  disc.addColorStop(1, rgba(tones.shade, 0));
  g.fillStyle = disc;
  g.fillRect(0, 0, half * 2, half * 2);
  return { canvas, half };
}

// Soft radial sprites, [light scheme, dark scheme]: contact shadows, the
// bright halo optics put around a small object, heat, and reaction cues.
const GLOW = {
  shadow: [
    [18, 26, 70],
    [0, 0, 0]
  ],
  halo: [
    [255, 255, 255],
    [96, 150, 255]
  ],
  ember: [
    [255, 150, 60],
    [255, 138, 48]
  ],
  spark: [
    [255, 214, 130],
    [255, 222, 150]
  ]
};

function glowSprite(radius, dpr, rgb) {
  const half = radius;
  const canvas = makeCanvas(Math.ceil(half * 2 * dpr));
  const g = canvas.getContext("2d");
  g.scale(dpr, dpr);
  const glow = g.createRadialGradient(half, half, 0, half, half, radius);
  glow.addColorStop(0, rgba(rgb, 0.85));
  glow.addColorStop(0.35, rgba(rgb, 0.32));
  glow.addColorStop(1, rgba(rgb, 0));
  g.fillStyle = glow;
  g.fillRect(0, 0, half * 2, half * 2);
  return { canvas, half };
}

// Sprites depend only on element, size, and color scheme; a scene uses a
// handful, so build lazily and drop the lot when the scheme or DPR changes.
let spriteKey = "";
let sprites = new Map();

function sprite(kind, el, radius, state, option = 0) {
  const key = `${state.isDark}|${state.dpr}`;
  if (key !== spriteKey) {
    spriteKey = key;
    sprites = new Map();
  }
  const id = `${kind}|${el}|${radius.toFixed(2)}|${option}`;
  let entry = sprites.get(id);
  if (!entry) {
    if (kind === "sphere") entry = sphereSprite(el, radius, state.isDark, state.dpr, option);
    else if (kind === "soft") entry = softSprite(el, radius, state.isDark, state.dpr, option);
    else entry = glowSprite(radius, state.dpr, GLOW[kind][state.isDark ? 1 : 0]);
    sprites.set(id, entry);
  }
  return entry;
}

function stamp(ctx, entry, x, y, scale = 1) {
  const half = entry.half * scale;
  ctx.drawImage(entry.canvas, x - half, y - half, half * 2, half * 2);
}

// A bond segment drawn as a lit cylinder: dark body, lighter core offset
// toward the light.
function stick(ctx, x1, y1, x2, y2, width, tones) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy);
  if (length < 0.4) return;
  ctx.lineWidth = width;
  ctx.strokeStyle = rgba(tones.shade);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  // Unit normal pointing toward the upper-left light.
  let nx = -dy / length;
  let ny = dx / length;
  if (nx + ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const lift = width * 0.16;
  ctx.lineWidth = width * 0.42;
  ctx.strokeStyle = rgba(tones.highlight, 0.9);
  ctx.beginPath();
  ctx.moveTo(x1 + nx * lift, y1 + ny * lift);
  ctx.lineTo(x2 + nx * lift, y2 + ny * lift);
  ctx.stroke();
}

// Half of a bond, from `from` to the midpoint, in the color of its own atom
// (the usual ball-and-stick convention). Triple bonds are three thin sticks.
function halfBond(ctx, from, to, order, scale, tones) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  if (order === 1) {
    stick(ctx, from.x, from.y, mx, my, BOND_WIDTH[1] * scale, tones);
    return;
  }
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const gap = TRIPLE_GAP * scale;
  for (let k = -1; k <= 1; k += 1) {
    const ox = (-dy / length) * gap * k;
    const oy = (dx / length) * gap * k;
    stick(ctx, from.x + ox, from.y + oy, mx + ox, my + oy, BOND_WIDTH[3] * scale, tones);
  }
}

const toneCache = new Map();
function tonesFor(el, isDark) {
  const key = `${el}|${isDark}`;
  let tones = toneCache.get(key);
  if (!tones) toneCache.set(key, (tones = elementTones(el, isDark)));
  return tones;
}

// One gas molecule: contact shadow, then atoms and half-bonds painted back to
// front. The far layer reuses this without a shadow, smaller and fainter.
function drawGasMolecule(ctx, molecule, state, shadow = true) {
  const atoms = projectAtoms(molecule);
  const scale = molecule.scale;
  const bonds = SPECIES[molecule.species].bonds;
  const x = molecule.x;
  const y = molecule.y;

  if (shadow) {
    // The bright fringe a microscope's optics leave around a small object.
    ctx.globalAlpha = state.isDark ? 0.3 : 0.6;
    stamp(
      ctx,
      sprite("halo", "", SPECIES[molecule.species].collisionRadius * scale * 2.1, state),
      x,
      y
    );

    ctx.globalAlpha = state.isDark ? 0.34 : 0.22;
    for (const atom of atoms) {
      const radius = ELEMENTS[atom.el].ball * scale;
      stamp(
        ctx,
        sprite("shadow", "", radius * 1.9, state),
        x + atom.x + scale * 0.2,
        y + atom.y + scale * 0.3
      );
    }
  }

  if (molecule.heat > 0.05) {
    ctx.globalAlpha = clamp(molecule.heat * 0.2, 0, 0.5);
    stamp(ctx, sprite("ember", "", scale * 2.2, state), x, y);
  }

  const items = [];
  for (const atom of atoms) items.push({ z: atom.z, atom });
  for (const bond of bonds) {
    const a = atoms[bond.a];
    const b = atoms[bond.b];
    // Sort each half by its quarter point so it tucks behind or in front of
    // its own atom depending on which way the bond leans.
    items.push({ z: a.z * 0.75 + b.z * 0.25, from: a, to: b, order: bond.order });
    items.push({ z: b.z * 0.75 + a.z * 0.25, from: b, to: a, order: bond.order });
  }
  items.sort((p, q) => p.z - q.z);

  ctx.globalAlpha = molecule.alpha;
  for (const item of items) {
    if (item.atom) {
      const radius = ELEMENTS[item.atom.el].ball * scale;
      stamp(ctx, sprite("sphere", item.atom.el, radius, state), x + item.atom.x, y + item.atom.y);
    } else {
      halfBond(
        ctx,
        { x: x + item.from.x, y: y + item.from.y },
        { x: x + item.to.x, y: y + item.to.y },
        item.order,
        scale,
        tonesFor(item.from.el, state.isDark)
      );
    }
  }
}

// A bokeh molecule on the near layer, well in front of the focal plane: each
// atom spreads into a soft disc and the bonds are lost in the blur.
function drawNearMolecule(ctx, molecule, state) {
  ctx.globalAlpha = molecule.alpha;
  for (const atom of projectAtoms(molecule).sort((p, q) => p.z - q.z)) {
    const radius = ELEMENTS[atom.el].ball * molecule.scale;
    stamp(
      ctx,
      sprite("soft", atom.el, radius, state, 0.85),
      molecule.x + atom.x,
      molecule.y + atom.y
    );
  }
}

// An iron nanoparticle and everything adsorbed on it.
function drawCatalyst(ctx, catalyst, state, time) {
  const { cos, sin, scale } = catalyst;
  const world = (lx, ly) => ({
    x: catalyst.x + lx * cos - ly * sin,
    y: catalyst.y + lx * sin + ly * cos
  });
  const radius = catalyst.atomRadius;
  const top = catalyst.atoms.map((atom) => world(atom.lx, atom.ly));
  const under = catalyst.under.map((atom) => world(atom.lx, atom.ly));

  // The metal runs hot: a slow-breathing glow that brightens with pointer heat.
  const breath = 0.5 + 0.5 * Math.sin(time * 0.0011 + catalyst.id);
  ctx.globalAlpha = clamp(
    (state.isDark ? 0.2 : 0.26) + breath * 0.1 + catalyst.heat * 0.16,
    0,
    0.75
  );
  stamp(ctx, sprite("ember", "", catalyst.radius * 1.7, state), catalyst.x, catalyst.y);

  // Soft shadow under the whole particle, then the two atomic layers. Atoms
  // are painted top-to-bottom of the screen so the lit caps overlap evenly.
  ctx.globalAlpha = state.isDark ? 0.5 : 0.3;
  const shadow = sprite("shadow", "", radius * 1.7, state);
  for (const position of under)
    stamp(ctx, shadow, position.x + scale * 0.35, position.y + scale * 0.5);

  ctx.globalAlpha = 1;
  const deep = sprite("sphere", "Fe", radius, state, 0.4);
  for (const position of under.sort((p, q) => p.y - q.y)) stamp(ctx, deep, position.x, position.y);
  const metal = sprite("sphere", "Fe", radius, state);
  for (const position of top.sort((p, q) => p.y - q.y)) stamp(ctx, metal, position.x, position.y);

  // Bonds still breaking after a dissociative adsorption.
  for (const ghost of catalyst.ghosts) {
    const a = world(ghost.a.lx, ghost.a.ly);
    const b = world(ghost.b.lx, ghost.b.ly);
    ctx.globalAlpha = clamp(ghost.life, 0, 1);
    // A triple bond thins to a single one as it lets go.
    const order = ghost.order === 3 && ghost.life > 0.55 ? 3 : 1;
    const tones = tonesFor(ghost.a.el, state.isDark);
    halfBond(ctx, a, b, order, scale, tones);
    halfBond(ctx, b, a, order, scale, tones);
  }

  const contact = sprite("shadow", "", ELEMENTS.N.ball * scale * 2, state);
  for (const adsorbate of catalyst.adsorbates) {
    const center = world(adsorbate.lx, adsorbate.ly);
    ctx.globalAlpha = 0.42;
    stamp(ctx, contact, center.x + scale * 0.08, center.y + scale * 0.14);
    ctx.globalAlpha = 1;
    stamp(
      ctx,
      sprite("sphere", adsorbate.el, ELEMENTS[adsorbate.el].ball * scale, state),
      center.x,
      center.y
    );

    // Hydrogens of NH, NH2, NH3 point up and out, toward the viewer.
    const hydrogens = adsorbate.hs.map((h) =>
      world(adsorbate.lx + h.x * scale, adsorbate.ly + h.y * scale)
    );
    for (const position of hydrogens) {
      halfBond(ctx, center, position, 1, scale, tonesFor("N", state.isDark));
      halfBond(ctx, position, center, 1, scale, tonesFor("H", state.isDark));
    }
    const hydrogen = sprite("sphere", "H", ELEMENTS.H.ball * scale, state);
    for (const position of hydrogens) stamp(ctx, hydrogen, position.x, position.y);
  }
}

// Short-lived reaction cues: a glow where an N–H bond forms, and a ring that
// spreads from the spot where an ammonia molecule lifts off.
function drawEffect(ctx, effect, state, scale) {
  const t = effect.age / effect.duration;
  if (effect.kind === "bond") {
    ctx.globalAlpha = (1 - t) * (1 - t) * (state.isDark ? 0.9 : 0.85);
    stamp(ctx, sprite("spark", "", scale * 1.7, state), effect.x, effect.y, 0.7 + t * 0.9);
    return;
  }
  const ease = 1 - (1 - t) * (1 - t);
  ctx.globalAlpha = (1 - t) * (state.isDark ? 0.7 : 0.6);
  ctx.lineWidth = 1.8 * (1 - t) + 0.4;
  ctx.strokeStyle = state.isDark ? "rgb(150, 235, 220)" : "rgb(52, 150, 140)";
  ctx.beginPath();
  ctx.arc(effect.x, effect.y, scale * (1.1 + ease * 2.6), 0, TAU);
  ctx.stroke();
}

export function drawMoleculeField(ctx, state, time = 0) {
  if (!state.catalysts) return;
  ctx.save();
  ctx.lineCap = "butt";
  for (const molecule of state.ambient) {
    if (molecule.depth === "far") drawGasMolecule(ctx, molecule, state, false);
  }
  for (const catalyst of state.catalysts) drawCatalyst(ctx, catalyst, state, time);
  const scale = state.catalysts.length ? state.catalysts[0].scale : 14;
  for (const effect of state.effects) {
    if (effect.kind === "bond") drawEffect(ctx, effect, state, scale);
  }
  for (const molecule of state.molecules) drawGasMolecule(ctx, molecule, state);
  for (const effect of state.effects) {
    if (effect.kind !== "bond") drawEffect(ctx, effect, state, scale);
  }
  for (const molecule of state.ambient) {
    if (molecule.depth === "near") drawNearMolecule(ctx, molecule, state);
  }
  ctx.restore();
}
