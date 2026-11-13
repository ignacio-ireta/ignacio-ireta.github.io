import {
  CATALYST,
  ELEMENTS,
  GAS_MIX,
  KINETICS,
  MOLECULE_DENSITY,
  POINTER,
  SPECIES,
  THERMAL
} from "./config.js?v=haber-surface-20261113";
import { clamp, lerp, seededRandom, smoothstep } from "./random.js?v=haber-surface-20261113";

// ===========================================================================
// Haber–Bosch on iron, as a small molecular-dynamics sketch.
//
// Gas phase: N2, H2 and NH3 are rigid rotors tumbling in 3D (a quaternion per
// molecule) and moving in the viewport plane, coupled to a Langevin thermostat
// and colliding elastically with their real masses.
//
// Surface: each iron nanoparticle exposes three-fold hollow sites. Molecules
// that strike it can adsorb; adsorbed atoms hop between sites and react through
// the elementary steps listed beside KINETICS in config.js, and products desorb
// back into the gas. Every step is reversible and moves whole atoms, so the
// atom inventory is conserved exactly and the mixture settles into a dynamic
// equilibrium on its own.
//
// This module is pure simulation (no DOM, no canvas); render.js draws it.
// ===========================================================================

const TAU = Math.PI * 2;

// Projected N–H distance (Å) for surface NH, NH2, NH3 seen from above.
const SUBSTITUENT_RING = [0, 0.34, 0.8, 0.93];

let nextEntityId = 1;

export function viewportTierName(state) {
  if (state.width < 620) return "mobile";
  if (state.width < 1040) return "tablet";
  return "desktop";
}

function viewportTier(state) {
  return MOLECULE_DENSITY[viewportTierName(state)];
}

// The column the page content scrolls through. Iron particles make their
// homes in the margins beside it when the viewport is wide enough to have any.
function contentColumn(state) {
  const width = Math.min(1180, Math.max(0, state.width - 32));
  return { left: (state.width - width) / 2, right: (state.width + width) / 2 };
}

// 0 while a disc of `radius` at x overlaps the content column, rising to 1
// once it sits wholly in a margin.
function contentClearance(state, x, radius) {
  const column = contentColumn(state);
  const gap = Math.max(column.left - (x + radius), x - radius - column.right);
  return smoothstep(1 + gap / (radius * 2));
}

// Approximately standard-normal deviate (sum of four uniforms).
function gauss(random) {
  return (random() + random() + random() + random() - 2) * 1.7320508;
}

// Per-axis thermal velocity spread (px/ms): rms speed ∝ sqrt(T / m).
function thermalSigma(mass, scale, temperature) {
  return (THERMAL.speedN2 * scale * Math.sqrt((temperature * SPECIES.N2.mass) / mass)) / Math.SQRT2;
}

function arrhenius(ea, temperature) {
  return Math.exp(ea * (1 - 1 / temperature));
}

// --- Gas molecules ---------------------------------------------------------

export function createGasMolecule(species, x, y, scale, random, temperature = 1) {
  const spec = SPECIES[species];
  const sigma = thermalSigma(spec.mass, scale, temperature);
  const spin = THERMAL.spin * spec.spin;
  const q = [gauss(random), gauss(random), gauss(random), gauss(random)];
  const norm = Math.hypot(q[0], q[1], q[2], q[3]) || 1;

  return {
    id: nextEntityId++,
    species,
    mass: spec.mass,
    scale,
    x,
    y,
    vx: gauss(random) * sigma,
    vy: gauss(random) * sigma,
    radius: spec.collisionRadius * scale,
    // Orientation quaternion and world-frame angular velocity (rad/ms).
    qw: q[0] / norm,
    qx: q[1] / norm,
    qy: q[2] / norm,
    qz: q[3] / norm,
    wx: gauss(random) * spin,
    wy: gauss(random) * spin,
    wz: gauss(random) * spin,
    // Bond-length factor: `relax` eases a freshly formed molecule from the
    // surface geometry to its gas-phase one, `vib` rings briefly afterwards.
    stretch: 1,
    relax: 0,
    vib: 0,
    vibPhase: 0,
    heat: 0,
    alpha: 1,
    passCatalyst: 0, // id of the particle this molecule is lifting off from
    dead: false
  };
}

// Atom positions (px, relative to the molecule's center) after rotating the
// species template by the molecule's orientation. +z points at the viewer.
export function projectAtoms(molecule) {
  const { qw: w, qx: x, qy: y, qz: z } = molecule;
  const s = molecule.scale * molecule.stretch;
  const r00 = 1 - 2 * (y * y + z * z);
  const r01 = 2 * (x * y - w * z);
  const r02 = 2 * (x * z + w * y);
  const r10 = 2 * (x * y + w * z);
  const r11 = 1 - 2 * (x * x + z * z);
  const r12 = 2 * (y * z - w * x);
  const r20 = 2 * (x * z - w * y);
  const r21 = 2 * (y * z + w * x);
  const r22 = 1 - 2 * (x * x + y * y);
  return SPECIES[molecule.species].atoms.map((atom) => ({
    el: atom.el,
    x: (r00 * atom.x + r01 * atom.y + r02 * atom.z) * s,
    y: (r10 * atom.x + r11 * atom.y + r12 * atom.z) * s,
    z: (r20 * atom.x + r21 * atom.y + r22 * atom.z) * s
  }));
}

