import {
  CHEM,
  COLLISION,
  DEPTH_BANDS,
  ELEMENT_ATOM_SCALE,
  ELEMENTS,
  MOLECULE_DENSITY,
  PALETTE_KEYS,
  POINTER,
  SPECIES,
  THERMAL
} from "./config.js?v=ballstick-haber-2fb700c3";
import {
  drawMembraneBand,
  traceOrganicMass,
  traceSquigglePath
} from "./geometry.js?v=ballstick-haber-2fb700c3";
import { clamp, lerp, seededRandom, smoothstep } from "./random.js?v=ballstick-haber-2fb700c3";
import { drawWatercolorShape } from "./watercolor.js?v=ballstick-haber-2fb700c3";

function viewportTier(state) {
  if (state.width < 620) return MOLECULE_DENSITY.mobile;
  if (state.width < 1040) return MOLECULE_DENSITY.tablet;
  return MOLECULE_DENSITY.desktop;
}

function contentSafeZones(state) {
  const mainWidth = Math.min(1180, Math.max(0, state.width - 32));
  const mainLeft = (state.width - mainWidth) * 0.5;
  const top = state.width < 720 ? 116 : 76;

  if (state.width < 720) {
    return [
      {
        x: 8,
        y: top,
        width: state.width - 16,
        height: Math.min(660, state.height * 0.74),
        factor: 0.28,
        feather: 72
      }
    ];
  }

  if (state.width < 1040) {
    return [
      {
        x: mainLeft,
        y: top,
        width: mainWidth,
        height: Math.min(780, state.height * 0.82),
        factor: 0.34,
        feather: 96
      }
    ];
  }

  return [
    {
      x: mainLeft,
      y: top,
      width: mainWidth * 0.61,
      height: state.height * 0.76,
      factor: 0.3,
      feather: 108
    },
    {
      x: mainLeft + mainWidth * 0.62,
      y: state.height * 0.42,
      width: mainWidth * 0.38,
      height: state.height * 0.42,
      factor: 0.38,
      feather: 92
    }
  ];
}

function zoneInfluence(zone, x, y, radius = 0) {
  const left = zone.x - zone.feather - radius;
  const right = zone.x + zone.width + zone.feather + radius;
  const top = zone.y - zone.feather - radius;
  const bottom = zone.y + zone.height + zone.feather + radius;
  if (x < left || x > right || y < top || y > bottom) return 0;

  const insideX = x >= zone.x - radius && x <= zone.x + zone.width + radius;
  const insideY = y >= zone.y - radius && y <= zone.y + zone.height + radius;
  if (insideX && insideY) return 1;

  const dx = x < zone.x ? zone.x - x : x > zone.x + zone.width ? x - (zone.x + zone.width) : 0;
  const dy = y < zone.y ? zone.y - y : y > zone.y + zone.height ? y - (zone.y + zone.height) : 0;
  return 1 - smoothstep(clamp(Math.hypot(dx, dy) / zone.feather, 0, 1));
}

function contentQuietFactor(state, x, y, radius = 0) {
  let factor = 1;
  for (const zone of contentSafeZones(state)) {
    const influence = zoneInfluence(zone, x, y, radius);
    if (influence > 0) factor = Math.min(factor, lerp(1, zone.factor, influence));
  }
  return factor;
}

function contourColor(isDark) {
  return isDark ? "rgba(255, 247, 221, 0.2)" : "rgba(255, 252, 238, 0.26)";
}

function sedimentColor(isDark) {
  return isDark ? "rgba(10, 12, 9, 0.22)" : "rgba(54, 45, 31, 0.16)";
}

function organicContours(x, y, rx, ry, phase, count = 3) {
  return Array.from({ length: count }, (_, index) => {
    const scale = 0.28 + index * 0.17;
    const offset = (index - (count - 1) * 0.5) * ry * 0.18;
    return (targetCtx) => {
      targetCtx.beginPath();
      targetCtx.ellipse(
        x + Math.cos(phase + index) * rx * 0.08,
        y + offset,
        rx * scale,
        ry * (0.18 + index * 0.035),
        phase * 0.22,
        0,
        Math.PI * 2
      );
    };
  });
}

export function drawProteinBlob(targetCtx, state, spec, options) {
  const palette = state.palette[spec.paletteKey] || state.palette.teal;
  drawWatercolorShape(
    targetCtx,
    (ctx) => traceOrganicMass(ctx, spec.x, spec.y, spec.rx, spec.ry, spec.points || 13, spec.phase),
    {
      fill: palette.fill,
      stroke: palette.stroke,
      contour: contourColor(options.isDark),
      alpha: spec.alpha,
      glazeAlpha: spec.alpha * 0.52,
      glazes: [
        { fill: palette.fill, alpha: spec.alpha * 0.12, x: spec.rx * 0.05, y: -spec.ry * 0.04 },
        {
          fill: spec.glazeFill || palette.stroke,
          alpha: spec.alpha * 0.045,
          x: -spec.rx * 0.04,
          y: spec.ry * 0.04
        }
      ],
      edgeAlpha: spec.edgeAlpha ?? spec.alpha * 1.35,
      lineWidth: spec.lineWidth || 0.95,
      contours: organicContours(spec.x, spec.y, spec.rx, spec.ry, spec.phase, spec.contours || 2),
      granulation: spec.granulation || 0,
      granuleColor: sedimentColor(options.isDark),
      bounds: { x: spec.x, y: spec.y, rx: spec.rx, ry: spec.ry },
      seed: spec.seed
    }
  );
}

