const canvas = document.getElementById("molecule-canvas");
const ctx = canvas.getContext("2d");
const root = document.documentElement;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function cssVar(name) {
  return getComputedStyle(root).getPropertyValue(name).trim();
}

const state = {
  width: 0,
  height: 0,
  molecules: [],
  bonds: [],
  pointer: { x: 0, y: 0, active: false, force: 1 },
  palette: []
};

function refreshPalette() {
  state.palette = [
    { fill: cssVar("--accent-rose"), stroke: "#7f3543", charge: -1 },
    { fill: cssVar("--accent-blue"), stroke: "#29436f", charge: 1 },
    { fill: cssVar("--accent-teal"), stroke: "#1f5f58", charge: -0.65 },
    { fill: cssVar("--accent-gold"), stroke: "#765120", charge: 0.8 },
    { fill: cssVar("--accent-violet"), stroke: "#493d66", charge: 0.25 }
  ];
}

function resize() {
  const dpr = window.devicePixelRatio || 1;
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  canvas.width = state.width * dpr;
  canvas.height = state.height * dpr;
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  refreshPalette();
  createMolecules();
  draw(performance.now());
}

function createMolecules() {
  const area = state.width * state.height;
  const count = Math.max(38, Math.min(142, Math.floor(area / 11500)));
  state.molecules = Array.from({ length: count }, makeMolecule);
  state.bonds = [];
}

function makeMolecule() {
  const protein = state.palette[Math.floor(Math.random() * state.palette.length)];
  const radius = 9 + Math.random() * 18;
  const lobeCount = 2 + Math.floor(Math.random() * 5);
  const lobes = Array.from({ length: lobeCount }, (_, index) => {
    const angle = (Math.PI * 2 * index) / lobeCount + Math.random() * 0.9;
    const distance = Math.random() * radius * 0.58;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      rx: radius * (0.42 + Math.random() * 0.36),
      ry: radius * (0.32 + Math.random() * 0.3),
      spin: Math.random() * Math.PI
    };
  });

  return {
    x: Math.random() * state.width,
    y: Math.random() * state.height,
    vx: (Math.random() - 0.5) * 0.55,
    vy: (Math.random() - 0.5) * 0.55,
    radius,
    protein,
    lobes,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.006,
    phase: Math.random() * Math.PI * 2
  };
}

function updateMolecule(molecule, dt) {
  molecule.phase += dt * 0.0012;
  molecule.angle += molecule.spin * dt;

  const driftX = Math.sin((molecule.y + molecule.phase * 80) * 0.004) * 0.018;
  const driftY = Math.cos((molecule.x - molecule.phase * 70) * 0.004) * 0.018;
  molecule.vx += driftX;
  molecule.vy += driftY;

  if (state.pointer.active) {
    const dx = state.pointer.x - molecule.x;
    const dy = state.pointer.y - molecule.y;
    const distance = Math.hypot(dx, dy) || 1;
    if (distance < 230) {
      const pull = molecule.protein.charge > 0 ? 1 : -1;
      const strength = ((230 - distance) / 230) * 0.19 * state.pointer.force * pull;
      molecule.vx += (dx / distance) * strength;
      molecule.vy += (dy / distance) * strength;
    }
  }

  molecule.vx *= 0.992;
  molecule.vy *= 0.992;
  molecule.x += molecule.vx;
  molecule.y += molecule.vy;

  if (molecule.x < -molecule.radius) molecule.x = state.width + molecule.radius;
  if (molecule.x > state.width + molecule.radius) molecule.x = -molecule.radius;
  if (molecule.y < -molecule.radius) molecule.y = state.height + molecule.radius;
  if (molecule.y > state.height + molecule.radius) molecule.y = -molecule.radius;
}

