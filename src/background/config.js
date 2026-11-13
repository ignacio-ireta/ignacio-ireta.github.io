export const DPR_CAP = 2;

// Everything in the simulation is laid out in ångströms and converted to pixels
// by the tier's `scale` (px per Å), so bond lengths, atom sizes, and the iron
// lattice all stay in true proportion to one another at every viewport size.
export const MOLECULE_DENSITY = {
  mobile: { scale: 12, areaPerMolecule: 9500, min: 34, max: 64, catalysts: 2, far: 12, near: 3 },
  tablet: { scale: 14, areaPerMolecule: 10500, min: 56, max: 100, catalysts: 3, far: 22, near: 4 },
  desktop: { scale: 16, areaPerMolecule: 11500, min: 96, max: 180, catalysts: 4, far: 40, near: 6 }
};

export const POINTER = {
  radius: 285,
  heatGain: 0.095,
  cooling: 0.034,
  maxHeat: 2.4,
  decay: 0.952
};

// --- Reaction chemistry: Haber–Bosch  N2 + 3 H2  ⇌  2 NH3  over iron ---------
//
// The overlay is a small molecular-dynamics sketch of heterogeneous catalysis.
// Gas molecules tumble in 3D and collide elastically with their real relative
// masses; the reaction itself runs on the surface of iron nanoparticles through
// the elementary steps of the Langmuir–Hinshelwood mechanism (see KINETICS).

// `mass` in u. `ball` is the drawn ball-and-stick radius in Å (iron is drawn at
// its metallic radius so the lattice reads as a close-packed surface). Colors
// follow CPK: N blue, H white, and Fe its orange, burnished toward bronze.
export const ELEMENTS = {
  N: { mass: 14.007, ball: 0.37, light: "#2c5bd2", dark: "#4f84f2" },
  H: { mass: 1.008, ball: 0.25, light: "#f8f5ee", dark: "#f7f4ec" },
  Fe: { mass: 55.845, ball: 1.24, light: "#d59a5c", dark: "#c98848", metallic: true }
};

// Experimental gas-phase geometries (Å / degrees).
const NN_BOND = 1.098;
const HH_BOND = 0.741;
const NH_BOND = 1.012;
const HNH_ANGLE = (106.67 * Math.PI) / 180;

// Ammonia is a trigonal pyramid: three H on a ring below the N apex. Positions
// are relative to the center of mass so the molecule tumbles about it.
const NH3_RING = (2 * NH_BOND * Math.sin(HNH_ANGLE / 2)) / Math.sqrt(3);
const NH3_HEIGHT = Math.sqrt(NH_BOND * NH_BOND - NH3_RING * NH3_RING);
const NH3_COM = (ELEMENTS.N.mass * NH3_HEIGHT) / (ELEMENTS.N.mass + 3 * ELEMENTS.H.mass);

function ammoniaHydrogen(index) {
  const angle = Math.PI / 2 + (index * Math.PI * 2) / 3;
  return { el: "H", x: Math.cos(angle) * NH3_RING, y: Math.sin(angle) * NH3_RING, z: -NH3_COM };
}

// `collisionRadius` (Å) is the hard-disc radius used by the gas-phase physics;
// `spin` scales the thermal tumbling rate (lighter rotors spin faster).
export const SPECIES = {
  N2: {
    mass: 2 * ELEMENTS.N.mass,
    formula: { N: 2 },
    atoms: [
      { el: "N", x: -NN_BOND / 2, y: 0, z: 0 },
      { el: "N", x: NN_BOND / 2, y: 0, z: 0 }
    ],
    bonds: [{ a: 0, b: 1, order: 3 }], // N≡N
    collisionRadius: 0.9,
    spin: 1
  },
  H2: {
    mass: 2 * ELEMENTS.H.mass,
    formula: { H: 2 },
    atoms: [
      { el: "H", x: -HH_BOND / 2, y: 0, z: 0 },
      { el: "H", x: HH_BOND / 2, y: 0, z: 0 }
    ],
    bonds: [{ a: 0, b: 1, order: 1 }], // H–H
    collisionRadius: 0.62,
    spin: 1.7
  },
  NH3: {
    mass: ELEMENTS.N.mass + 3 * ELEMENTS.H.mass,
    formula: { N: 1, H: 3 },
    atoms: [
      { el: "N", x: 0, y: 0, z: NH3_HEIGHT - NH3_COM },
      ammoniaHydrogen(0),
      ammoniaHydrogen(1),
      ammoniaHydrogen(2)
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 0, b: 2, order: 1 },
      { a: 0, b: 3, order: 1 }
    ],
    collisionRadius: 1.12,
    spin: 1.15
  }
};

