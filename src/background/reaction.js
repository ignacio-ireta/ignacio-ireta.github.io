import { REACTION } from "./config.js?v=cursor-heat-42d267b";
import { drawMembraneArc, traceOrganicMass } from "./geometry.js";
import { clamp, interpolatePoint, lerp, seededRandom, smoothstep } from "./random.js?v=cursor-heat-42d267b";
import { drawMolecule } from "./species.js?v=cursor-heat-42d267b";
import { drawWatercolorShape } from "./watercolor.js";

const STATE_INDEX = new Map(REACTION.states.map((state, index) => [state.name, index]));

function createActor(random, key, radius, lobeCount, role = "substrate") {
  const lobes = Array.from({ length: lobeCount }, (_, index) => {
    const angle = (Math.PI * 2 * index) / lobeCount + lerp(-0.34, 0.34, random());
    const distance = radius * lerp(0.08, 0.42, random());
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
      rx: radius * lerp(role === "enzyme" ? 0.44 : 0.38, role === "enzyme" ? 0.82 : 0.7, random()),
      ry: radius * lerp(0.28, role === "product" ? 0.58 : 0.5, random()),
      rotate: lerp(0, Math.PI, random())
    };
  });

  return {
    paletteKey: key,
    role,
    radius,
    lobes,
    outline: true,
    granules: Array.from({ length: role === "enzyme" ? 14 : 10 }, () => ({
      x: lerp(-radius * 0.52, radius * 0.52, random()),
      y: lerp(-radius * 0.42, radius * 0.42, random()),
      r: lerp(0.7, 1.7, random()),
      a: lerp(0.08, 0.16, random())
    }))
  };
}

function stateDuration(index) {
  return REACTION.states[index].duration;
}

function setReactionState(reaction, index, elapsed = 0) {
  reaction.stateIndex = index;
  reaction.stateName = REACTION.states[index].name;
  reaction.elapsed = elapsed;
}

function advanceReaction(reaction, deltaMs) {
  reaction.elapsed += deltaMs;

  while (reaction.elapsed >= stateDuration(reaction.stateIndex)) {
    reaction.elapsed -= stateDuration(reaction.stateIndex);
    setReactionState(reaction, (reaction.stateIndex + 1) % REACTION.states.length, reaction.elapsed);
  }
}

function advanceByOffset(reaction, offsetMs) {
  let remaining = offsetMs;
  while (remaining > 0) {
    const available = stateDuration(reaction.stateIndex) - reaction.elapsed;
    const step = Math.min(remaining, available);
    reaction.elapsed += step;
    remaining -= step;
    if (reaction.elapsed >= stateDuration(reaction.stateIndex)) {
      reaction.elapsed = 0;
      setReactionState(reaction, (reaction.stateIndex + 1) % REACTION.states.length);
    }
  }
}

export function createReaction(state) {
  const random = seededRandom(19391 + Math.floor(state.width * 0.7));
  const anchorX =
    state.width < 640
      ? state.width * 0.54
      : clamp(state.width * 0.74, 280, Math.max(280, state.width - 120));
  const anchorY =
    state.height < 640
      ? state.height * 0.42
      : clamp(state.height * 0.3, 160, Math.max(160, state.height - 160));

  const reaction = {
    anchorX,
    anchorY,
    stateIndex: STATE_INDEX.get("idle"),
    stateName: "idle",
    elapsed: 0,
    a: createActor(random, "blue", 24, 4, "substrate"),
    b: createActor(random, "rose", 23, 5, "substrate"),
    c: createActor(random, "gold", 18, 6, "enzyme"),
    d: createActor(random, "teal", 35, 7, "product")
  };

  advanceByOffset(reaction, REACTION.startOffset);
  return reaction;
}

export function updateReaction(state, deltaMs, { reducedMotion }) {
  if (reducedMotion || !state.reaction) return;
  advanceReaction(state.reaction, Math.min(deltaMs, 120));
}