function resolveInteractions(now) {
  for (let i = 0; i < state.molecules.length; i += 1) {
    const a = state.molecules[i];
    for (let j = i + 1; j < state.molecules.length; j += 1) {
      const b = state.molecules[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy) || 1;
      const reach = a.radius + b.radius + 18;

      if (distance < reach) {
        const nx = dx / distance;
        const ny = dy / distance;
        const polarity = a.protein.charge * b.protein.charge;
        const equilibrium = a.radius + b.radius + (polarity < 0 ? 2 : 14);
        const force = (equilibrium - distance) * 0.0009;

        a.vx -= nx * force;
        a.vy -= ny * force;
        b.vx += nx * force;
        b.vy += ny * force;
      }

      if (distance < a.radius + b.radius) {
        const overlap = (a.radius + b.radius - distance) * 0.5;
        const nx = dx / distance;
        const ny = dy / distance;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;

        const ax = a.vx;
        const ay = a.vy;
        a.vx = b.vx * 0.86;
        a.vy = b.vy * 0.86;
        b.vx = ax * 0.86;
        b.vy = ay * 0.86;

        if (Math.random() < 0.08) {
          state.bonds.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, born: now, color: a.protein.fill });
        }
      }
    }
  }

  state.bonds = state.bonds.filter((bond) => now - bond.born < 700).slice(-24);
}

function drawBackground() {
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.strokeStyle = cssVar("--line-strong");
  ctx.lineWidth = 1;

  for (let y = -80; y < state.height + 80; y += 72) {
    ctx.beginPath();
    for (let x = -30; x < state.width + 30; x += 18) {
      const offset = Math.sin(x * 0.012 + y * 0.02) * 8;
      if (x === -30) ctx.moveTo(x, y + offset);
      else ctx.lineTo(x, y + offset);
    }
    ctx.stroke();
  }

  ctx.restore();
}

function drawBonds(now) {
  for (const bond of state.bonds) {
    const age = now - bond.born;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - age / 700) * 0.45;
    ctx.strokeStyle = bond.color;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(bond.x, bond.y, 8 + age * 0.04, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawConnections() {
  for (let i = 0; i < state.molecules.length; i += 1) {
    const a = state.molecules[i];
    for (let j = i + 1; j < state.molecules.length; j += 1) {
      const b = state.molecules[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 82 && a.protein.charge * b.protein.charge < 0) {
        ctx.save();
        ctx.globalAlpha = (1 - distance / 82) * 0.22;
        ctx.strokeStyle = a.protein.fill;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}

function drawMolecule(molecule, now) {
  const pulse = Math.sin(now * 0.001 + molecule.phase) * 0.06;
  ctx.save();
  ctx.translate(molecule.x, molecule.y);
  ctx.rotate(molecule.angle);
  ctx.lineWidth = 1.25;
  ctx.strokeStyle = molecule.protein.stroke;
  ctx.fillStyle = molecule.protein.fill;

  for (const lobe of molecule.lobes) {
    ctx.save();
    ctx.translate(lobe.x, lobe.y);
    ctx.rotate(lobe.spin);
    ctx.beginPath();
    ctx.ellipse(0, 0, lobe.rx * (1 + pulse), lobe.ry * (1 - pulse), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.72;
    ctx.stroke();
    ctx.restore();
  }

  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#fff7df";
  ctx.beginPath();
  ctx.ellipse(molecule.radius * 0.18, -molecule.radius * 0.12, molecule.radius * 0.18, molecule.radius * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function draw(now) {
  ctx.clearRect(0, 0, state.width, state.height);
  drawBackground();
  drawConnections();
  drawBonds(now);
  for (const molecule of state.molecules) drawMolecule(molecule, now);
}

let last = performance.now();
function animate(now) {
  const dt = Math.min(32, now - last);
  last = now;
  for (const molecule of state.molecules) updateMolecule(molecule, dt);
  resolveInteractions(now);
  draw(now);
  requestAnimationFrame(animate);
}

window.addEventListener("pointermove", (event) => {
  state.pointer.x = event.clientX;
  state.pointer.y = event.clientY;
  state.pointer.active = true;
});

window.addEventListener("pointerdown", () => {
  state.pointer.force = 1.9;
});

window.addEventListener("pointerup", () => {
  state.pointer.force = 1;
});

window.addEventListener("pointerleave", () => {
  state.pointer.active = false;
});

window.addEventListener("resize", resize);
resize();

if (!prefersReducedMotion) {
  requestAnimationFrame(animate);
}