function tumble(molecule, deltaMs) {
  const { qw, qx, qy, qz, wx, wy, wz } = molecule;
  const h = 0.5 * deltaMs;
  const nw = qw + h * (-wx * qx - wy * qy - wz * qz);
  const nx = qx + h * (wx * qw + wy * qz - wz * qy);
  const ny = qy + h * (-wx * qz + wy * qw + wz * qx);
  const nz = qz + h * (wx * qy - wy * qx + wz * qw);
  const norm = Math.hypot(nw, nx, ny, nz) || 1;
  molecule.qw = nw / norm;
  molecule.qx = nx / norm;
  molecule.qy = ny / norm;
  molecule.qz = nz / norm;
}

function pointerHeat(entity, state, frameScale) {
  let strength = 0;
  if (state.pointer.active) {
    const distance = Math.hypot(entity.x - state.pointer.x, entity.y - state.pointer.y);
    if (distance < POINTER.radius) strength = smoothstep(1 - distance / POINTER.radius);
  }
  if (strength > 0) {
    entity.heat = clamp(entity.heat + strength * POINTER.heatGain * frameScale, 0, POINTER.maxHeat);
  } else {
    entity.heat *= Math.pow(1 - POINTER.cooling, frameScale);
  }
  return 1 + entity.heat * THERMAL.heatToTemp;
}

function reflectWalls(molecule, state) {
  const r = molecule.radius;
  if (molecule.x < r) {
    molecule.x = r;
    molecule.vx = Math.abs(molecule.vx);
  } else if (molecule.x > state.width - r) {
    molecule.x = state.width - r;
    molecule.vx = -Math.abs(molecule.vx);
  }
  if (molecule.y < r) {
    molecule.y = r;
    molecule.vy = Math.abs(molecule.vy);
  } else if (molecule.y > state.height - r) {
    molecule.y = state.height - r;
    molecule.vy = -Math.abs(molecule.vy);
  }
}

function stepGasMolecule(molecule, state, deltaMs, frameScale, random) {
  const temperature = pointerHeat(molecule, state, frameScale);
  const spec = SPECIES[molecule.species];

  // Langevin thermostat: friction plus matched random kicks relax both the
  // translational and the rotational energy toward the local temperature.
  const g = Math.min(0.5, THERMAL.coupling * deltaMs);
  const kick = Math.sqrt(2 * g);
  const sigma = thermalSigma(molecule.mass, molecule.scale, temperature);
  molecule.vx += -g * molecule.vx + sigma * kick * gauss(random);
  molecule.vy += -g * molecule.vy + sigma * kick * gauss(random);
  const spin = THERMAL.spin * spec.spin * Math.sqrt(temperature);
  molecule.wx += -g * molecule.wx + spin * kick * gauss(random);
  molecule.wy += -g * molecule.wy + spin * kick * gauss(random);
  molecule.wz += -g * molecule.wz + spin * kick * gauss(random);

  molecule.x += molecule.vx * deltaMs;
  molecule.y += molecule.vy * deltaMs;
  tumble(molecule, deltaMs);

  if (molecule.relax !== 0 || molecule.vib !== 0) {
    molecule.relax *= Math.exp(-deltaMs / 150);
    molecule.vib *= Math.exp(-deltaMs / 650);
    molecule.vibPhase += deltaMs * 0.021;
    if (Math.abs(molecule.relax) < 0.002) molecule.relax = 0;
    if (molecule.vib < 0.002) molecule.vib = 0;
    molecule.stretch = 1 + molecule.relax + molecule.vib * Math.sin(molecule.vibPhase);
  }

  reflectWalls(molecule, state);
}

// Elastic hard-disc collision with the real mass ratio; a glancing share of
// the impact goes into tumbling.
function collideGasPair(a, b, random) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const minDist = a.radius + b.radius;
  const distSq = dx * dx + dy * dy;
  if (distSq >= minDist * minDist || distSq === 0) return;

  const dist = Math.sqrt(distSq);
  const nx = dx / dist;
  const ny = dy / dist;
  const total = a.mass + b.mass;
  const overlap = minDist - dist;
  a.x -= nx * overlap * (b.mass / total);
  a.y -= ny * overlap * (b.mass / total);
  b.x += nx * overlap * (a.mass / total);
  b.y += ny * overlap * (a.mass / total);

  const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (vn >= 0) return;
  const impulse = (-2 * vn) / (1 / a.mass + 1 / b.mass);
  a.vx -= (impulse / a.mass) * nx;
  a.vy -= (impulse / a.mass) * ny;
  b.vx += (impulse / b.mass) * nx;
  b.vy += (impulse / b.mass) * ny;

  for (const molecule of [a, b]) {
    const spin = (0.45 * Math.abs(vn)) / molecule.radius;
    molecule.wx += gauss(random) * spin;
    molecule.wy += gauss(random) * spin;
    molecule.wz += gauss(random) * spin;
  }
}