function drawCrowdedProteinCluster(targetCtx, state, cluster, options) {
  const random = seededRandom(cluster.seed);
  for (let i = 0; i < cluster.count; i += 1) {
    const angle = random() * Math.PI * 2;
    const distance = cluster.radius * Math.sqrt(random());
    const size = lerp(cluster.size[0], cluster.size[1], random());
    const x = cluster.x + Math.cos(angle) * distance;
    const y = cluster.y + Math.sin(angle) * distance * cluster.flatten;
    const quiet = contentQuietFactor(state, x, y, size);
    if (quiet < 0.46 && random() > quiet * 1.4) continue;
    drawProteinBlob(
      targetCtx,
      state,
      {
        x,
        y,
        rx: size * lerp(0.75, 1.35, random()),
        ry: size * lerp(0.52, 0.95, random()),
        points: 9 + Math.floor(random() * 6),
        phase: random() * Math.PI * 2,
        paletteKey: (cluster.paletteKeys || PALETTE_KEYS)[
          Math.floor(random() * (cluster.paletteKeys || PALETTE_KEYS).length)
        ],
        alpha: lerp(cluster.alpha[0], cluster.alpha[1], random()) * quiet,
        edgeAlpha: lerp(0.08, 0.2, random()),
        contours: random() > 0.55 ? 2 : 1,
        granulation: Math.floor(lerp(5, 13, random())),
        seed: cluster.seed + i * 97
      },
      options
    );
  }
}

function drawNucleicAcidStrand(targetCtx, state, strand, options) {
  targetCtx.save();
  targetCtx.translate(strand.x, strand.y);
  targetCtx.rotate(strand.rotation);
  targetCtx.globalCompositeOperation = "multiply";
  targetCtx.lineCap = "round";
  targetCtx.lineJoin = "round";
  targetCtx.globalAlpha = strand.alpha;
  targetCtx.strokeStyle = state.palette.violet.stroke;
  targetCtx.lineWidth = strand.width;
  traceSquigglePath(targetCtx, 0, 0, strand.length, strand.amplitude, strand.phase, 34);
  targetCtx.stroke();

  targetCtx.globalAlpha = strand.alpha * 0.48;
  targetCtx.strokeStyle = state.palette.blue.stroke;
  traceSquigglePath(
    targetCtx,
    0,
    strand.amplitude * 0.52,
    strand.length,
    strand.amplitude * 0.84,
    strand.phase + 1.8,
    34
  );
  targetCtx.stroke();

  targetCtx.globalAlpha = strand.alpha * 0.6;
  targetCtx.strokeStyle = options.isDark ? "rgba(238, 229, 204, 0.2)" : "rgba(72, 61, 43, 0.2)";
  targetCtx.lineWidth = 0.8;
  for (let i = 2; i < 32; i += 3) {
    const progress = i / 34;
    const px = progress * strand.length;
    const y1 = Math.sin(progress * Math.PI * 2.2 + strand.phase) * strand.amplitude;
    const y2 =
      strand.amplitude * 0.52 +
      Math.sin(progress * Math.PI * 2.2 + strand.phase + 1.8) * strand.amplitude * 0.84;
    targetCtx.beginPath();
    targetCtx.moveTo(px, y1);
    targetCtx.lineTo(px + 2, y2);
    targetCtx.stroke();
  }
  targetCtx.restore();
}

function drawMembraneSection(targetCtx, state, membrane, options) {
  targetCtx.save();
  targetCtx.globalCompositeOperation = "multiply";
  targetCtx.strokeStyle = membrane.stroke;
  targetCtx.globalAlpha = membrane.alpha;
  targetCtx.lineWidth = membrane.lineWidth;
  drawMembraneBand(
    targetCtx,
    membrane.x,
    membrane.y,
    membrane.radius,
    membrane.start,
    membrane.end,
    membrane.gap
  );

  targetCtx.globalAlpha = membrane.alpha * 0.34;
  targetCtx.lineWidth = membrane.lineWidth + membrane.gap * 0.72;
  drawMembraneBand(
    targetCtx,
    membrane.x,
    membrane.y,
    membrane.radius,
    membrane.start,
    membrane.end,
    membrane.gap * 0.18
  );

  targetCtx.globalAlpha = membrane.alpha * 0.72;
  targetCtx.lineWidth = Math.max(0.75, membrane.lineWidth * 0.46);
  drawMembraneBand(
    targetCtx,
    membrane.x,
    membrane.y,
    membrane.radius,
    membrane.start,
    membrane.end,
    membrane.gap * 1.55
  );

  const span = membrane.end - membrane.start;
  const headCount = Math.max(10, Math.floor(Math.abs(span) * membrane.radius * 0.035));
  targetCtx.fillStyle = membrane.headFill;
  for (let i = 0; i <= headCount; i += 1) {
    const angle = membrane.start + (span * i) / headCount;
    for (const offset of [-membrane.gap * 0.5, membrane.gap * 0.5]) {
      targetCtx.globalAlpha = membrane.alpha * 0.55;
      targetCtx.beginPath();
      targetCtx.arc(
        membrane.x + Math.cos(angle) * (membrane.radius + offset),
        membrane.y + Math.sin(angle) * (membrane.radius + offset),
        membrane.headRadius,
        0,
        Math.PI * 2
      );
      targetCtx.fill();
    }
  }
  targetCtx.restore();
}

function drawTransmembraneProtein(targetCtx, state, spec, options) {
  const palette = state.palette[spec.paletteKey] || state.palette.gold;
  drawWatercolorShape(
    targetCtx,
    (ctx) => {
      ctx.beginPath();
      ctx.ellipse(spec.x, spec.y, spec.rx, spec.ry, spec.rotation, 0, Math.PI * 2);
    },
    {
      fill: palette.fill,
      stroke: palette.stroke,
      contour: contourColor(options.isDark),
      alpha: spec.alpha,
      glazeAlpha: spec.alpha * 0.5,
      edgeAlpha: spec.alpha * 1.45,
      lineWidth: 1,
      contours: [
        (ctx) => {
          ctx.beginPath();
          ctx.ellipse(
            spec.x,
            spec.y,
            spec.rx * 0.42,
            spec.ry * 0.78,
            spec.rotation,
            0,
            Math.PI * 2
          );
        }
      ],
      granulation: spec.granulation,
      granuleColor: sedimentColor(options.isDark),
      bounds: { x: spec.x, y: spec.y, rx: spec.rx, ry: spec.ry },
      seed: spec.seed
    }
  );
}