function progress(reaction) {
  return clamp(reaction.elapsed / stateDuration(reaction.stateIndex), 0, 1);
}

function smoothProgress(reaction) {
  return smoothstep(progress(reaction));
}

function reactionLayout(reaction, state) {
  const ax = reaction.anchorX;
  const ay = reaction.anchorY;
  const compact = state.width < 560;
  const spread = compact ? Math.min(86, state.width * 0.2) : 118;
  const enzymeLift = compact ? 72 : 92;

  return {
    aHome: { x: ax - spread, y: ay - 38 },
    bHome: { x: ax + spread * 0.95, y: ay - 20 },
    cHome: { x: ax - 8, y: ay - enzymeLift },
    cProduct: { x: ax + spread * 0.74, y: ay - enzymeLift * 0.74 },
    aBound: { x: ax - 29, y: ay - 17 },
    bBound: { x: ax + 28, y: ay - 11 },
    cCradle: { x: ax + 2, y: ay - 58 },
    dCore: { x: ax, y: ay - 14 },
    productRest: { x: ax - 10, y: ay - 14 }
  };
}

function positionsForState(reaction, state) {
  const p = smoothProgress(reaction);
  const layout = reactionLayout(reaction, state);
  const still = {
    a: layout.aHome,
    b: layout.bHome,
    c: layout.cHome,
    d: layout.dCore,
    aAlpha: 0.54,
    bAlpha: 0.54,
    cAlpha: 0.5,
    dAlpha: 0,
    washAlpha: 0,
    splitWashAlpha: 0,
    cradleAlpha: 0,
    pathPulse: 0.24
  };

  switch (reaction.stateName) {
    case "approach":
      return {
        ...still,
        a: interpolatePoint(layout.aHome, layout.aBound, p),
        b: interpolatePoint(layout.bHome, layout.bBound, p),
        c: interpolatePoint(layout.cHome, layout.cCradle, p),
        cradleAlpha: p * 0.55,
        pathPulse: 0.3 + p * 0.34
      };
    case "catalytic_cradle":
      return {
        ...still,
        a: layout.aBound,
        b: layout.bBound,
        c: layout.cCradle,
        cradleAlpha: 0.68,
        pathPulse: 0.62
      };
    case "merge_wash":
      return {
        ...still,
        a: layout.aBound,
        b: layout.bBound,
        c: layout.cCradle,
        aAlpha: 0.54 * (1 - p * 0.78),
        bAlpha: 0.54 * (1 - p * 0.78),
        dAlpha: p * 0.6,
        washAlpha: Math.sin(p * Math.PI) * 0.42,
        cradleAlpha: 0.58,
        pathPulse: 0.7
      };
    case "release_catalyst":
      return {
        ...still,
        a: layout.aBound,
        b: layout.bBound,
        c: interpolatePoint(layout.cCradle, layout.cProduct, p),
        aAlpha: 0.08 * (1 - p),
        bAlpha: 0.08 * (1 - p),
        d: interpolatePoint(layout.dCore, layout.productRest, p),
        dAlpha: 0.62,
        cradleAlpha: (1 - p) * 0.46,
        pathPulse: 0.52
      };
    case "product_dwell":
      return {
        ...still,
        c: layout.cProduct,
        d: layout.productRest,
        aAlpha: 0,
        bAlpha: 0,
        dAlpha: 0.62,
        pathPulse: 0.36
      };
    case "retro_cradle":
      return {
        ...still,
        c: interpolatePoint(layout.cProduct, layout.cCradle, p),
        d: interpolatePoint(layout.productRest, layout.dCore, p),
        aAlpha: 0,
        bAlpha: 0,
        dAlpha: 0.62,
        cradleAlpha: p * 0.58,
        pathPulse: 0.5 + p * 0.18
      };
    case "split":
      return {
        ...still,
        a: interpolatePoint(layout.aBound, layout.aHome, p),
        b: interpolatePoint(layout.bBound, layout.bHome, p),
        c: interpolatePoint(layout.cCradle, layout.cHome, p),
        d: layout.dCore,
        aAlpha: 0.54 * p,
        bAlpha: 0.54 * p,
        dAlpha: 0.62 * (1 - p),
        splitWashAlpha: Math.sin(p * Math.PI) * 0.34,
        cradleAlpha: (1 - p) * 0.52,
        pathPulse: 0.58
      };
    case "rest":
      return {
        ...still,
        pathPulse: 0.18
      };
    default:
      return still;
  }
}