// Broad phase: uniform grid sized to the largest molecule, each pair once.
function collideGas(state, random) {
  const molecules = state.molecules;
  if (molecules.length < 2) return;
  const cell = SPECIES.NH3.collisionRadius * molecules[0].scale * 2 + 2;
  const grid = new Map();
  for (const molecule of molecules) {
    molecule._cx = Math.floor(molecule.x / cell);
    molecule._cy = Math.floor(molecule.y / cell);
    const key = molecule._cx * 8192 + molecule._cy;
    const bucket = grid.get(key);
    if (bucket) bucket.push(molecule);
    else grid.set(key, [molecule]);
  }
  for (const molecule of molecules) {
    for (let ox = -1; ox <= 1; ox += 1) {
      for (let oy = -1; oy <= 1; oy += 1) {
        const bucket = grid.get((molecule._cx + ox) * 8192 + molecule._cy + oy);
        if (!bucket) continue;
        for (const other of bucket) {
          if (other.id > molecule.id) collideGasPair(molecule, other, random);
        }
      }
    }
  }
}

// --- Iron nanoparticles ----------------------------------------------------

// Lay out a close-packed facet from atoms-per-row, find its three-fold hollow
// sites (centroids of mutually touching atom triples), and link neighbouring
// sites. Coordinates are px in the particle's own frame.
export function buildCatalystGeometry(rows, scale) {
  const a = CATALYST.lattice * scale;
  const rowHeight = (a * Math.sqrt(3)) / 2;
  const atoms = [];
  rows.forEach((count, row) => {
    for (let i = 0; i < count; i += 1) {
      atoms.push({
        lx: (i - (count - 1) / 2) * a,
        ly: (row - (rows.length - 1) / 2) * rowHeight
      });
    }
  });
  const cx = atoms.reduce((sum, atom) => sum + atom.lx, 0) / atoms.length;
  const cy = atoms.reduce((sum, atom) => sum + atom.ly, 0) / atoms.length;
  for (const atom of atoms) {
    atom.lx -= cx;
    atom.ly -= cy;
  }

  const touching = (p, q) => Math.hypot(p.lx - q.lx, p.ly - q.ly) < a * 1.1;
  const sites = [];
  for (let i = 0; i < atoms.length; i += 1) {
    for (let j = i + 1; j < atoms.length; j += 1) {
      if (!touching(atoms[i], atoms[j])) continue;
      for (let k = j + 1; k < atoms.length; k += 1) {
        if (!touching(atoms[i], atoms[k]) || !touching(atoms[j], atoms[k])) continue;
        sites.push({
          lx: (atoms[i].lx + atoms[j].lx + atoms[k].lx) / 3,
          ly: (atoms[i].ly + atoms[j].ly + atoms[k].ly) / 3,
          neighbors: [],
          occupant: null
        });
      }
    }
  }
  for (let i = 0; i < sites.length; i += 1) {
    for (let j = i + 1; j < sites.length; j += 1) {
      if (Math.hypot(sites[i].lx - sites[j].lx, sites[i].ly - sites[j].ly) < a * 0.7) {
        sites[i].neighbors.push(j);
        sites[j].neighbors.push(i);
      }
    }
  }

  // Second layer: the same patch shifted into the hollows, so it shows through
  // the gaps and along one edge and the particle reads as a solid.
  const under = atoms.map((atom) => ({ lx: atom.lx + a / 2, ly: atom.ly + rowHeight / 3 }));

  const atomRadius = ELEMENTS.Fe.ball * scale;
  const radius = Math.max(...atoms.map((atom) => Math.hypot(atom.lx, atom.ly))) + atomRadius;
  return { atoms, under, sites, atomRadius, radius };
}

export function createCatalyst(rows, x, y, scale, random) {
  const geometry = buildCatalystGeometry(rows, scale);
  return {
    id: nextEntityId++,
    ...geometry,
    scale,
    x,
    y,
    vx: 0,
    vy: 0,
    homeX: x,
    homeY: y,
    angle: random() * TAU,
    spin: CATALYST.spin * (random() < 0.5 ? -1 : 1) * lerp(0.5, 1, random()),
    cos: 1,
    sin: 0,
    mass: ELEMENTS.Fe.mass * geometry.atoms.length * 2,
    heat: 0,
    adsorbates: [],
    ghosts: [] // bonds still fading out after a dissociative adsorption
  };
}

function toWorld(catalyst, lx, ly) {
  return {
    x: catalyst.x + lx * catalyst.cos - ly * catalyst.sin,
    y: catalyst.y + lx * catalyst.sin + ly * catalyst.cos
  };
}

function toLocal(catalyst, x, y) {
  const dx = x - catalyst.x;
  const dy = y - catalyst.y;
  return {
    x: dx * catalyst.cos + dy * catalyst.sin,
    y: -dx * catalyst.sin + dy * catalyst.cos
  };
}

