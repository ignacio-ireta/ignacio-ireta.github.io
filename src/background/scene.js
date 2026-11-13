import {
  createGrainTile,
  drawFieldLayer,
  drawFieldLights,
  drawGrain
} from "./backdrop.js?v=haber-micrograph-20261113";
import { DPR_CAP } from "./config.js?v=haber-micrograph-20261113";
import { drawMoleculeField } from "./render.js?v=haber-micrograph-20261113";
import { createMolecules, refitMolecules } from "./species.js?v=haber-micrograph-20261113";

export const state = {
  width: 0,
  height: 0,
  dpr: 1,
  isDark: false,
  molecules: [],
  catalysts: [],
  ambient: [],
  effects: [],
  layers: {},
  pointer: { x: 0, y: 0, active: false, influence: 0 },
  chemistry: null,
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

export function resizeScene(canvas, ctx, { isDark }) {
  const previousWidth = state.width;
  const previousHeight = state.height;
  state.isDark = isDark;
  state.dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
  state.width = window.innerWidth;
  state.height = window.innerHeight;
  canvas.width = state.width * state.dpr;
  canvas.height = state.height * state.dpr;
  canvas.style.width = `${state.width}px`;
  canvas.style.height = `${state.height}px`;
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

  state.layers.field = makeLayer(state.width, state.height, state.dpr);
  state.layers.grain = { tile: createGrainTile(isDark), pattern: null };
  drawFieldLayer(state.layers.field.ctx, state, { isDark });

  // A new width means a new layout (and possibly a new density tier), so start
  // over. A height-only change — mobile browser chrome, a color-scheme switch
  // — keeps the running simulation.
  if (state.chemistry && state.width === previousWidth) {
    refitMolecules(state, previousWidth, previousHeight);
  } else {
    createMolecules(state);
  }
}

export function drawScene(ctx, now, options) {
  state.isDark = options.isDark;
  // Reduced motion gets one fixed frame of the moving light and grain.
  const time = options.reducedMotion ? 0 : now;
  ctx.drawImage(state.layers.field.canvas, 0, 0, state.width, state.height);
  drawFieldLights(ctx, state, time, options);
  drawMoleculeField(ctx, state, time);
  drawGrain(ctx, state, time, options);
}