function reducedMotionPositions(reaction, state) {
  const layout = reactionLayout(reaction, state);
  return {
    a: layout.aHome,
    b: layout.bHome,
    c: layout.cHome,
    d: { x: layout.dCore.x, y: layout.dCore.y + 30 },
    cAfter: layout.cProduct,
    aAlpha: 0.38,
    bAlpha: 0.38,
    cAlpha: 0.46,
    dAlpha: 0.42,
    washAlpha: 0.12,
    splitWashAlpha: 0,
    cradleAlpha: 0.22,
    pathPulse: 0.26
  };
}

function drawReactionPath(targetCtx, state, now, positions, { isDark, reducedMotion }) {
  const { anchorX, anchorY } = state.reaction;
  const localMotion = reducedMotion ? 0 : Math.sin(now * 0.00055) * 1.4;
  const alpha = isDark ? 0.16 : 0.23;

  targetCtx.save();
  targetCtx.globalCompositeOperation = "multiply";
  targetCtx.strokeStyle = `rgba(61, 53, 41, ${alpha})`;
  targetCtx.lineWidth = 1.1;
  targetCtx.setLineDash([4, 8]);
  targetCtx.globalAlpha = positions.pathPulse;
  targetCtx.beginPath();
  targetCtx.moveTo(anchorX - 112, anchorY - 34 + localMotion);
  targetCtx.bezierCurveTo(anchorX - 62, anchorY - 10, anchorX - 34, anchorY + 9, anchorX - 4, anchorY + 2);
  targetCtx.bezierCurveTo(anchorX + 31, anchorY - 4, anchorX + 66, anchorY - 25, anchorX + 104, anchorY - 4);
  targetCtx.stroke();

  targetCtx.setLineDash([]);
  targetCtx.globalAlpha = 0.22 + positions.cradleAlpha * 0.45;
  targetCtx.strokeStyle = state.palette.gold.stroke;
  drawMembraneArc(targetCtx, anchorX + 7, anchorY - 43, 43 + localMotion, -0.9, Math.PI * 1.34);
  targetCtx.restore();
}

function drawReactionWash(targetCtx, state, positions, options) {
  const alpha = Math.max(positions.washAlpha, positions.splitWashAlpha);
  if (alpha <= 0.001) return;

  const palette = positions.splitWashAlpha > positions.washAlpha ? state.palette.rose : state.palette.teal;
  const x = state.reaction.anchorX;
  const y = state.reaction.anchorY - 19;

  drawWatercolorShape(
    targetCtx,
    (ctx) => traceOrganicMass(ctx, x, y, 70, 44, 15, positions.splitWashAlpha > 0 ? 2.7 : 1.2),
    {
      fill: palette.fill,
      stroke: palette.stroke,
      contour: options.isDark ? "rgba(255, 244, 210, 0.16)" : "rgba(255, 252, 238, 0.24)",
      alpha: alpha * 0.28,
      glazeAlpha: alpha * 0.2,
      edgeAlpha: alpha * 0.28,
      lineWidth: 0.9,
      contours: [
        (ctx) => {
          ctx.beginPath();
          ctx.ellipse(x - 7, y + 1, 43, 17, -0.18, 0, Math.PI * 2);
        },
        (ctx) => {
          ctx.beginPath();
          ctx.ellipse(x + 13, y - 3, 28, 10, 0.36, 0, Math.PI * 2);
        }
      ]
    }
  );
}

