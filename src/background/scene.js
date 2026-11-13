import { DPR_CAP } from "./config.js?v=haber-surface-20261113";
import { drawDepthGuides } from "./geometry.js?v=haber-surface-20261113";
import { readPalette } from "./palette.js?v=haber-surface-20261113";
import { drawMoleculeField } from "./render.js?v=haber-surface-20261113";
import { createMolecules, refitMolecules } from "./species.js?v=haber-surface-20261113";
import { drawFieldLayer, drawPaperLayer } from "./watercolor.js?v=haber-surface-20261113";

export const state = {
  width: 0,
  height: 0,
  dpr: 1,
  isDark: false,
  palette: {},
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

export function resizeScene(canvas, ctx, root, { isDark }) {
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

  state.palette = readPalette(root, isDark);
  state.layers.paper = makeLayer(state.width, state.height, state.dpr);
  state.layers.field = makeLayer(state.width, state.height, state.dpr);
  drawPaperLayer(state.layers.paper.ctx, state, { isDark });
  drawFieldLayer(state.layers.field.ctx, state, { isDark });
  drawDepthGuides(state.layers.field.ctx, state, 0, { isDark, reducedMotion: true });

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
  ctx.clearRect(0, 0, state.width, state.height);
  ctx.drawImage(state.layers.field.canvas, 0, 0, state.width, state.height);
  drawMoleculeField(ctx, state);
  ctx.drawImage(state.layers.paper.canvas, 0, 0, state.width, state.height);
}
