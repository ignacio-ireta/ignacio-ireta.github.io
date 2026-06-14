export const DPR_CAP = 2;

export const MOLECULE_DENSITY = {
  mobile: {
    staticClusterScale: 1.16,
    overlayAreaPerMolecule: 12000,
    overlayMin: 42,
    overlayMax: 90
  },
  tablet: {
    staticClusterScale: 1.46,
    overlayAreaPerMolecule: 12000,
    overlayMin: 64,
    overlayMax: 138
  },
  desktop: {
    staticClusterScale: 1.82,
    overlayAreaPerMolecule: 8500,
    overlayMin: 120,
    overlayMax: 240
  }
};

export const PALETTE_KEYS = ["rose", "blue", "teal", "gold", "violet"];

export const DEPTH_BANDS = [
  {
    name: "background",
    count: 0.34,
    radius: [18, 40],
    alpha: [0.24, 0.4],
    speed: 0.000075,
    drift: 9,
    outline: 0.22,
    scale: 1.05
  },
  {
    name: "midground",
    count: 0.42,
    radius: [13, 26],
    alpha: [0.42, 0.66],
    speed: 0.00013,
    drift: 15,
    outline: 0.5,
    scale: 1
  },
  {
    name: "foreground",
    count: 0.24,
    radius: [10, 20],
    alpha: [0.66, 0.94],
    speed: 0.00019,
    drift: 22,
    outline: 0.86,
    scale: 0.95
  }
];

export const POINTER = {
  radius: 285,
  heatGain: 0.095,
  cooling: 0.034,
  maxHeat: 2.4,
  decay: 0.952
};

// --- Reaction chemistry: Haber process  N2 + 3 H2  ⇌  2 NH3  (Fe catalyst) ---
//
// The animated overlay depicts a catalysed reaction at equilibrium. Atoms are
// drawn ball-and-stick (shaded spheres + bond sticks), molecules collide
// elastically inside the viewport "vessel", and reactions fire on real contact
// with the iron catalyst. Swapping the reaction is purely a matter of editing
// ELEMENTS + SPECIES below — the renderer and physics are reaction-agnostic.

// Per-element drawing data. `paletteKey` ties an element to one of the site's
// accent colors; `radius` is a relative (CPK-ish) size, scaled at build time by
// ELEMENT_ATOM_SCALE * the molecule's nominal radius. Hydrogen and iron get a
// mode-aware override inside species.js (`elementColors`) so H reads near-white
// and Fe reads as polished metal — both still drawn from the cool palette.
export const ELEMENTS = {
  N: { paletteKey: "blue", radius: 0.95, label: "N" }, // CPK nitrogen → site blue
  H: { paletteKey: "rose", radius: 0.52, label: "H" }, // CPK white → palest tone
  Fe: { paletteKey: "gold", radius: 1.05, label: "Fe" }, // CPK iron → metallic steel
  C: { paletteKey: "violet", radius: 0.9, label: "C" }, // reserved for reaction swaps
  O: { paletteKey: "teal", radius: 0.92, label: "O" } // reserved (never red)
};

// Fraction of the molecule's nominal radius that one unit of element radius maps
// to in pixels.
export const ELEMENT_ATOM_SCALE = 0.5;

// Atom positions are normalized (× the molecule's nominal radius at build time).
// `role` drives the reaction state machine; `weight` biases the spawn mix so the
// field starts near a lively equilibrium (extra H2 nods at the 3:1 stoichiometry).
export const SPECIES = {
  "substrate-a": {
    paletteKey: "blue",
    role: "reactantA",
    weight: 0.18,
    atoms: [
      { el: "N", x: -0.6, y: 0 },
      { el: "N", x: 0.6, y: 0 }
    ],
    bonds: [{ a: 0, b: 1, order: 3 }] // N≡N triple bond
  },
  "substrate-b": {
    paletteKey: "rose",
    role: "reactantB",
    weight: 0.4,
    atoms: [
      { el: "H", x: -0.44, y: 0 },
      { el: "H", x: 0.44, y: 0 }
    ],
    bonds: [{ a: 0, b: 1, order: 1 }] // H–H single bond
  },
  catalyst: {
    paletteKey: "gold",
    role: "catalyst",
    weight: 0.17,
    atoms: [
      { el: "Fe", x: 0, y: -0.62 },
      { el: "Fe", x: -0.66, y: 0.46 },
      { el: "Fe", x: 0.66, y: 0.46 }
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 1, b: 2, order: 1 },
      { a: 2, b: 0, order: 1 }
    ]
  },
  product: {
    paletteKey: "blue",
    role: "product",
    weight: 0.25,
    atoms: [
      { el: "N", x: 0, y: 0.04 }, // central nitrogen
      { el: "H", x: 0, y: -0.86 }, // trigonal-pyramidal hydrogens (drawn flat)
      { el: "H", x: -0.78, y: 0.52 },
      { el: "H", x: 0.78, y: 0.52 }
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 0, b: 2, order: 1 },
      { a: 0, b: 3, order: 1 }
    ]
  }
};

// Elastic collisions: a uniform spatial-hash grid (cell ≥ pull radius) keeps the
// broad phase O(n) at the desktop molecule cap. Restitution < 1 bleeds energy so
// motion stays calm; maxSpeed caps the baseline velocity (heat can still burst).
export const COLLISION = {
  cellSize: 140,
  restitution: 0.9,
  wallRestitution: 0.84,
  maxSpeed: 0.05, // px/ms baseline cap (heat/flash can exceed transiently)
  catalystPullRadius: 120,
  catalystPull: 0.0000016 // gentle attraction of reactants toward catalysts
};

// Thermal motion: tiny Brownian velocity jitter keeps molecules in constant
// motion; heat (pointer / reaction flash) multiplies displacement speed.
export const THERMAL = {
  brownian: 0.00045,
  heatSpeedGain: 3.85
};

// Forward (N2 + H2 →(Fe) NH3) and reverse (NH3 →(Fe) N2 + H2) reaction tuning.
// Forward needs two reactants adsorbed on one catalyst (rare) so the field tends
// toward reactants; a small per-contact reverse probability balances it back —
// together they settle to a roughly constant product fraction (visual ⇌).
export const CHEM = {
  forwardCooldownMs: 420, // global throttle between forward reactions
  reverseCooldownMs: 160, // global throttle between reverse reactions
  reverseProbOnContact: 0.16, // chance an NH3 touching Fe decomposes
  adsorbWindowMs: 1500, // how long a catalyst remembers an adsorbed reactant
  flashHeat: 2.4, // heat spike applied to molecules in a reaction
  flashOpacity: 0.25 // opacity dip that relaxes back to 1 (a visible "pop")
};