function clusteredPoint(random, state, anchors) {
  const anchor = anchors[Math.floor(random() * anchors.length)];
  const angle = random() * Math.PI * 2;
  const distance = Math.sqrt(random()) * anchor.radius;
  return {
    x: anchor.x + Math.cos(angle) * distance,
    y: anchor.y + Math.sin(angle) * distance * anchor.flatten
  };
}

export function drawStaticBiomolecularField(targetCtx, state, options) {
  const darkFill = options.isDark ? "rgba(2, 8, 8, 0.48)" : "rgba(48, 42, 33, 0.28)";
  const darkStroke = options.isDark ? "rgba(226, 218, 196, 0.08)" : "rgba(54, 48, 37, 0.12)";
  const random = seededRandom(
    (state.seed || 0) ^ (8114 + Math.floor(state.width * 0.4) + Math.floor(state.height * 0.3))
  );
  const density = viewportTier(state);
  const staticScale = density.staticClusterScale;
  const backgroundAnchors = [
    { x: state.width * -0.02, y: state.height * 0.68, radius: state.width * 0.36, flatten: 0.74 },
    { x: state.width * 0.9, y: state.height * 0.2, radius: state.width * 0.34, flatten: 0.58 },
    { x: state.width * 0.78, y: state.height * 0.78, radius: state.width * 0.3, flatten: 0.82 },
    { x: state.width * 0.34, y: state.height * 1.04, radius: state.width * 0.32, flatten: 0.46 }
  ];

  for (let i = 0; i < Math.round(72 * staticScale); i += 1) {
    const point = clusteredPoint(random, state, backgroundAnchors);
    const quiet = contentQuietFactor(state, point.x, point.y, 44);
    if (quiet < 0.42 && random() > quiet * 1.15) continue;
    const mass = {
      x: point.x,
      y: point.y,
      rx: lerp(18, 68, random()) * (random() > 0.78 ? 1.35 : 1),
      ry: lerp(10, 42, random()),
      points: 8 + Math.floor(random() * 6),
      phase: random() * Math.PI * 2
    };
    drawWatercolorShape(
      targetCtx,
      (ctx) => traceOrganicMass(ctx, mass.x, mass.y, mass.rx, mass.ry, mass.points, mass.phase),
      {
        fill: darkFill,
        stroke: darkStroke,
        contour: contourColor(options.isDark),
        alpha: (options.isDark ? 0.13 : 0.09) * quiet,
        glazeAlpha: (options.isDark ? 0.09 : 0.06) * quiet,
        glazes: [
          {
            fill: state.palette.violet.fill,
            alpha: (options.isDark ? 0.018 : 0.014) * quiet,
            x: 2,
            y: -2
          }
        ],
        edgeAlpha: 0.09 * quiet,
        lineWidth: 0.75,
        granulation: 0
      }
    );
  }

  const membranes = [
    {
      x: state.width * 0.06,
      y: state.height * 0.44,
      radius: state.width * 0.48,
      start: -0.72,
      end: 0.74,
      gap: 13,
      alpha: options.isDark ? 0.24 : 0.27,
      lineWidth: 2.8,
      stroke: state.palette.teal.stroke,
      headFill: state.palette.teal.fill,
      headRadius: 2.1
    },
    {
      x: state.width * 0.96,
      y: state.height * 0.92,
      radius: state.width * 0.42,
      start: Math.PI * 1.03,
      end: Math.PI * 1.74,
      gap: 11,
      alpha: options.isDark ? 0.22 : 0.25,
      lineWidth: 2.6,
      stroke: state.palette.rose.stroke,
      headFill: state.palette.rose.fill,
      headRadius: 1.9
    },
    {
      x: state.width * 0.42,
      y: state.height * -0.1,
      radius: state.width * 0.38,
      start: Math.PI * 0.1,
      end: Math.PI * 0.9,
      gap: 10,
      alpha: options.isDark ? 0.12 : 0.15,
      lineWidth: 2.1,
      stroke: state.palette.gold.stroke,
      headFill: state.palette.gold.fill,
      headRadius: 1.65
    }
  ];

  for (const membrane of membranes) drawMembraneSection(targetCtx, state, membrane, options);

  const clusters = [
    {
      x: state.width * 0.14,
      y: state.height * 0.26,
      radius: state.width * 0.16,
      flatten: 0.72,
      count: Math.round(24 * staticScale),
      size: [8, 24],
      alpha: [0.08, 0.19],
      paletteKeys: ["blue", "teal", "violet"],
      seed: 1407
    },
    {
      x: state.width * 0.78,
      y: state.height * 0.58,
      radius: state.width * 0.19,
      flatten: 0.86,
      count: Math.round(34 * staticScale),
      size: [7, 22],
      alpha: [0.08, 0.18],
      paletteKeys: ["rose", "gold", "teal"],
      seed: 2618
    },
    {
      x: state.width * 0.34,
      y: state.height * 0.84,
      radius: state.width * 0.17,
      flatten: 0.58,
      count: Math.round(22 * staticScale),
      size: [9, 26],
      alpha: [0.07, 0.16],
      paletteKeys: ["gold", "violet", "blue"],
      seed: 3912
    },
    {
      x: state.width * 0.98,
      y: state.height * 0.36,
      radius: state.width * 0.12,
      flatten: 1.2,
      count: Math.round(18 * staticScale),
      size: [8, 20],
      alpha: [0.07, 0.15],
      paletteKeys: ["teal", "blue"],
      seed: 5108
    }
  ];
  for (const cluster of clusters) drawCrowdedProteinCluster(targetCtx, state, cluster, options);

  const strands = [
    {
      x: state.width * 0.06,
      y: state.height * 0.64,
      length: state.width * 0.34,
      amplitude: 11,
      rotation: -0.18,
      phase: 0.6,
      alpha: options.isDark ? 0.15 : 0.18,
      width: 1.8
    },
    {
      x: state.width * 0.52,
      y: state.height * 0.18,
      length: state.width * 0.28,
      amplitude: 9,
      rotation: 0.26,
      phase: 2.8,
      alpha: options.isDark ? 0.14 : 0.16,
      width: 1.5
    },
    {
      x: state.width * 0.62,
      y: state.height * 0.82,
      length: state.width * 0.32,
      amplitude: 10,
      rotation: -0.42,
      phase: 4.1,
      alpha: options.isDark ? 0.13 : 0.15,
      width: 1.6
    }
  ];
  for (const strand of strands) drawNucleicAcidStrand(targetCtx, state, strand, options);

  for (const membrane of membranes) {
    for (let i = 0; i < 4; i += 1) {
      const angle = lerp(membrane.start + 0.08, membrane.end - 0.08, (i + 0.35) / 4.6);
      drawTransmembraneProtein(
        targetCtx,
        state,
        {
          x: membrane.x + Math.cos(angle) * membrane.radius,
          y: membrane.y + Math.sin(angle) * membrane.radius,
          rx: 7 + i * 1.8,
          ry: 25 + i * 2.2,
          rotation: angle + Math.PI * 0.5,
          paletteKey: i % 2 ? "gold" : "blue",
          alpha: options.isDark ? 0.17 : 0.2,
          granulation: 8,
          seed: 6200 + i * 31
        },
        options
      );
    }
  }
}

