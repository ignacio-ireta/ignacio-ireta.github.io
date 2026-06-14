import test from "node:test";
import assert from "node:assert/strict";

import {
  applyHaberForward,
  applyHaberReverse,
  atomInventory,
  createReactionMoleculeShape
} from "../src/background/species.js";

const random = () => 0.5;

function molecule(family) {
  const shape = createReactionMoleculeShape(random, 20, family);
  return {
    nominalRadius: 20,
    radius: shape.boundingRadius,
    atoms: shape.atoms,
    bonds: shape.bonds,
    family: shape.family,
    role: shape.role
  };
}

test("Haber forward and reverse steps conserve nitrogen and hydrogen atoms", () => {
  const nitrogen = molecule("substrate-a");
  const hydrogen = [molecule("substrate-b"), molecule("substrate-b"), molecule("substrate-b")];
  const slots = [nitrogen, ...hydrogen];
  const initial = atomInventory(slots);

  applyHaberForward(nitrogen, hydrogen, random);
  assert.deepEqual(atomInventory(slots), initial);
  assert.equal(slots.filter((entry) => entry.role === "product").length, 2);
  assert.equal(slots.filter((entry) => entry.role === "vacancy").length, 2);

  applyHaberReverse(
    slots.filter((entry) => entry.role === "product"),
    slots.filter((entry) => entry.role === "vacancy"),
    random
  );
  assert.deepEqual(atomInventory(slots), initial);
  assert.equal(slots.filter((entry) => entry.role === "reactantA").length, 1);
  assert.equal(slots.filter((entry) => entry.role === "reactantB").length, 3);
});