// Surface species are an atom on a site: "H", or "N" carrying `h` hydrogens
// (N*, NH*, NH2*, NH3*). `hs` holds the hydrogens' offsets from the N in Å.
function addAdsorbate(catalyst, el, siteIndex, lx, ly) {
  const site = catalyst.sites[siteIndex];
  const adsorbate = {
    id: nextEntityId++,
    el,
    h: 0,
    hs: [],
    phi: 0,
    site: siteIndex,
    lx: lx ?? site.lx,
    ly: ly ?? site.ly,
    dead: false
  };
  site.occupant = adsorbate;
  catalyst.adsorbates.push(adsorbate);
  return adsorbate;
}

function removeAdsorbate(catalyst, adsorbate) {
  catalyst.sites[adsorbate.site].occupant = null;
  adsorbate.dead = true;
}

function isSettled(catalyst, adsorbate) {
  const site = catalyst.sites[adsorbate.site];
  return Math.hypot(adsorbate.lx - site.lx, adsorbate.ly - site.ly) < catalyst.scale * 0.12;
}

// NHx species are bulky: they keep other nitrogen species out of the hollows
// next to them. Bare N* atoms may sit side by side (and recombine to N2).
function siteAcceptsNitrogen(catalyst, siteIndex, hydrogens, ignoreAdsorbate = null) {
  for (const neighbor of catalyst.sites[siteIndex].neighbors) {
    const occupant = catalyst.sites[neighbor].occupant;
    if (!occupant || occupant.el !== "N" || occupant === ignoreAdsorbate) continue;
    if (hydrogens > 0 || occupant.h > 0) return false;
  }
  return true;
}

function substituentTarget(adsorbate, index) {
  const r = SUBSTITUENT_RING[adsorbate.h];
  let angle = adsorbate.phi;
  if (adsorbate.h === 2) angle += index * 2;
  else if (adsorbate.h === 3) angle += (index * TAU) / 3;
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
}

function recordEvent(state, name) {
  const events = state.chemistry.events;
  events[name] = (events[name] || 0) + 1;
}

function addEffect(state, kind, x, y) {
  state.effects.push({ kind, x, y, age: 0, duration: kind === "bond" ? 620 : 900 });
}

// Launch a molecule off the surface, heading away from the particle's center.
function desorb(state, catalyst, species, lx, ly, speedFactor, random) {
  const origin = toWorld(catalyst, lx, ly);
  const temperature = 1 + catalyst.heat * THERMAL.heatToTemp;
  const molecule = createGasMolecule(
    species,
    origin.x,
    origin.y,
    catalyst.scale,
    random,
    temperature
  );
  let dx = origin.x - catalyst.x;
  let dy = origin.y - catalyst.y;
  const away = Math.hypot(dx, dy);
  const jitter = random() * TAU;
  dx = (away > 1 ? dx / away : 0) + Math.cos(jitter) * 0.7;
  dy = (away > 1 ? dy / away : 0) + Math.sin(jitter) * 0.7;
  const norm = Math.hypot(dx, dy) || 1;
  const speed = thermalSigma(molecule.mass, molecule.scale, temperature) * Math.SQRT2 * speedFactor;
  molecule.vx = (dx / norm) * speed + catalyst.vx;
  molecule.vy = (dy / norm) * speed + catalyst.vy;
  molecule.wx *= 0.3;
  molecule.wy *= 0.3;
  molecule.wz *= 0.3;
  molecule.passCatalyst = catalyst.id;
  state.molecules.push(molecule);
  return molecule;
}

// 2 X* → X2(g): the new molecule starts stretched across the two sites and
// relaxes to its bond length as it lifts off.
function desorbDiatomic(state, catalyst, first, second, random) {
  const species = first.el === "N" ? "N2" : "H2";
  const template = SPECIES[species].atoms;
  const bondPx = (template[1].x - template[0].x) * catalyst.scale;
  const lx = (first.lx + second.lx) / 2;
  const ly = (first.ly + second.ly) / 2;
  const molecule = desorb(state, catalyst, species, lx, ly, 1.2, random);
  const axis = Math.atan2(second.ly - first.ly, second.lx - first.lx) + catalyst.angle;
  molecule.qw = Math.cos(axis / 2);
  molecule.qx = 0;
  molecule.qy = 0;
  molecule.qz = Math.sin(axis / 2);
  molecule.relax = Math.hypot(second.lx - first.lx, second.ly - first.ly) / bondPx - 1;
  molecule.vib = 0.1;
  molecule.stretch = 1 + molecule.relax;
  removeAdsorbate(catalyst, first);
  removeAdsorbate(catalyst, second);
  recordEvent(state, species === "N2" ? "desorbN2" : "desorbH2");
}

// NH3* → NH3(g): leaves hydrogens-up, exactly as it sat on the surface, and a
// little hot — the reaction is exothermic.
function desorbAmmonia(state, catalyst, adsorbate, random) {
  const molecule = desorb(state, catalyst, "NH3", adsorbate.lx, adsorbate.ly, 1.7, random);
  const psi = adsorbate.phi + catalyst.angle + Math.PI / 2;
  molecule.qw = 0;
  molecule.qx = Math.cos(psi / 2);
  molecule.qy = Math.sin(psi / 2);
  molecule.qz = 0;
  molecule.vib = 0.07;
  removeAdsorbate(catalyst, adsorbate);
  addEffect(state, "release", molecule.x, molecule.y);
  recordEvent(state, "desorbNH3");
}