export function drawStaticForegroundForms(targetCtx, state, options) {
  const forms = [
    {
      x: state.width * 0.03,
      y: state.height * 0.88,
      rx: state.width * 0.16,
      ry: state.height * 0.12,
      paletteKey: "teal",
      phase: 0.8,
      alpha: options.isDark ? 0.13 : 0.16,
      seed: 771
    },
    {
      x: state.width * 0.92,
      y: state.height * 0.1,
      rx: state.width * 0.15,
      ry: state.height * 0.1,
      paletteKey: "violet",
      phase: 2.7,
      alpha: options.isDark ? 0.12 : 0.15,
      seed: 977
    },
    {
      x: state.width * 0.82,
      y: state.height * 0.96,
      rx: state.width * 0.18,
      ry: state.height * 0.1,
      paletteKey: "rose",
      phase: 4.2,
      alpha: options.isDark ? 0.11 : 0.14,
      seed: 1201
    }
  ];

  for (const form of forms) {
    drawProteinBlob(
      targetCtx,
      state,
      {
        ...form,
        points: 17,
        contours: 4,
        edgeAlpha: form.alpha * 1.1,
        lineWidth: 1.25,
        granulation: 38
      },
      options
    );
  }
}

// ===========================================================================
// Animated overlay: ball-and-stick molecules, elastic collisions, and a
// catalysed reaction at equilibrium — the Haber process N2 + 3H2 ⇌ 2NH3 over
// an iron catalyst. The molecule shapes, element colors, and reaction live in
// config.js (ELEMENTS / SPECIES); everything below is reaction-agnostic.
// ===========================================================================

let moleculeUid = 0;

function pickMoleculeFamily(random) {
  // Weighted by SPECIES[*].weight so the field spawns near a lively mixture.
  let total = 0;
  for (const key in SPECIES) total += SPECIES[key].weight;
  let roll = random() * total;
  for (const key in SPECIES) {
    roll -= SPECIES[key].weight;
    if (roll <= 0) return key;
  }
  return "substrate-b";
}

// Resolve a SPECIES entry into a concrete molecule: atom positions and radii in
// pixels (scaled by `radius`) plus the true visual extent (`boundingRadius`),
// which doubles as the collision radius so physics matches what is drawn.
function createReactionMoleculeShape(random, radius, forceFamily = null) {
  const family = forceFamily || pickMoleculeFamily(random);
  const spec = SPECIES[family];
  const jitter = (amount) => lerp(-amount, amount, random());
  let boundingRadius = radius * 0.4;

  const atoms = spec.atoms.map((atom) => {
    const element = ELEMENTS[atom.el];
    const ar = element.radius * ELEMENT_ATOM_SCALE * radius * lerp(0.97, 1.03, random());
    const ax = atom.x * radius + jitter(radius * 0.015);
    const ay = atom.y * radius + jitter(radius * 0.015);
    boundingRadius = Math.max(boundingRadius, Math.hypot(ax, ay) + ar);
    return { el: atom.el, x: ax, y: ay, r: ar };
  });

  return {
    family,
    paletteKey: spec.paletteKey,
    role: spec.role,
    atoms,
    bonds: spec.bonds.map((bond) => ({ a: bond.a, b: bond.b, order: bond.order })),
    boundingRadius
  };
}

// Re-stamp a live molecule with a new shape (used when a reaction transmutes a
// molecule in place — the array length never changes, so populations stay fixed).
function applyMoleculeShape(molecule, shape) {
  molecule.paletteKey = shape.paletteKey;
  molecule.family = shape.family;
  molecule.role = shape.role;
  molecule.atoms = shape.atoms;
  molecule.bonds = shape.bonds;
  molecule.radius = shape.boundingRadius;
  molecule.adsorbed = null;
  return molecule;
}

function placeMolecule(molecule, x, y) {
  molecule.x = x;
  molecule.y = y;
}

function steerToward(molecule, x, y, speed) {
  const dx = x - molecule.x;
  const dy = y - molecule.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  molecule.velocityX = (dx / distance) * speed;
  molecule.velocityY = (dy / distance) * speed;
}

