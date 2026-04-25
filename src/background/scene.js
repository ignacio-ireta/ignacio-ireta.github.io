import { DPR_CAP } from "./config.js";
import { drawDepthGuides } from "./geometry.js";
import { readPalette } from "./palette.js";
import { createReaction, drawReaction } from "./reaction.js";
import { createMolecules, drawMoleculeField, drawStaticBiomolecularField, drawStaticForegroundForms } from "./species.js";
import { drawFieldLayer, drawPaperLayer } from "./watercolor.js";

export const state = {
  width: 0,
  height: 0,
  dpr: 1,
  palette: {},
  molecules: [],
  layers: {},
  pointer: { x: 0, y: 0, active: false, influence: 0 },
  reaction: null,
  seed: Math.floor(Math.random() * 2 ** 31)
};

function makeLayer(width, height, dpr) {
  const layer = document.createElement("canvas");
  layer.width = width * dpr;
  layer.height = height * dpr;
  const layerCtx = layer.getContext("2d");
  layerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { canvas: layer, ctx: layerCtx };
}

export function resizeScene(canvas, ctx, root, { isDark }) {
  state.dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  canvas.width = state.width * state.dpr;
  canvas.height = state.height * state.dpr;
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

  state.palette = readPalette(root, isDark);
  state.layers.paper = makeLayer(state.width, state.height, state.dpr);
  state.layers.field = makeLayer(state.width, state.height, state.dpr);
  state.layers.foreground = makeLayer(state.width, state.height, state.dpr);
  drawPaperLayer(state.layers.paper.ctx, state, { isDark });
  drawFieldLayer(state.layers.field.ctx, state, { isDark });
  drawDepthGuides(state.layers.field.ctx, state, 0, { isDark, reducedMotion: true });
  drawStaticBiomolecularField(state.layers.field.ctx, state, { isDark });
  drawStaticForegroundForms(state.layers.foreground.ctx, state, { isDark });
  state.molecules = createMolecules(state);
  state.reaction = createReaction(state);
}

export function drawScene(ctx, now, options) {
  ctx.clearRect(0, 0, state.width, state.height);
  ctx.drawImage(state.layers.field.canvas, 0, 0, state.width, state.height);
  drawMoleculeField(ctx, state);
  drawReaction(ctx, state, now, options);
  ctx.drawImage(state.layers.foreground.canvas, 0, 0, state.width, state.height);
  ctx.drawImage(state.layers.paper.canvas, 0, 0, state.width, state.height);
}