// A gas molecule touching the particle adsorbs if it finds free sites nearby:
// N2 and H2 dissociate across two neighbouring hollows, NH3 sits on one.
function tryAdsorb(molecule, catalyst, state, random) {
  if (random() > KINETICS.stick[molecule.species]) return false;
  const contact = toLocal(catalyst, molecule.x, molecule.y);
  const reach = CATALYST.reach * catalyst.scale;
  const sites = catalyst.sites;
  const atoms = projectAtoms(molecule).map((atom) => ({
    ...atom,
    ...toLocal(catalyst, molecule.x + atom.x, molecule.y + atom.y)
  }));

  if (molecule.species === "NH3") {
    let best = -1;
    let bestDist = reach;
    for (let i = 0; i < sites.length; i += 1) {
      if (sites[i].occupant || !siteAcceptsNitrogen(catalyst, i, 3)) continue;
      const dist = Math.hypot(sites[i].lx - contact.x, sites[i].ly - contact.y);
      if (dist < bestDist) {
        best = i;
        bestDist = dist;
      }
    }
    if (best < 0) return false;
    const nitrogen = atoms[0];
    const adsorbate = addAdsorbate(catalyst, "N", best, nitrogen.x, nitrogen.y);
    adsorbate.h = 3;
    adsorbate.hs = atoms.slice(1).map((atom) => ({
      x: (atom.x - nitrogen.x) / catalyst.scale,
      y: (atom.y - nitrogen.y) / catalyst.scale
    }));
    // Order the hydrogens counter-clockwise from the first so each eases to
    // the nearest position of the surface geometry.
    adsorbate.phi = Math.atan2(adsorbate.hs[0].y, adsorbate.hs[0].x);
    const turn = (h) => (Math.atan2(h.y, h.x) - adsorbate.phi + TAU * 2) % TAU;
    adsorbate.hs.sort((p, q) => turn(p) - turn(q));
    molecule.dead = true;
    recordEvent(state, "adsorbNH3");
    return true;
  }

  const isNitrogen = molecule.species === "N2";
  let pair = null;
  let bestDist = reach;
  for (let i = 0; i < sites.length; i += 1) {
    if (sites[i].occupant) continue;
    for (const j of sites[i].neighbors) {
      if (j < i || sites[j].occupant) continue;
      if (
        isNitrogen &&
        !(siteAcceptsNitrogen(catalyst, i, 0) && siteAcceptsNitrogen(catalyst, j, 0))
      ) {
        continue;
      }
      const dist = Math.hypot(
        (sites[i].lx + sites[j].lx) / 2 - contact.x,
        (sites[i].ly + sites[j].ly) / 2 - contact.y
      );
      if (dist < bestDist) {
        pair = [i, j];
        bestDist = dist;
      }
    }
  }
  if (!pair) return false;

  // Send each atom to the nearer of the two sites.
  const span = (atom, index) => Math.hypot(atom.x - sites[index].lx, atom.y - sites[index].ly);
  if (
    span(atoms[0], pair[0]) + span(atoms[1], pair[1]) >
    span(atoms[0], pair[1]) + span(atoms[1], pair[0])
  ) {
    pair.reverse();
  }
  const el = isNitrogen ? "N" : "H";
  const first = addAdsorbate(catalyst, el, pair[0], atoms[0].x, atoms[0].y);
  const second = addAdsorbate(catalyst, el, pair[1], atoms[1].x, atoms[1].y);
  catalyst.ghosts.push({ a: first, b: second, order: isNitrogen ? 3 : 1, life: 1 });
  molecule.dead = true;
  recordEvent(state, isNitrogen ? "adsorbN2" : "adsorbH2");
  return true;
}

function collideWithCatalyst(molecule, catalyst, state, random) {
  const reach = catalyst.radius + molecule.radius;
  const dx = molecule.x - catalyst.x;
  const dy = molecule.y - catalyst.y;
  const distance = Math.hypot(dx, dy);
  const outside = distance > reach;
  if (molecule.passCatalyst === catalyst.id) {
    if (outside) molecule.passCatalyst = 0;
    return;
  }
  if (outside) {
    // Physisorption well: a weak pull on molecules passing close to the metal.
    if (distance < reach + CATALYST.pullRange * catalyst.scale) {
      const pull = (CATALYST.pull * state.stepMs) / distance;
      molecule.vx -= dx * pull;
      molecule.vy -= dy * pull;
    }
    return;
  }

  // Narrow phase against the individual surface atoms: deepest contact wins.
  const minDist = catalyst.atomRadius + molecule.radius;
  let depth = 0;
  let nx = 0;
  let ny = 0;
  for (const atom of catalyst.atoms) {
    const position = toWorld(catalyst, atom.lx, atom.ly);
    const ax = molecule.x - position.x;
    const ay = molecule.y - position.y;
    const dist = Math.hypot(ax, ay);
    if (dist > 0 && minDist - dist > depth) {
      depth = minDist - dist;
      nx = ax / dist;
      ny = ay / dist;
    }
  }
  if (depth === 0) return;
  if (tryAdsorb(molecule, catalyst, state, random)) return;

  molecule.x += nx * depth;
  molecule.y += ny * depth;
  const vn = (molecule.vx - catalyst.vx) * nx + (molecule.vy - catalyst.vy) * ny;
  if (vn >= 0) return;
  const impulse = (-2 * vn) / (1 / molecule.mass + 1 / catalyst.mass);
  molecule.vx += (impulse / molecule.mass) * nx;
  molecule.vy += (impulse / molecule.mass) * ny;
  catalyst.vx -= (impulse / catalyst.mass) * nx;
  catalyst.vy -= (impulse / catalyst.mass) * ny;
}