function countRole(state, role) {
  let n = 0;
  for (const molecule of state.molecules) if (molecule.role === role) n += 1;
  return n;
}

// Seed a few reactant + catalyst clusters so the first reactions fire quickly
// instead of waiting on chance encounters in a sparse field.
function seedReactiveClusters(molecules, state, random) {
  const reactantsA = molecules.filter((m) => m.role === "reactantA");
  const reactantsB = molecules.filter((m) => m.role === "reactantB");
  const catalysts = molecules.filter((m) => m.role === "catalyst");
  const clusters = Math.min(
    state.width < 620 ? 1 : state.width < 1040 ? 2 : 3,
    reactantsA.length,
    reactantsB.length,
    catalysts.length
  );

  for (let i = 0; i < clusters; i += 1) {
    const a = reactantsA[i];
    const b = reactantsB[i];
    const c = catalysts[i];

    let centerX = lerp(state.width * 0.2, state.width * 0.8, random());
    let centerY = lerp(state.height * 0.2, state.height * 0.8, random());
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const x = lerp(state.width * 0.14, state.width * 0.86, random());
      const y = lerp(state.height * 0.16, state.height * 0.84, random());
      if (contentQuietFactor(state, x, y, 72) > 0.46) {
        centerX = x;
        centerY = y;
        break;
      }
    }

    placeMolecule(c, centerX, centerY);
    const spread = lerp(46, 78, random());
    placeMolecule(a, centerX - spread, centerY + lerp(-12, 12, random()));
    placeMolecule(b, centerX + spread, centerY + lerp(-12, 12, random()));
    steerToward(a, centerX, centerY, lerp(0.012, 0.022, random()));
    steerToward(b, centerX, centerY, lerp(0.012, 0.022, random()));
  }
}

function freshChemistryState(state) {
  return {
    random: seededRandom(
      (state.seed || 0) ^ Math.floor(state.width * 31 + state.height * 37) ^ 0x51a7
    ),
    nextId: 1,
    forwardCooldownMs: 0,
    reverseCooldownMs: 0
  };
}

export function createMolecules(state) {
  const area = state.width * state.height;
  const density = viewportTier(state);
  const total = clamp(
    Math.floor(area / density.overlayAreaPerMolecule),
    density.overlayMin,
    density.overlayMax
  );
  const random = seededRandom((state.seed || 0) ^ Math.floor(state.width * 13 + state.height * 17));
  const molecules = [];
  const flowAnchors = [
    { x: state.width * 0.08, y: state.height * 0.64, radius: state.width * 0.28, flatten: 0.9 },
    { x: state.width * 0.84, y: state.height * 0.28, radius: state.width * 0.28, flatten: 0.72 },
    { x: state.width * 0.72, y: state.height * 0.78, radius: state.width * 0.26, flatten: 0.68 },
    { x: state.width * 0.3, y: state.height * 0.96, radius: state.width * 0.22, flatten: 0.52 }
  ];

  for (const band of DEPTH_BANDS) {
    const count = Math.max(6, Math.round(total * band.count));
    for (let i = 0; i < count; i += 1) {
      const nominalRadius = lerp(band.radius[0], band.radius[1], random()) * band.scale;
      const shape = createReactionMoleculeShape(random, nominalRadius);

      let x = random() * state.width;
      let y = random() * state.height;
      for (let attempt = 0; attempt < 7; attempt += 1) {
        const point = clusteredPoint(random, state, flowAnchors);
        x = point.x;
        y = point.y;
        if (contentQuietFactor(state, x, y, shape.boundingRadius) > 0.54 || random() < 0.18) break;
      }
      const quiet = contentQuietFactor(state, x, y, shape.boundingRadius);
      const speedRange =
        band.name === "background"
          ? [0.004, 0.011]
          : band.name === "midground"
            ? [0.008, 0.019]
            : [0.013, 0.028];
      const speed = lerp(speedRange[0], speedRange[1], random());
      const angle = random() * Math.PI * 2;

      molecules.push({
        uid: moleculeUid++,
        band,
        x,
        y,
        nominalRadius,
        radius: shape.boundingRadius,
        paletteKey: shape.paletteKey,
        family: shape.family,
        role: shape.role,
        atoms: shape.atoms,
        bonds: shape.bonds,
        phase: random() * Math.PI * 2,
        rotation: random() * Math.PI * 2,
        spin: lerp(-0.00009, 0.00009, random()),
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        alpha: lerp(band.alpha[0], band.alpha[1], random()) * lerp(0.72, 1, quiet),
        heat: 0,
        reactionOpacity: 1,
        renderScale: 1,
        adsorbed: null
      });
    }
  }

  state.molecules = molecules;
  state.chemistry = freshChemistryState(state);
  seedReactiveClusters(molecules, state, random);
  return molecules;
}

function timeScaledLerp(current, target, amount, frameScale) {
  return lerp(current, target, 1 - Math.pow(1 - amount, frameScale));
}

// --- Physics -------------------------------------------------------------

// Bounce a molecule off the viewport edges (the reaction "vessel").
function reflectWalls(molecule, state) {
  const r = molecule.radius;
  const e = COLLISION.wallRestitution;
  if (molecule.x < r) {
    molecule.x = r;
    molecule.velocityX = Math.abs(molecule.velocityX) * e;
  } else if (molecule.x > state.width - r) {
    molecule.x = state.width - r;
    molecule.velocityX = -Math.abs(molecule.velocityX) * e;
  }
  if (molecule.y < r) {
    molecule.y = r;
    molecule.velocityY = Math.abs(molecule.velocityY) * e;
  } else if (molecule.y > state.height - r) {
    molecule.y = state.height - r;
    molecule.velocityY = -Math.abs(molecule.velocityY) * e;
  }
}