function drawSubstrate(targetCtx, state, actor, point, rotation, alpha, scale) {
  drawMolecule(targetCtx, state.palette, actor, point.x, point.y, rotation, alpha, scale);
}

function drawCatalyst(targetCtx, state, actor, point, rotation, alpha, scale) {
  drawMolecule(targetCtx, state.palette, actor, point.x, point.y, rotation, alpha, scale);

  targetCtx.save();
  targetCtx.translate(point.x, point.y);
  targetCtx.rotate(rotation);
  targetCtx.globalCompositeOperation = "source-over";
  targetCtx.globalAlpha = alpha * 0.42;
  targetCtx.strokeStyle = state.palette.gold.stroke;
  targetCtx.lineWidth = 0.9;
  targetCtx.beginPath();
  targetCtx.ellipse(0, 1, actor.radius * 1.18 * scale, actor.radius * 0.55 * scale, -0.18, 0, Math.PI * 2);
  targetCtx.stroke();
  targetCtx.beginPath();
  targetCtx.arc(-actor.radius * 0.28 * scale, -actor.radius * 0.06 * scale, actor.radius * 0.32 * scale, 0.12, Math.PI * 1.36);
  targetCtx.stroke();
  targetCtx.restore();
}

function drawProduct(targetCtx, state, reaction, point, rotation, alpha, scale) {
  drawMolecule(targetCtx, state.palette, reaction.d, point.x, point.y, rotation, alpha, scale);
  drawMolecule(targetCtx, state.palette, reaction.a, point.x - 11 * scale, point.y - 3 * scale, rotation - 0.18, alpha * 0.22, scale * 0.58);
  drawMolecule(targetCtx, state.palette, reaction.b, point.x + 12 * scale, point.y + 2 * scale, rotation + 0.16, alpha * 0.22, scale * 0.58);

  targetCtx.save();
  targetCtx.translate(point.x, point.y);
  targetCtx.rotate(rotation);
  targetCtx.globalCompositeOperation = "source-over";
  targetCtx.globalAlpha = alpha * 0.36;
  targetCtx.strokeStyle = state.palette.teal.stroke;
  targetCtx.lineWidth = 0.95;
  targetCtx.beginPath();
  targetCtx.ellipse(0, 0, reaction.d.radius * 0.86 * scale, reaction.d.radius * 0.42 * scale, 0.16, 0, Math.PI * 2);
  targetCtx.stroke();
  targetCtx.restore();
}

export function drawReaction(targetCtx, state, now, options) {
  const reaction = state.reaction;
  const positions = options.reducedMotion ? reducedMotionPositions(reaction, state) : positionsForState(reaction, state);
  const cDrift = options.reducedMotion ? 0 : Math.sin(now * 0.0007) * 1.8;
  const dDrift = options.reducedMotion ? 0 : Math.sin(now * 0.00028) * 0.08;

  drawReactionPath(targetCtx, state, now, positions, options);
  drawReactionWash(targetCtx, state, positions, options);

  drawSubstrate(targetCtx, state, reaction.a, positions.a, -0.24, positions.aAlpha, 1.02);
  drawSubstrate(targetCtx, state, reaction.b, positions.b, 0.32, positions.bAlpha, 1.02);
  drawCatalyst(
    targetCtx,
    state,
    reaction.c,
    { x: positions.c.x, y: positions.c.y + cDrift },
    reaction.stateName === "release_catalyst" ? 0.28 : -0.06,
    positions.cAlpha,
    0.92
  );

  if (positions.dAlpha > 0.001) {
    drawProduct(targetCtx, state, reaction, positions.d, dDrift, positions.dAlpha, 1.08);
  }

  if (options.reducedMotion) {
    drawCatalyst(targetCtx, state, reaction.c, positions.cAfter, 0.28, 0.34, 0.92);
  }
}
