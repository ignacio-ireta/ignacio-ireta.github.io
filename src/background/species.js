import { DEPTH_BANDS, MOLECULE_DENSITY, PALETTE_KEYS, POINTER } from "./config.js?v=structured-molecules-9f823e6";
import { drawMembraneBand, traceOrganicMass, traceSquigglePath } from "./geometry.js?v=structured-molecules-9f823e6";
import { clamp, lerp, seededRandom, smoothstep } from "./random.js?v=structured-molecules-9f823e6";
import { drawWatercolorShape } from "./watercolor.js?v=structured-molecules-9f823e6";

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
      { x: 8, y: top, width: state.width - 16, height: Math.min(660, state.height * 0.74), factor: 0.28, feather: 72 }
    ];
  }

  if (state.width < 1040) {
    return [
      { x: mainLeft, y: top, width: mainWidth, height: Math.min(780, state.height * 0.82), factor: 0.34, feather: 96 }
    ];
  }

  return [
    { x: mainLeft, y: top, width: mainWidth * 0.61, height: state.height * 0.76, factor: 0.3, feather: 108 },
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
        { fill: spec.glazeFill || palette.stroke, alpha: spec.alpha * 0.045, x: -spec.rx * 0.04, y: spec.ry * 0.04 }
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
        paletteKey: (cluster.paletteKeys || PALETTE_KEYS)[Math.floor(random() * (cluster.paletteKeys || PALETTE_KEYS).length)],
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
  traceSquigglePath(targetCtx, 0, strand.amplitude * 0.52, strand.length, strand.amplitude * 0.84, strand.phase + 1.8, 34);
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
  drawMembraneBand(targetCtx, membrane.x, membrane.y, membrane.radius, membrane.start, membrane.end, membrane.gap);

  targetCtx.globalAlpha = membrane.alpha * 0.34;
  targetCtx.lineWidth = membrane.lineWidth + membrane.gap * 0.72;
  drawMembraneBand(targetCtx, membrane.x, membrane.y, membrane.radius, membrane.start, membrane.end, membrane.gap * 0.18);

  targetCtx.globalAlpha = membrane.alpha * 0.72;
  targetCtx.lineWidth = Math.max(0.75, membrane.lineWidth * 0.46);
  drawMembraneBand(targetCtx, membrane.x, membrane.y, membrane.radius, membrane.start, membrane.end, membrane.gap * 1.55);

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
          ctx.ellipse(spec.x, spec.y, spec.rx * 0.42, spec.ry * 0.78, spec.rotation, 0, Math.PI * 2);
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
  const random = seededRandom((state.seed || 0) ^ (8114 + Math.floor(state.width * 0.4) + Math.floor(state.height * 0.3)));
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
        glazes: [{ fill: state.palette.violet.fill, alpha: (options.isDark ? 0.018 : 0.014) * quiet, x: 2, y: -2 }],
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
    { x: state.width * 0.06, y: state.height * 0.64, length: state.width * 0.34, amplitude: 11, rotation: -0.18, phase: 0.6, alpha: options.isDark ? 0.15 : 0.18, width: 1.8 },
    { x: state.width * 0.52, y: state.height * 0.18, length: state.width * 0.28, amplitude: 9, rotation: 0.26, phase: 2.8, alpha: options.isDark ? 0.14 : 0.16, width: 1.5 },
    { x: state.width * 0.62, y: state.height * 0.82, length: state.width * 0.32, amplitude: 10, rotation: -0.42, phase: 4.1, alpha: options.isDark ? 0.13 : 0.15, width: 1.6 }
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
    { x: state.width * 0.03, y: state.height * 0.88, rx: state.width * 0.16, ry: state.height * 0.12, paletteKey: "teal", phase: 0.8, alpha: options.isDark ? 0.13 : 0.16, seed: 771 },
    { x: state.width * 0.92, y: state.height * 0.1, rx: state.width * 0.15, ry: state.height * 0.1, paletteKey: "violet", phase: 2.7, alpha: options.isDark ? 0.12 : 0.15, seed: 977 },
    { x: state.width * 0.82, y: state.height * 0.96, rx: state.width * 0.18, ry: state.height * 0.1, paletteKey: "rose", phase: 4.2, alpha: options.isDark ? 0.11 : 0.14, seed: 1201 }
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


function makeLobe(x, y, rx, ry, rotate = 0) {
  return { x, y, rx, ry, rotate };
}

function createReactionMoleculeShape(random, radius) {
  const familyRoll = random();
  const jitter = (amount) => lerp(-amount, amount, random());

  if (familyRoll < 0.24) {
    const bend = lerp(-0.24, 0.24, random());
    return {
      family: "substrate-a",
      paletteKey: "blue",
      lobes: [
        makeLobe(-radius * 0.46, radius * bend + jitter(radius * 0.05), radius * 0.42, radius * 0.27, -0.18),
        makeLobe(0, jitter(radius * 0.04), radius * 0.5, radius * 0.31, 0.08),
        makeLobe(radius * 0.47, -radius * bend + jitter(radius * 0.05), radius * 0.38, radius * 0.25, 0.22)
      ],
      bonds: [[0, 1], [1, 2]],
      granuleCount: 7
    };
  }

  if (familyRoll < 0.48) {
    const lobes = Array.from({ length: 5 }, (_, index) => {
      const angle = -Math.PI / 2 + (index / 5) * Math.PI * 2 + jitter(0.08);
      return makeLobe(
        Math.cos(angle) * radius * 0.35,
        Math.sin(angle) * radius * 0.32,
        radius * lerp(0.28, 0.38, random()),
        radius * lerp(0.22, 0.32, random()),
        angle + Math.PI / 2
      );
    });
    lobes.push(makeLobe(radius * 0.54, radius * 0.1, radius * 0.25, radius * 0.18, 0.42));
    return {
      family: "substrate-b",
      paletteKey: random() < 0.62 ? "teal" : "violet",
      lobes,
      bonds: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0], [1, 5]],
      granuleCount: 9
    };
  }

  if (familyRoll < 0.66) {
    return {
      family: "catalyst",
      paletteKey: "gold",
      lobes: [
        makeLobe(-radius * 0.44, -radius * 0.04, radius * 0.42, radius * 0.24, -0.38),
        makeLobe(-radius * 0.15, radius * 0.22, radius * 0.46, radius * 0.23, 0.06),
        makeLobe(radius * 0.22, radius * 0.18, radius * 0.5, radius * 0.25, 0.26),
        makeLobe(radius * 0.48, -radius * 0.08, radius * 0.34, radius * 0.2, -0.18),
        makeLobe(radius * 0.04, -radius * 0.28, radius * 0.28, radius * 0.18, 0.08)
      ],
      bonds: [[0, 1], [1, 2], [2, 3], [1, 4], [2, 4]],
      pocket: true,
      granuleCount: 13
    };
  }

  if (familyRoll < 0.86) {
    return {
      family: "product",
      paletteKey: random() < 0.5 ? "teal" : "blue",
      lobes: [
        makeLobe(-radius * 0.5, -radius * 0.04, radius * 0.34, radius * 0.24, -0.18),
        makeLobe(-radius * 0.18, radius * 0.03, radius * 0.42, radius * 0.29, 0.08),
        makeLobe(radius * 0.18, radius * 0.02, radius * 0.42, radius * 0.29, -0.05),
        makeLobe(radius * 0.52, radius * 0.08, radius * 0.33, radius * 0.23, 0.2),
        makeLobe(radius * 0.03, -radius * 0.38, radius * 0.3, radius * 0.2, -0.1)
      ],
      bonds: [[0, 1], [1, 2], [2, 3], [1, 4], [2, 4]],
      granuleCount: 10
    };
  }

  return {
    family: "fragment",
    paletteKey: random() < 0.56 ? "violet" : "rose",
    lobes: [
      makeLobe(-radius * 0.2, 0, radius * 0.28, radius * 0.2, -0.1),
      makeLobe(radius * 0.22, radius * 0.04, radius * 0.24, radius * 0.18, 0.2)
    ],
    bonds: [[0, 1]],
    granuleCount: 5
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
      const radius = lerp(band.radius[0], band.radius[1], random()) * band.scale;
      const shape = createReactionMoleculeShape(random, radius);
      const { paletteKey, lobes, bonds, family, pocket } = shape;

      let originX = random() * state.width;
      let originY = random() * state.height;
      for (let attempt = 0; attempt < 7; attempt += 1) {
        const point = clusteredPoint(random, state, flowAnchors);
        originX = point.x;
        originY = point.y;
        if (contentQuietFactor(state, originX, originY, radius) > 0.54 || random() < 0.18) break;
      }
      const quiet = contentQuietFactor(state, originX, originY, radius);
      const speedRange =
        band.name === "background" ? [0.0028, 0.0075] : band.name === "midground" ? [0.006, 0.016] : [0.01, 0.026];
      const initialMomentum = lerp(speedRange[0], speedRange[1], random());
      const velocityAngle = random() * Math.PI * 2;

      molecules.push({
        band,
        x: originX,
        y: originY,
        originX,
        originY,
        baseOriginX: originX,
        baseOriginY: originY,
        radius,
        paletteKey,
        family,
        lobes,
        bonds,
        pocket,
        phase: random() * Math.PI * 2,
        wander: random() * Math.PI * 2,
        rotation: random() * Math.PI * 2,
        spin: lerp(-0.00008, 0.00008, random()),
        velocityX: Math.cos(velocityAngle) * initialMomentum,
        velocityY: Math.sin(velocityAngle) * initialMomentum * lerp(0.62, 1, random()),
        momentum: initialMomentum,
        alpha: lerp(band.alpha[0], band.alpha[1], random()) * lerp(0.62, 1, quiet),
        outline: random() < band.outline,
        heat: 0,
        thermalX: 0,
        thermalY: 0,
        granules: Array.from({ length: shape.granuleCount + Math.floor(random() * 4) }, () => ({
          x: lerp(-radius * 0.56, radius * 0.56, random()),
          y: lerp(-radius * 0.42, radius * 0.42, random()),
          r: lerp(0.7, 1.8, random()),
          a: lerp(0.07, 0.15, random())
        }))
      });
    }
  }

  return molecules.sort((a, b) => a.radius - b.radius);
}