// Broad phase: a uniform spatial-hash grid keeps pair tests O(n). Each unordered
// pair is visited once (n.uid > m.uid); narrow phase + reactions in interactPair.
function resolveCollisions(state, now) {
  const cell = COLLISION.cellSize;
  const grid = new Map();
  for (const molecule of state.molecules) {
    const cx = Math.floor(molecule.x / cell);
    const cy = Math.floor(molecule.y / cell);
    molecule._cx = cx;
    molecule._cy = cy;
    const key = cx + "," + cy;
    let bucket = grid.get(key);
    if (!bucket) grid.set(key, (bucket = []));
    bucket.push(molecule);
  }

  for (const molecule of state.molecules) {
    for (let ox = -1; ox <= 1; ox += 1) {
      for (let oy = -1; oy <= 1; oy += 1) {
        const bucket = grid.get(molecule._cx + ox + "," + (molecule._cy + oy));
        if (!bucket) continue;
        for (const other of bucket) {
          if (other.uid <= molecule.uid) continue;
          interactPair(molecule, other, state, now);
        }
      }
    }
  }

  // Baseline speed cap for calm, elegant motion (heat can still burst harder),
  // and a final wall clamp so de-overlap pushes and reaction nudges never leave
  // a molecule outside the vessel for a frame.
  const cap = COLLISION.maxSpeed;
  for (const molecule of state.molecules) {
    const sp = Math.hypot(molecule.velocityX, molecule.velocityY);
    if (sp > cap) {
      const k = cap / sp;
      molecule.velocityX *= k;
      molecule.velocityY *= k;
    }
    reflectWalls(molecule, state);
  }
}

// Narrow phase for one pair: gentle catalyst attraction at range, elastic
// impulse on overlap, and a reaction attempt on contact.
function interactPair(a, b, state, now) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return;
  const minDist = a.radius + b.radius;

  const catalyst = a.role === "catalyst" ? a : b.role === "catalyst" ? b : null;
  if (catalyst) {
    const other = catalyst === a ? b : a;
    if (
      (other.role === "reactantA" || other.role === "reactantB") &&
      dist < COLLISION.catalystPullRadius &&
      dist > minDist
    ) {
      const pull = COLLISION.catalystPull * state.lastDeltaMs;
      other.velocityX += ((catalyst.x - other.x) / dist) * pull;
      other.velocityY += ((catalyst.y - other.y) / dist) * pull;
    }
  }

  if (dist >= minDist) return;

  const nx = dx / dist;
  const ny = dy / dist;
  const ma = a.radius * a.radius;
  const mb = b.radius * b.radius;
  const totalM = ma + mb;

  // Positional de-overlap, split by inverse mass.
  const overlap = minDist - dist;
  a.x -= nx * overlap * (mb / totalM);
  a.y -= ny * overlap * (mb / totalM);
  b.x += nx * overlap * (ma / totalM);
  b.y += ny * overlap * (ma / totalM);

  // Impulse response along the contact normal (only if approaching).
  const vn = (b.velocityX - a.velocityX) * nx + (b.velocityY - a.velocityY) * ny;
  if (vn < 0) {
    const j = (-(1 + COLLISION.restitution) * vn) / (1 / ma + 1 / mb);
    a.velocityX -= (j / ma) * nx;
    a.velocityY -= (j / ma) * ny;
    b.velocityX += (j / mb) * nx;
    b.velocityY += (j / mb) * ny;
  }

  tryReactionOnContact(a, b, state, now);
}

// --- Reaction chemistry --------------------------------------------------

function adsorbReactant(catalyst, reactant, now) {
  if (!catalyst.adsorbed) catalyst.adsorbed = { A: null, B: null, tA: 0, tB: 0 };
  if (reactant.role === "reactantA") {
    catalyst.adsorbed.A = reactant;
    catalyst.adsorbed.tA = now;
  } else {
    catalyst.adsorbed.B = reactant;
    catalyst.adsorbed.tB = now;
  }
}

function tryReactionOnContact(a, b, state, now) {
  const catalyst = a.role === "catalyst" ? a : b.role === "catalyst" ? b : null;
  if (!catalyst) return;
  const other = catalyst === a ? b : a;
  if (other.role === "catalyst") return;

  if (other.role === "reactantA" || other.role === "reactantB") {
    adsorbReactant(catalyst, other, now);
    maybeFireForward(catalyst, state, now);
  } else if (other.role === "product") {
    maybeFireReverse(other, catalyst, state);
  }
}

function scarceReactantFamily(state) {
  return countRole(state, "reactantA") <= countRole(state, "reactantB")
    ? "substrate-a"
    : "substrate-b";
}

// Reposition a freshly minted reactant just off the catalyst with a random kick
// so it doesn't immediately re-adsorb.
function nudgeReactantAway(molecule, catalyst, random) {
  const dx = molecule.x - catalyst.x;
  const dy = molecule.y - catalyst.y;
  const d = Math.max(1, Math.hypot(dx, dy));
  const push = catalyst.radius + molecule.radius + 6;
  molecule.x = catalyst.x + (dx / d) * push;
  molecule.y = catalyst.y + (dy / d) * push;
  const speed = lerp(0.012, 0.026, random());
  const angle = random() * Math.PI * 2;
  molecule.velocityX = Math.cos(angle) * speed;
  molecule.velocityY = Math.sin(angle) * speed;
}

// Brief heat + opacity "pop" on the molecules taking part in a reaction.
function flashReaction(molecules) {
  for (const molecule of molecules) {
    const factor = molecule.role === "catalyst" ? 0.6 : 1;
    molecule.heat = Math.max(molecule.heat, CHEM.flashHeat * factor);
    molecule.reactionOpacity = CHEM.flashOpacity;
    molecule.renderScale = 1.28;
  }
}

