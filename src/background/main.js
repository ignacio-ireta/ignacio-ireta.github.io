import { drawScene, resizeScene, state } from "./scene.js?v=free-float-wrap-76620a9";
import { updateReaction } from "./reaction.js?v=free-float-wrap-76620a9";
import { updateMolecules } from "./species.js?v=free-float-wrap-76620a9";

const canvas = document.getElementById("molecule-canvas");
const ctx = canvas.getContext("2d");
const root = document.documentElement;
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const darkSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");

let animationFrame = 0;
let lastFrameTime = 0;

function mediaOptions() {
  return {
    isDark: darkSchemeQuery.matches,
    reducedMotion: reducedMotionQuery.matches
  };
}

function watchMedia(query, handler) {
  if (query.addEventListener) query.addEventListener("change", handler);
  else query.addListener(handler);
}

function draw(now = performance.now()) {
  drawScene(ctx, now, mediaOptions());
}

function resize() {
  resizeScene(canvas, ctx, root, mediaOptions());
  draw();
}

function shouldAnimate() {
  return !reducedMotionQuery.matches && document.visibilityState !== "hidden";
}

function animate(now) {
  if (!shouldAnimate()) {
    animationFrame = 0;
    return;
  }

  const deltaMs = lastFrameTime ? Math.min(now - lastFrameTime, 120) : 1000 / 60;
  lastFrameTime = now;
  const options = mediaOptions();

  updateMolecules(state, now, deltaMs, options);
  updateReaction(state, deltaMs, options);
  draw(now);
  animationFrame = requestAnimationFrame(animate);
}

function restartMotion() {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  lastFrameTime = 0;
  draw(performance.now());
  if (shouldAnimate()) animationFrame = requestAnimationFrame(animate);
}

function boot() {
  window.addEventListener("pointermove", (event) => {
    state.pointer.x = event.clientX;
    state.pointer.y = event.clientY;
    state.pointer.active = true;
    state.pointer.influence = 1;
  });

  window.addEventListener("pointerleave", () => {
    state.pointer.active = false;
  });

  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", restartMotion);
  watchMedia(reducedMotionQuery, restartMotion);
  watchMedia(darkSchemeQuery, resize);

  resize();
  restartMotion();
}

boot();
