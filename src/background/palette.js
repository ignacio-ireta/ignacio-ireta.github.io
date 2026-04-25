const DARK_STROKES = {
  rose: "#dae6fe",
  blue: "#b7d1f1",
  teal: "#b7e9ea",
  gold: "#79abd5",
  violet: "#dbb2e5"
};

const LIGHT_STROKES = {
  rose: "#3c719f",
  blue: "#0e2869",
  teal: "#205a55",
  gold: "#0e2869",
  violet: "#3c3e80"
};

const FALLBACKS = {
  "--accent-rose": "#95b2d4",
  "--accent-blue": "#3c719f",
  "--accent-teal": "#7ad5c3",
  "--accent-gold": "#0e2869",
  "--accent-violet": "#8979b4",
  "--ink": "#0e2869",
  "--line-strong": "rgba(14, 40, 105, 0.36)",
  "--bg": "#f5fdf7",
  "--bg-deep": "#dae6fe"
};

function cssVar(root, name) {
  return getComputedStyle(root).getPropertyValue(name).trim() || FALLBACKS[name];
}

export function readPalette(root, isDark) {
  const strokes = isDark ? DARK_STROKES : LIGHT_STROKES;

  return {
    rose: { fill: cssVar(root, "--accent-rose"), stroke: strokes.rose },
    blue: { fill: cssVar(root, "--accent-blue"), stroke: strokes.blue },
    teal: { fill: cssVar(root, "--accent-teal"), stroke: strokes.teal },
    gold: { fill: cssVar(root, "--accent-gold"), stroke: strokes.gold },
    violet: { fill: cssVar(root, "--accent-violet"), stroke: strokes.violet },
    ink: cssVar(root, "--ink"),
    line: cssVar(root, "--line-strong"),
    paper: cssVar(root, "--bg"),
    deep: cssVar(root, "--bg-deep")
  };
}