function stepCatalystMotion(catalyst, state, deltaMs, frameScale, random) {
  pointerHeat(catalyst, state, frameScale);
  catalyst.vx += (catalyst.homeX - catalyst.x) * CATALYST.spring * deltaMs;
  catalyst.vy += (catalyst.homeY - catalyst.y) * CATALYST.spring * deltaMs;
  const kick = CATALYST.wander * Math.sqrt(deltaMs);
  catalyst.vx += gauss(random) * kick;
  catalyst.vy += gauss(random) * kick;
  const drag = Math.exp(-CATALYST.damping * deltaMs);
  catalyst.vx *= drag;
  catalyst.vy *= drag;
  catalyst.x += catalyst.vx * deltaMs;
  catalyst.y += catalyst.vy * deltaMs;
  catalyst.angle += catalyst.spin * deltaMs;
  catalyst.cos = Math.cos(catalyst.angle);
  catalyst.sin = Math.sin(catalyst.angle);
}

function hop(catalyst, adsorbate, random) {
  const options = catalyst.sites[adsorbate.site].neighbors.filter(
    (index) =>
      !catalyst.sites[index].occupant &&
      (adsorbate.el !== "N" || siteAcceptsNitrogen(catalyst, index, adsorbate.h, adsorbate))
  );
  if (!options.length) return;
  const target = options[Math.floor(random() * options.length)];
  catalyst.sites[adsorbate.site].occupant = null;
  catalyst.sites[target].occupant = adsorbate;
  adsorbate.site = target;
}

// One time step of surface chemistry on a particle. Each elementary step fires
// with probability rate × Δt, scaled by its Arrhenius factor.
export function stepSurface(catalyst, state, deltaMs, random) {
  const temperature = 1 + catalyst.heat * THERMAL.heatToTemp;
  const chance = (step) => step.rate * arrhenius(step.ea, temperature) * deltaMs;
  const hopFactor = arrhenius(KINETICS.hop.ea, temperature) * deltaMs;
  const sites = catalyst.sites;

  // Ease every adsorbate (and the hydrogens it carries) toward its place.
  const ease = 1 - Math.exp(-deltaMs / KINETICS.settleMs);
  for (const adsorbate of catalyst.adsorbates) {
    const site = sites[adsorbate.site];
    adsorbate.lx += (site.lx - adsorbate.lx) * ease;
    adsorbate.ly += (site.ly - adsorbate.ly) * ease;
    adsorbate.hs.forEach((h, index) => {
      const target = substituentTarget(adsorbate, index);
      h.x += (target.x - h.x) * ease;
      h.y += (target.y - h.y) * ease;
    });
  }
  for (const ghost of catalyst.ghosts) ghost.life -= deltaMs / KINETICS.ghostBondMs;

  for (const adsorbate of [...catalyst.adsorbates]) {
    if (adsorbate.dead || !isSettled(catalyst, adsorbate)) continue;
    const neighbors = sites[adsorbate.site].neighbors;
    const settledNeighbor = (test) =>
      neighbors
        .map((index) => sites[index].occupant)
        .filter((other) => other && !other.dead && test(other) && isSettled(catalyst, other));

    if (adsorbate.el === "H") {
      // H* + H* → H2(g)
      const partners = settledNeighbor((other) => other.el === "H");
      if (partners.length && random() < chance(KINETICS.recombineH) * partners.length * 0.5) {
        const partner = partners[Math.floor(random() * partners.length)];
        desorbDiatomic(state, catalyst, adsorbate, partner, random);
        continue;
      }
      if (random() < KINETICS.hop.H * hopFactor) hop(catalyst, adsorbate, random);
      continue;
    }

    // NH3* → NH3(g)
    if (adsorbate.h === 3 && random() < chance(KINETICS.desorbNH3)) {
      desorbAmmonia(state, catalyst, adsorbate, random);
      continue;
    }

    // NHx* + H* → NHx+1* + *
    if (adsorbate.h < 3) {
      const hydrogens = settledNeighbor((other) => other.el === "H");
      if (hydrogens.length && random() < chance(KINETICS.hydrogenate) * hydrogens.length) {
        const hydrogen = hydrogens[Math.floor(random() * hydrogens.length)];
        const offset = {
          x: (hydrogen.lx - adsorbate.lx) / catalyst.scale,
          y: (hydrogen.ly - adsorbate.ly) / catalyst.scale
        };
        if (adsorbate.h === 0) adsorbate.phi = Math.atan2(offset.y, offset.x);
        adsorbate.hs.push(offset);
        adsorbate.h += 1;
        removeAdsorbate(catalyst, hydrogen);
        const at = toWorld(catalyst, adsorbate.lx, adsorbate.ly);
        addEffect(state, "bond", at.x, at.y);
        recordEvent(state, "hydrogenate");
        continue;
      }
    }

    // NHx* + * → NHx-1* + H*
    if (adsorbate.h > 0 && random() < chance(KINETICS.dehydrogenate)) {
      const free = neighbors.filter((index) => !sites[index].occupant);
      if (free.length) {
        const leaving = adsorbate.hs.pop();
        adsorbate.h -= 1;
        addAdsorbate(
          catalyst,
          "H",
          free[Math.floor(random() * free.length)],
          adsorbate.lx + leaving.x * catalyst.scale,
          adsorbate.ly + leaving.y * catalyst.scale
        );
        recordEvent(state, "dehydrogenate");
        continue;
      }
    }

    if (adsorbate.h === 0) {
      // N* + N* → N2(g)
      const partners = settledNeighbor((other) => other.el === "N" && other.h === 0);
      if (partners.length && random() < chance(KINETICS.recombineN) * 0.5) {
        desorbDiatomic(state, catalyst, adsorbate, partners[0], random);
        continue;
      }
    }
    if (adsorbate.h < 3 && random() < KINETICS.hop.N * hopFactor) hop(catalyst, adsorbate, random);
  }

  catalyst.adsorbates = catalyst.adsorbates.filter((adsorbate) => !adsorbate.dead);
  catalyst.ghosts = catalyst.ghosts.filter(
    (ghost) => ghost.life > 0 && !ghost.a.dead && !ghost.b.dead
  );
}