function timeScaledLerp(current, target, amount, frameScale) {
  return lerp(current, target, 1 - Math.pow(1 - amount, frameScale));
}

export function updateMolecules(state, now, deltaMs = 1000 / 60, { reducedMotion }) {
  if (reducedMotion) return;

  const frameScale = clamp(deltaMs / (1000 / 60), 0, 3);

  for (const molecule of state.molecules) {
    const band = molecule.band;
    let fieldStrength = 0;

    if (state.pointer.active) {
      const dx = molecule.x - state.pointer.x;
      const dy = molecule.y - state.pointer.y;
      const distance = Math.hypot(dx, dy);
      if (distance < POINTER.radius) {
        const proximity = 1 - distance / POINTER.radius;
        fieldStrength = smoothstep(proximity);
      }
    }

    if (fieldStrength > 0) {
      molecule.heat = clamp(molecule.heat + fieldStrength * POINTER.heatGain * frameScale, 0, POINTER.maxHeat);
    } else {
      molecule.heat = timeScaledLerp(molecule.heat, 0, POINTER.cooling, frameScale);
    }

    const speedBoost = 1 + molecule.heat * 2.35;
    const t = now * band.speed * speedBoost + molecule.phase;
    const currentMomentum = molecule.momentum * speedBoost;
    molecule.baseOriginX +=
      (molecule.velocityX * speedBoost + Math.sin(t * 0.37 + molecule.wander) * currentMomentum * 0.18) * deltaMs;
    molecule.baseOriginY +=
      (molecule.velocityY * speedBoost + Math.cos(t * 0.31 - molecule.wander) * currentMomentum * 0.16) * deltaMs;
    const wanderX = Math.sin(t * 1.9 + molecule.wander) * band.drift;
    const wanderY = Math.cos(t * 1.4 - molecule.wander) * band.drift;
    const flowX = Math.sin((molecule.baseOriginY + now * 0.012) * 0.006) * band.drift * 0.25;
    const flowY = Math.cos((molecule.baseOriginX - now * 0.01) * 0.005) * band.drift * 0.22;

    molecule.originX = timeScaledLerp(molecule.originX, molecule.baseOriginX, 0.01, frameScale);
    molecule.originY = timeScaledLerp(molecule.originY, molecule.baseOriginY, 0.01, frameScale);
    molecule.thermalX = timeScaledLerp(molecule.thermalX, 0, 0.18, frameScale);
    molecule.thermalY = timeScaledLerp(molecule.thermalY, 0, 0.18, frameScale);

    molecule.x = molecule.originX + wanderX + flowX;
    molecule.y = molecule.originY + wanderY + flowY;
    molecule.rotation += molecule.spin * (16 + molecule.heat * 24) * frameScale;

    const wrapPadding = Math.max(110, molecule.radius * 2.3);
    if (molecule.x < -wrapPadding) {
      molecule.originX = state.width + wrapPadding;
      molecule.baseOriginX = molecule.originX;
    }
    if (molecule.x > state.width + wrapPadding) {
      molecule.originX = -wrapPadding;
      molecule.baseOriginX = molecule.originX;
    }
    if (molecule.y < -wrapPadding) {
      molecule.originY = state.height + wrapPadding;
      molecule.baseOriginY = molecule.originY;
    }
    if (molecule.y > state.height + wrapPadding) {
      molecule.originY = -wrapPadding;
      molecule.baseOriginY = molecule.originY;
    }
  }

  state.pointer.influence *= Math.pow(POINTER.decay, frameScale);
}