// Forward: N2 + H2 →(Fe) NH3. Requires one of each reactant adsorbed on the same
// catalyst within the adsorption window. Net effect: one reactant becomes the
// product, the other is recycled into the scarcer reactant (population fixed).
function maybeFireForward(catalyst, state, now) {
  const chem = state.chemistry;
  if (chem.forwardCooldownMs > 0) return;
  const slot = catalyst.adsorbed;
  if (!slot) return;
  const A = slot.A;
  const B = slot.B;
  if (!A || !B) return;
  if (A.role !== "reactantA" || B.role !== "reactantB") return;
  if (now - slot.tA > CHEM.adsorbWindowMs || now - slot.tB > CHEM.adsorbWindowMs) return;

  const random = chem.random;
  const ma = A.radius * A.radius;
  const mb = B.radius * B.radius;
  const px = A.velocityX * ma + B.velocityX * mb;
  const py = A.velocityY * ma + B.velocityY * mb;
  const cx = (A.x + B.x) / 2;
  const cy = (A.y + B.y) / 2;

  // A becomes the product (NH3), carrying the combined momentum.
  applyMoleculeShape(A, createReactionMoleculeShape(random, A.nominalRadius, "product"));
  placeMolecule(A, cx, cy);
  const newMass = A.radius * A.radius;
  A.velocityX = (px / newMass) * 0.85;
  A.velocityY = (py / newMass) * 0.85;
  const ejx = A.x - catalyst.x;
  const ejy = A.y - catalyst.y;
  const ejd = Math.max(1, Math.hypot(ejx, ejy));
  A.velocityX += (ejx / ejd) * 0.018;
  A.velocityY += (ejy / ejd) * 0.018;

  // B recycles into whichever reactant is now scarce, keeping the A/B balance.
  applyMoleculeShape(
    B,
    createReactionMoleculeShape(random, B.nominalRadius, scarceReactantFamily(state))
  );
  nudgeReactantAway(B, catalyst, random);

  flashReaction([A, B, catalyst]);
  catalyst.adsorbed = null;
  chem.forwardCooldownMs = CHEM.forwardCooldownMs;
}

// Reverse: NH3 →(Fe) N2 + H2. A product touching the catalyst decomposes back
// into a reactant with a small probability — the exact inverse of the forward
// step, so the two settle to a steady product fraction (visual equilibrium).
function maybeFireReverse(product, catalyst, state) {
  const chem = state.chemistry;
  if (chem.reverseCooldownMs > 0) return;
  const random = chem.random;
  if (random() > CHEM.reverseProbOnContact) return;

  applyMoleculeShape(
    product,
    createReactionMoleculeShape(random, product.nominalRadius, scarceReactantFamily(state))
  );
  nudgeReactantAway(product, catalyst, random);
  flashReaction([product, catalyst]);
  chem.reverseCooldownMs = CHEM.reverseCooldownMs;
}

function updateChemistryBookkeeping(state, deltaMs) {
  const chem = state.chemistry;
  if (chem.forwardCooldownMs > 0) chem.forwardCooldownMs -= deltaMs;
  if (chem.reverseCooldownMs > 0) chem.reverseCooldownMs -= deltaMs;

  const now = state.now;
  for (const molecule of state.molecules) {
    if (molecule.role !== "catalyst" || !molecule.adsorbed) continue;
    const slot = molecule.adsorbed;
    if (slot.A && (slot.A.role !== "reactantA" || now - slot.tA > CHEM.adsorbWindowMs)) {
      slot.A = null;
    }
    if (slot.B && (slot.B.role !== "reactantB" || now - slot.tB > CHEM.adsorbWindowMs)) {
      slot.B = null;
    }
  }
}

export function updateMolecules(state, now, deltaMs = 1000 / 60, { reducedMotion }) {
  if (reducedMotion) return;
  if (!state.chemistry) state.chemistry = freshChemistryState(state);

  const frameScale = clamp(deltaMs / (1000 / 60), 0, 3);
  state.now = now;
  state.lastDeltaMs = deltaMs;

  for (const molecule of state.molecules) {
    const band = molecule.band;

    // Pointer heat: molecules near the cursor warm up and speed up.
    let fieldStrength = 0;
    if (state.pointer.active) {
      const dx = molecule.x - state.pointer.x;
      const dy = molecule.y - state.pointer.y;
      const distance = Math.hypot(dx, dy);
      if (distance < POINTER.radius) fieldStrength = smoothstep(1 - distance / POINTER.radius);
    }
    if (fieldStrength > 0) {
      molecule.heat = clamp(
        molecule.heat + fieldStrength * POINTER.heatGain * frameScale,
        0,
        POINTER.maxHeat
      );
    } else {
      molecule.heat = timeScaledLerp(molecule.heat, 0, POINTER.cooling, frameScale);
    }

    // Brownian jitter keeps everything in gentle, constant thermal motion.
    const kick = THERMAL.brownian * (1 + molecule.heat) * frameScale;
    molecule.velocityX += (Math.random() - 0.5) * kick;
    molecule.velocityY += (Math.random() - 0.5) * kick;

    // Far background molecules keep a faint sinusoidal drift for depth ambiance.
    if (band.name === "background") {
      const t = now * band.speed + molecule.phase;
      molecule.velocityX += Math.sin(t) * band.drift * 1e-6 * frameScale;
      molecule.velocityY += Math.cos(t * 0.92) * band.drift * 1e-6 * frameScale;
    }

    const speedBoost = 1 + molecule.heat * THERMAL.heatSpeedGain;
    molecule.x += molecule.velocityX * speedBoost * deltaMs;
    molecule.y += molecule.velocityY * speedBoost * deltaMs;
    molecule.rotation += molecule.spin * (18 + molecule.heat * 44) * frameScale;

    reflectWalls(molecule, state);

    if (molecule.reactionOpacity < 1) {
      molecule.reactionOpacity = timeScaledLerp(molecule.reactionOpacity, 1, 0.05, frameScale);
    }
    if (molecule.renderScale !== 1) {
      molecule.renderScale = timeScaledLerp(molecule.renderScale, 1, 0.06, frameScale);
    }
  }

  resolveCollisions(state, now);
  updateChemistryBookkeeping(state, deltaMs);
  state.pointer.influence *= Math.pow(POINTER.decay, frameScale);
}

