import test from "node:test";
import assert from "node:assert/strict";

import { CATALYST, SPECIES } from "../src/background/config.js";
import {
  atomInventory,
  buildCatalystGeometry,
  createGasMolecule,
  createMolecules,
  gasCounts,
  projectAtoms,
  updateMolecules
} from "../src/background/species.js";

const FRAME_MS = 1000 / 60;

function simulation(width, height, seed) {
  const state = { width, height, seed, pointer: { x: 0, y: 0, active: false, influence: 0 } };
  createMolecules(state);
  return state;
}

function run(state, seconds) {
  let now = 0;
  for (let frame = 0; frame < seconds * 60; frame += 1) {
    now += FRAME_MS;
    updateMolecules(state, now, FRAME_MS, {});
  }
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

test("gas molecules have their experimental geometry", () => {
  const n2 = SPECIES.N2.atoms;
  const h2 = SPECIES.H2.atoms;
  const [n, h1, h2a] = SPECIES.NH3.atoms;
  assert.ok(Math.abs(distance(n2[0], n2[1]) - 1.098) < 1e-9);
  assert.ok(Math.abs(distance(h2[0], h2[1]) - 0.741) < 1e-9);
  assert.ok(Math.abs(distance(n, h1) - 1.012) < 1e-9);

  // H–N–H angle of the pyramid, from the two N→H vectors.
  const u = { x: h1.x - n.x, y: h1.y - n.y, z: h1.z - n.z };
  const v = { x: h2a.x - n.x, y: h2a.y - n.y, z: h2a.z - n.z };
  const angle = Math.acos((u.x * v.x + u.y * v.y + u.z * v.z) / (1.012 * 1.012));
  assert.ok(Math.abs((angle * 180) / Math.PI - 106.67) < 1e-6);
});

test("tumbling a molecule preserves its bond lengths", () => {
  const state = simulation(900, 700, 5);
  const molecule = createGasMolecule("NH3", 100, 100, 10, state.chemistry.random);
  state.molecules = [molecule];
  state.catalysts = [];
  run(state, 5);
  const [n, ...hydrogens] = projectAtoms(molecule);
  for (const h of hydrogens) assert.ok(Math.abs(distance(n, h) / molecule.scale - 1.012) < 1e-6);
});

test("an iron facet exposes three-fold hollow sites between its atoms", () => {
  const scale = 10;
  const { atoms, sites } = buildCatalystGeometry([3, 4, 3], scale);
  assert.equal(atoms.length, 10);
  assert.equal(sites.length, 10);
  const toNearestAtoms = (CATALYST.lattice * scale) / Math.sqrt(3);
  for (const site of sites) {
    const touching = atoms.filter(
      (atom) => Math.abs(Math.hypot(atom.lx - site.lx, atom.ly - site.ly) - toNearestAtoms) < 1e-6
    );
    assert.equal(touching.length, 3);
    assert.ok(site.neighbors.length >= 1 && site.neighbors.length <= 3);
  }
});

test("the reaction conserves every nitrogen and hydrogen atom", () => {
  const state = simulation(1440, 900, 7);
  const initial = atomInventory(state);
  assert.ok(initial.N > 0 && initial.H > 0);
  for (let minute = 0; minute < 3; minute += 1) {
    run(state, 60);
    assert.deepEqual(atomInventory(state), initial);
  }
});

test("the surface runs the mechanism in both directions", () => {
  const state = simulation(1440, 900, 7);
  run(state, 240);
  const events = state.chemistry.events;
  for (const step of [
    "adsorbN2",
    "adsorbH2",
    "hydrogenate",
    "desorbNH3",
    "adsorbNH3",
    "dehydrogenate",
    "desorbH2",
    "desorbN2"
  ]) {
    assert.ok(events[step] > 0, `expected at least one ${step} step`);
  }
  // A dynamic equilibrium: all three gases are still present.
  const counts = gasCounts(state);
  assert.ok(counts.N2 > 0 && counts.H2 > 0 && counts.NH3 > 0);
});

test("hydrogen moves faster than nitrogen, as sqrt(mass ratio)", () => {
  const state = simulation(1440, 900, 11);
  const squares = { N2: [], H2: [] };
  for (let sample = 0; sample < 40; sample += 1) {
    run(state, 2);
    for (const molecule of state.molecules) {
      if (squares[molecule.species]) {
        squares[molecule.species].push(molecule.vx ** 2 + molecule.vy ** 2);
      }
    }
  }
  const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  const ratio = Math.sqrt(mean(squares.H2) / mean(squares.N2));
  const expected = Math.sqrt(SPECIES.N2.mass / SPECIES.H2.mass);
  assert.ok(Math.abs(ratio / expected - 1) < 0.25, `rms speed ratio ${ratio.toFixed(2)}`);
});

test("reduced motion leaves the simulation untouched", () => {
  const state = simulation(800, 600, 3);
  const before = state.molecules.map((molecule) => [molecule.x, molecule.y]);
  updateMolecules(state, 16, FRAME_MS, { reducedMotion: true });
  assert.deepEqual(
    state.molecules.map((molecule) => [molecule.x, molecule.y]),
    before
  );
});
