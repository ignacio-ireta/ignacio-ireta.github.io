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
    radius: [20, 52],
    alpha: [0.16, 0.28],
    speed: 0.000075,
    drift: 9,
    outline: 0.22,
    scale: 1.2
  },
  {
    name: "midground",
    count: 0.42,
    radius: [12, 30],
    alpha: [0.24, 0.42],
    speed: 0.00013,
    drift: 15,
    outline: 0.5,
    scale: 1
  },
  {
    name: "foreground",
    count: 0.24,
    radius: [8, 22],
    alpha: [0.34, 0.56],
    speed: 0.00019,
    drift: 22,
    outline: 0.86,
    scale: 0.9
  }
];

export const POINTER = {
  radius: 285,
  heatGain: 0.095,
  cooling: 0.034,
  maxHeat: 2.4,
  decay: 0.952
};