// --- Bookkeeping -----------------------------------------------------------

// Count every N and H atom in the gas and on the surfaces. Reactions only move
// atoms between the two, so this is invariant for the life of a simulation.
export function atomInventory(state) {
  const inventory = { N: 0, H: 0 };
  for (const molecule of state.molecules) {
    if (molecule.dead) continue;
    const formula = SPECIES[molecule.species].formula;
    for (const el in formula) inventory[el] += formula[el];
  }
  for (const catalyst of state.catalysts) {
    for (const adsorbate of catalyst.adsorbates) {
      if (adsorbate.dead) continue;
      inventory[adsorbate.el] += 1;
      inventory.H += adsorbate.h;
    }
  }
  return inventory;
}

export function gasCounts(state) {
  const counts = { N2: 0, H2: 0, NH3: 0 };
  for (const molecule of state.molecules) counts[molecule.species] += 1;
  return counts;
}

// --- Setup -----------------------------------------------------------------

function pickSpecies(random) {
  let roll = random();
  for (const species in GAS_MIX) {
    roll -= GAS_MIX[species];
    if (roll <= 0) return species;
  }
  return "H2";
}

// Home positions for the iron particles: clear of the page content where the
// viewport allows, and spread apart from one another.
function placeCatalysts(state, tierName, random) {
  const tier = MOLECULE_DENSITY[tierName];
  const shapes = CATALYST.shapes[tierName];
  const catalysts = [];
  for (let i = 0; i < tier.catalysts; i += 1) {
    const rows = shapes[i % shapes.length];
    const size = buildCatalystGeometry(rows, tier.scale).radius;
    let best = null;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const x = lerp(size * 0.9, state.width - size * 0.9, random());
      const y = lerp(size + 56, state.height - size * 0.9, random());
      let spacing = Infinity;
      for (const other of catalysts) {
        spacing = Math.min(spacing, Math.hypot(x - other.homeX, y - other.homeY));
      }
      const score =
        contentClearance(state, x, size) * 2 +
        Math.min(1, spacing / (Math.max(state.width, state.height) * 0.6)) * 1.5;
      if (!best || score > best.score) best = { x, y, score };
    }
    catalysts.push(createCatalyst(rows, best.x, best.y, tier.scale, random));
  }
  return catalysts;
}

// Start each surface part-way through the mechanism so the first frame (and
// the reduced-motion still) already shows adsorbed intermediates.
function seedSurface(catalyst, random) {
  const order = catalyst.sites.map((_, index) => index).sort(() => random() - 0.5);
  let nitrogenPlaced = 0;
  let hydrogenPlaced = 0;
  for (const index of order) {
    if (catalyst.sites[index].occupant) continue;
    if (nitrogenPlaced < 2 && siteAcceptsNitrogen(catalyst, index, 1)) {
      const adsorbate = addAdsorbate(catalyst, "N", index);
      adsorbate.h = nitrogenPlaced; // one bare N*, one NH*
      adsorbate.phi = random() * TAU;
      for (let k = 0; k < adsorbate.h; k += 1) adsorbate.hs.push(substituentTarget(adsorbate, k));
      nitrogenPlaced += 1;
    } else if (hydrogenPlaced < 2) {
      addAdsorbate(catalyst, "H", index);
      hydrogenPlaced += 1;
    }
  }
}