export function drawMolecule(targetCtx, paletteMap, molecule, x, y, rotation, alpha, scale = 1) {
  const palette = paletteMap[molecule.paletteKey];
  if (!palette) return;

  targetCtx.save();
  targetCtx.translate(x, y);
  targetCtx.rotate(rotation);
  targetCtx.scale(scale, scale);
  targetCtx.globalCompositeOperation = "multiply";
  targetCtx.globalAlpha = alpha;
  targetCtx.fillStyle = palette.fill;

  if (molecule.bonds?.length) {
    targetCtx.save();
    targetCtx.globalCompositeOperation = "source-over";
    targetCtx.globalAlpha = alpha * 0.42;
    targetCtx.strokeStyle = palette.stroke;
    targetCtx.lineWidth = Math.max(0.75, molecule.radius * 0.045);
    targetCtx.lineCap = "round";
    for (const [from, to] of molecule.bonds) {
      const a = molecule.lobes[from];
      const b = molecule.lobes[to];
      if (!a || !b) continue;
      targetCtx.beginPath();
      targetCtx.moveTo(a.x, a.y);
      targetCtx.lineTo(b.x, b.y);
      targetCtx.stroke();
    }
    targetCtx.restore();
  }

  for (const lobe of molecule.lobes) {
    targetCtx.save();
    targetCtx.translate(lobe.x, lobe.y);
    targetCtx.rotate(lobe.rotate);
    targetCtx.beginPath();
    targetCtx.ellipse(0, 0, lobe.rx, lobe.ry, 0, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.restore();
  }

  targetCtx.globalAlpha = alpha;
  targetCtx.globalCompositeOperation = "multiply";
  for (const granule of molecule.granules) {
    targetCtx.fillStyle = `rgba(43, 35, 24, ${granule.a})`;
    targetCtx.beginPath();
    targetCtx.arc(granule.x, granule.y, granule.r, 0, Math.PI * 2);
    targetCtx.fill();
  }

  if (molecule.outline) {
    targetCtx.globalCompositeOperation = "source-over";
    targetCtx.globalAlpha = alpha * 0.82;
    targetCtx.strokeStyle = palette.stroke;
    targetCtx.lineWidth = 1.05;
    for (let i = 0; i < molecule.lobes.length; i += 2) {
      const lobe = molecule.lobes[i];
      targetCtx.save();
      targetCtx.translate(lobe.x, lobe.y);
      targetCtx.rotate(lobe.rotate);
      targetCtx.beginPath();
      targetCtx.ellipse(0, 0, lobe.rx, lobe.ry, 0, 0, Math.PI * 2);
      targetCtx.stroke();
      targetCtx.restore();
    }

    targetCtx.globalAlpha = alpha * 0.28;
    targetCtx.lineWidth = 0.8;
    targetCtx.beginPath();
    targetCtx.ellipse(0, 0, molecule.radius * 0.82, molecule.radius * 0.46, rotation * -0.2, 0, Math.PI * 2);
    targetCtx.stroke();
  }

  if (molecule.pocket) {
    targetCtx.globalCompositeOperation = "source-over";
    targetCtx.globalAlpha = alpha * 0.34;
    targetCtx.strokeStyle = palette.stroke;
    targetCtx.lineWidth = Math.max(0.75, molecule.radius * 0.04);
    targetCtx.beginPath();
    targetCtx.arc(0, -molecule.radius * 0.02, molecule.radius * 0.48, 0.18, Math.PI * 1.18);
    targetCtx.stroke();
  }

  targetCtx.restore();
}

export function drawMoleculeField(targetCtx, state) {
  for (const molecule of state.molecules) {
    drawMolecule(targetCtx, state.palette, molecule, molecule.x, molecule.y, molecule.rotation, molecule.alpha, 1);
  }
}