// --- Rendering: ball-and-stick -------------------------------------------

function hexToRgb(hex) {
  let h = String(hex).trim();
  if (h[0] === "#") h = h.slice(1);
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const int = parseInt(h, 16) || 0;
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function mixToward(rgb, target, t) {
  return {
    r: Math.round(lerp(rgb.r, target, t)),
    g: Math.round(lerp(rgb.g, target, t)),
    b: Math.round(lerp(rgb.b, target, t))
  };
}

function rgbStr(rgb, alpha = 1) {
  return alpha >= 1
    ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
    : `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function elementBaseColor(el, paletteMap, isDark) {
  if (el === "H") {
    // Hydrogen reads near-white; a pale blue keeps it visible on a dark page.
    return hexToRgb(isDark ? "#dbe7fb" : "#eef4fc");
  }
  if (el === "Fe") {
    // Iron catalyst as polished steel — cool, on-palette, distinct from N's blue.
    return hexToRgb(isDark ? "#aebfd8" : "#8ba2c0");
  }
  const entry = paletteMap[ELEMENTS[el] ? ELEMENTS[el].paletteKey : "blue"];
  return hexToRgb(entry ? (isDark ? entry.stroke : entry.fill) : "#3c719f");
}

function elementColors(el, paletteMap, isDark) {
  const base = elementBaseColor(el, paletteMap, isDark);
  const metallic = el === "Fe";
  return {
    highlight: rgbStr(mixToward(base, 255, metallic ? 0.82 : 0.62)),
    core: rgbStr(base),
    rim: rgbStr(mixToward(base, 0, isDark ? 0.3 : 0.42)),
    stroke: rgbStr(mixToward(base, 0, isDark ? 0.18 : 0.5), 0.85)
  };
}

// Element colors only change when dark mode or the palette changes, so memoize
// across frames instead of re-parsing hex for every atom.
let elementColorKey = "";
let elementColorCache = {};
function getElementColors(paletteMap, isDark) {
  const key = `${isDark}|${paletteMap.blue && paletteMap.blue.fill}|${paletteMap.blue && paletteMap.blue.stroke}`;
  if (key !== elementColorKey) {
    elementColorKey = key;
    elementColorCache = {};
    for (const el in ELEMENTS) elementColorCache[el] = elementColors(el, paletteMap, isDark);
  }
  return elementColorCache;
}

function drawAtomSphere(targetCtx, atom, colors) {
  const r = atom.r;
  const grad = targetCtx.createRadialGradient(
    atom.x - r * 0.36,
    atom.y - r * 0.4,
    r * 0.1,
    atom.x,
    atom.y,
    r * 1.02
  );
  grad.addColorStop(0, colors.highlight);
  grad.addColorStop(0.5, colors.core);
  grad.addColorStop(1, colors.rim);
  targetCtx.fillStyle = grad;
  targetCtx.beginPath();
  targetCtx.arc(atom.x, atom.y, r, 0, Math.PI * 2);
  targetCtx.fill();
  targetCtx.lineWidth = Math.max(0.6, r * 0.12);
  targetCtx.strokeStyle = colors.stroke;
  targetCtx.stroke();
}

function drawBond(targetCtx, a, b, order, width, color) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const gap = width * 1.2;
  const offsets = order === 1 ? [0] : order === 2 ? [-gap * 0.5, gap * 0.5] : [-gap, 0, gap];
  targetCtx.strokeStyle = color;
  targetCtx.lineWidth = width;
  for (const o of offsets) {
    targetCtx.beginPath();
    targetCtx.moveTo(a.x + nx * o, a.y + ny * o);
    targetCtx.lineTo(b.x + nx * o, b.y + ny * o);
    targetCtx.stroke();
  }
}

export function drawMolecule(
  targetCtx,
  paletteMap,
  molecule,
  x,
  y,
  rotation,
  alpha,
  scale = 1,
  isDark = false
) {
  if (!molecule.atoms) return;
  const colors = getElementColors(paletteMap, isDark);

  targetCtx.save();
  targetCtx.translate(x, y);
  targetCtx.rotate(rotation);
  targetCtx.scale(scale, scale);
  targetCtx.globalCompositeOperation = "source-over";
  targetCtx.globalAlpha = clamp(alpha, 0, 1);
  targetCtx.lineCap = "round";
  targetCtx.lineJoin = "round";

  if (molecule.bonds && molecule.bonds.length) {
    const bondWidth = Math.max(1.3, molecule.nominalRadius * 0.16);
    const bondColor = isDark ? "rgba(207, 223, 252, 0.82)" : "rgba(20, 38, 84, 0.7)";
    for (const bond of molecule.bonds) {
      const a = molecule.atoms[bond.a];
      const b = molecule.atoms[bond.b];
      if (!a || !b) continue;
      drawBond(targetCtx, a, b, bond.order, bondWidth, bondColor);
    }
  }

  for (const atom of molecule.atoms) {
    drawAtomSphere(targetCtx, atom, colors[atom.el] || colors.N);
  }

  targetCtx.restore();
}

export function drawMoleculeField(targetCtx, state) {
  const isDark = state.isDark || false;
  for (const molecule of state.molecules) {
    drawMolecule(
      targetCtx,
      state.palette,
      molecule,
      molecule.x,
      molecule.y,
      molecule.rotation,
      molecule.alpha * (molecule.reactionOpacity ?? 1),
      molecule.renderScale ?? 1,
      isDark
    );
  }
}