// Out-of-focus molecules in front of and behind the reaction plane. They only
// drift and tumble — depth cues, not part of the chemistry.
function createAmbient(state, tier, random) {
  const ambient = [];
  const layers = [
    { depth: "far", count: tier.far, scale: 0.6, speed: 0.5, alpha: [0.26, 0.42] },
    { depth: "near", count: tier.near, scale: 2.7, speed: 0.9, alpha: [0.1, 0.16] }
  ];
  for (const layer of layers) {
    for (let i = 0; i < layer.count; i += 1) {
      const scale = tier.scale * layer.scale;
      const molecule = createGasMolecule(
        pickSpecies(random),
        random() * state.width,
        random() * state.height,
        scale,
        random
      );
      // Keep parallax speeds proportional to apparent size, not to px scale.
      const speed = layer.speed / layer.scale;
      molecule.vx *= speed;
      molecule.vy *= speed;
      molecule.depth = layer.depth;
      molecule.alpha = lerp(layer.alpha[0], layer.alpha[1], random());
      ambient.push(molecule);
    }
  }
  return ambient;
}

export function createMolecules(state) {
  const tierName = viewportTierName(state);
  const tier = viewportTier(state);
  const random = seededRandom((state.seed || 0) ^ Math.floor(state.width * 13 + state.height * 17));
  const total = clamp(
    Math.floor((state.width * state.height) / tier.areaPerMolecule),
    tier.min,
    tier.max
  );

  state.chemistry = { random, events: {} };
  state.effects = [];
  state.catalysts = placeCatalysts(state, tierName, random);
  for (const catalyst of state.catalysts) seedSurface(catalyst, random);

  const molecules = [];
  for (let i = 0; i < total; i += 1) {
    const species = pickSpecies(random);
    const margin = SPECIES[species].collisionRadius * tier.scale;
    let x = 0;
    let y = 0;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      x = lerp(margin, state.width - margin, random());
      y = lerp(margin, state.height - margin, random());
      const clear = state.catalysts.every(
        (catalyst) => Math.hypot(x - catalyst.x, y - catalyst.y) > catalyst.radius + margin
      );
      if (clear) break;
    }
    molecules.push(createGasMolecule(species, x, y, tier.scale, random));
  }

  state.molecules = molecules;
  state.ambient = createAmbient(state, tier, random);
  return molecules;
}

// Keep a running simulation when only the viewport height changes (mobile
// browser chrome sliding away, a color-scheme switch): rescale the particles'
// home positions and let the walls gather any stragglers.
export function refitMolecules(state, previousWidth, previousHeight) {
  const sx = state.width / Math.max(1, previousWidth);
  const sy = state.height / Math.max(1, previousHeight);
  for (const catalyst of state.catalysts) {
    catalyst.homeX *= sx;
    catalyst.homeY *= sy;
    catalyst.x *= sx;
    catalyst.y *= sy;
  }
}

// --- Frame update ----------------------------------------------------------

function stepAmbient(molecule, state, deltaMs) {
  molecule.x += molecule.vx * deltaMs;
  molecule.y += molecule.vy * deltaMs;
  tumble(molecule, deltaMs);
  const margin = molecule.scale * 3;
  if (molecule.x < -margin) molecule.x = state.width + margin;
  else if (molecule.x > state.width + margin) molecule.x = -margin;
  if (molecule.y < -margin) molecule.y = state.height + margin;
  else if (molecule.y > state.height + margin) molecule.y = -margin;
}

export function updateMolecules(state, now, deltaMs = 1000 / 60, { reducedMotion } = {}) {
  if (reducedMotion || !state.chemistry) return;
  const random = state.chemistry.random;
  state.stepMs = deltaMs;
  const frameScale = clamp(deltaMs / (1000 / 60), 0, 8);

  for (const molecule of state.molecules) {
    stepGasMolecule(molecule, state, deltaMs, frameScale, random);
  }
  collideGas(state, random);

  for (const catalyst of state.catalysts) {
    stepCatalystMotion(catalyst, state, deltaMs, frameScale, random);
    // Collisions can adsorb (remove) molecules and desorption appends new
    // ones, so walk a snapshot and sweep the dead afterwards.
    for (const molecule of [...state.molecules]) {
      if (!molecule.dead) collideWithCatalyst(molecule, catalyst, state, random);
    }
    stepSurface(catalyst, state, deltaMs, random);
  }
  state.molecules = state.molecules.filter((molecule) => !molecule.dead);
  for (const molecule of state.molecules) reflectWalls(molecule, state);

  for (const molecule of state.ambient) stepAmbient(molecule, state, deltaMs);

  for (const effect of state.effects) effect.age += deltaMs;
  state.effects = state.effects.filter((effect) => effect.age < effect.duration);
  state.pointer.influence *= Math.pow(POINTER.decay, frameScale);
}