// Starting gas mixture (number fractions). Close to where the kinetics below
// settle, with hydrogen in stoichiometric excess.
export const GAS_MIX = { N2: 0.2, H2: 0.56, NH3: 0.24 };

// Iron nanoparticles: a close-packed facet (rows of atoms, each row offset by
// half a spacing) over a second layer. Adsorbates sit in the three-fold hollow
// sites between surface atoms. `shapes` lists atoms per row.
export const CATALYST = {
  lattice: 2.48, // Fe–Fe nearest-neighbour distance, Å
  shapes: {
    mobile: [[2, 3, 2]],
    tablet: [
      [3, 4, 3],
      [2, 3, 2]
    ],
    desktop: [
      [2, 3, 2],
      [3, 4, 3],
      [2, 3, 2],
      [2, 3, 4, 3]
    ]
  },
  reach: 3.3, // Å: how far from the contact point an arriving molecule finds a site
  pull: 0.000005, // px per ms²: weak attraction of nearby gas toward the metal
  pullRange: 4.5, // Å beyond the particle's edge
  spring: 0.0000009, // pull toward the particle's home position (per ms²)
  damping: 0.0016, // per ms
  wander: 0.00003, // random drift kick (px per ms^1.5)
  spin: 0.000018 // rad per ms, sign randomised
};

// Thermal motion. Each molecule is coupled to a Langevin thermostat, so speeds
// follow a Maxwell–Boltzmann distribution with <v²> ∝ T / m: hydrogen moves
// ~3.7× faster than nitrogen, as in a real gas. Temperature is dimensionless
// (1 = ambient); pointer heat raises it locally.
export const THERMAL = {
  speedN2: 0.00105, // rms speed of N2 at T = 1, Å per ms
  coupling: 1 / 1100, // thermostat rate, per ms
  spin: 0.00115, // rms tumbling rate at T = 1 for spin = 1, rad per ms
  heatToTemp: 2.2 // T = 1 + heat * heatToTemp
};

// Langmuir–Hinshelwood mechanism on the iron surface (* = free hollow site):
//
//   N2(g)  + 2*  ⇌  2 N*            dissociative adsorption (rate-limiting)
//   H2(g)  + 2*  ⇌  2 H*            dissociative adsorption
//   N*  + H*     ⇌  NH*  + *        stepwise hydrogenation
//   NH* + H*     ⇌  NH2* + *
//   NH2* + H*    ⇌  NH3* + *
//   NH3*         ⇌  NH3(g) + *      desorption
//
// `stick` is the probability that a collision with free sites adsorbs. Surface
// rates are per ms at T = 1 and scale as exp(Ea * (1 - 1/T)). The reverse steps
// carry the larger activation energies, so heating the gas (pointer) speeds
// everything up but shifts the equilibrium back toward N2 + H2 — Le Chatelier
// for an exothermic reaction.
export const KINETICS = {
  stick: { N2: 0.9, H2: 0.4, NH3: 0.5 },
  hop: { H: 1 / 450, N: 1 / 1800, ea: 0.5 },
  hydrogenate: { rate: 1 / 650, ea: 0.3 },
  dehydrogenate: { rate: 1 / 1500, ea: 1.2 },
  desorbNH3: { rate: 1 / 1100, ea: 0.6 },
  recombineH: { rate: 1 / 2200, ea: 0.8 },
  recombineN: { rate: 1 / 2500, ea: 1.6 },
  settleMs: 120, // time constant for adsorbates easing onto their sites
  ghostBondMs: 420 // how long a dissociating bond stays visible
};
