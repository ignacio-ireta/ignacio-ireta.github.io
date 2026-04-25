const DARK_STROKES = {
  rose: "#b9c4c8",
  blue: "#a7bce8",
  teal: "#9ed1ca",
  gold: "#e5c083",
  violet: "#c1b4e5"
};

const LIGHT_STROKES = {
  rose: "#465258",
  blue: "#2d456d",
  teal: "#205a55",
  gold: "#6d4a1f",
  violet: "#51436c"
};

const FALLBACKS = {
  "--accent-rose": "#87979e",
  "--accent-blue": "#4f78bd",
  "--accent-teal": "#3f968c",
  "--accent-gold": "#b98636",
  "--accent-violet": "#7e6ba7",
  "--ink": "#171b1d",
  "--line-strong": "rgba(38, 52, 58, 0.34)",
  "--bg": "#eef8f7",
  "--bg-deep": "#dfe8e6"
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
